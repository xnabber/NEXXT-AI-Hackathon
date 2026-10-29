'use strict';

const { agentTurn, modelOutput } = require('./agent.js');
const { definitions } = require('../tools/index.js');
const { createProvider } = require('./provider.js');
const { settings } = require('../config.js');
const { changeFromText } = require('./intent.js');
const { VERSION, specialists, ownerOf, specialistPrompt } = require('./specialists.js');

class SpecialistCoordinator {
  constructor(store, session, text, config, notify) {
    this.store = store;
    this.session = session;
    this.text = text;
    this.config = config;
    this.notify = notify;
    this.mode = 'agent';
    this.stages = [];
    this.handoffs = [];
    this.board = [];
    this.findings = [];
    this.change = changeFromText(text, store.profile(session), session.memory);
    const hasProposal = [...store.proposals.values()].some(p => p.owner === session.id && p.customer === session.customerId);
    this.wantsProposal = /\bplan\b|planul|micro-saving/i.test(text) || Boolean(this.change && (session.memory.riskComfort || hasProposal));
    this.wantsSimulation = this.wantsProposal || /project|simulat|how much|forecast|proiec|cât|cat|grafic/i.test(text);
  }

  completed(tool) {
    return this.board.some(e => e.tool === tool && !e.output.error);
  }

  role() {
    if (!this.session.customerId) return 'coordinator';
    if (!this.budgetReviewed && !(this.change && this.completed('what_if'))) return 'budget';
    if (!this.completed('compare_products')) return 'products';
    const capacity = this.board.findLast(e => e.tool === 'find_savings_capacity')?.output;
    const mayPropose = this.session.memory.riskComfort || capacity?.segment === 'business' || capacity?.microSaving > 0;
    if (this.wantsSimulation && !this.completed('simulate')) return 'planning';
    if (this.wantsProposal && mayPropose && !this.completed('propose_plan')) return 'planning';
    return 'coordinator';
  }

  enter(agent) {
    if (this.active?.agent === agent && this.active.mode === this.mode) return;
    const previous = this.active;
    this.finish('completed');
    if (previous) {
      const handoff = { from: previous.agent, to: agent, mode: this.mode, tools: [...new Set(previous.tools)] };
      this.handoffs.push(handoff);
      this.notify({ type: 'agent_handoff', ...handoff });
    }
    this.active = { id: this.stages.length + 1, agent, mode: this.mode, status: 'running', tools: [], modelCalls: 0, inputTokens: 0, outputTokens: 0, started: performance.now() };
    this.stages.push(this.active);
    this.notify({ type: 'agent_start', stage: this.publicStage(this.active) });
  }

  publicStage(stage) {
    const { started, tools, ...safe } = stage;
    return { ...safe, toolCount: tools.length, tools: [...new Set(tools)] };
  }

  finish(status, reason) {
    if (!this.active || this.active.status !== 'running') return;
    this.active.status = status;
    this.active.ms = Math.round(performance.now() - this.active.started);
    if (reason) this.active.reason = reason;
    const stage = this.publicStage(this.active);
    this.store.record(this.session, 'agent_stage', { agent: stage.agent, mode: stage.mode, decision: status, ms: stage.ms, tokens: stage.inputTokens + stage.outputTokens, reason });
    this.notify({ type: 'agent_complete', stage });
  }

  decorate(event) {
    const agent = !this.session.customerId ? 'coordinator' : this.mode === 'offline' || event.origin ? ownerOf(event.tool) : this.active?.agent || 'coordinator';
    this.enter(agent);
    this.active.tools.push(event.tool);
    this.board.push(event);
    return { agent, execution: this.mode };
  }

  candidates() {
    const comparison = this.board.findLast(e => e.tool === 'compare_products' && !e.output.error)?.output;
    const capacity = this.board.findLast(e => e.tool === 'find_savings_capacity' && !e.output.error)?.output;
    const limit = capacity?.ready ? capacity.safeMonthly : capacity?.microSaving || 0;
    return (comparison?.products || []).filter(p => p.eligible).map(p => ({ productId: p.id, monthly: p.type === 'ladder' ? 0 : Math.min(this.session.memory.monthly, limit), monthlyLimit: p.type === 'ladder' ? 0 : limit, years: Math.max(1, Math.round(this.session.memory.horizonYears)) }));
  }

  permitted(tool, input) {
    const role = this.active?.agent || 'coordinator';
    if (!specialists[role].tools.includes(tool)) return false;
    if (role === 'budget') return tool === 'what_if' && Boolean(this.change) && !this.completed('what_if');
    if (role === 'coordinator' && this.session.customerId) return tool === 'handoff_to_adviser';
    if (tool === 'propose_plan' && !this.wantsProposal) return false;
    if (role === 'planning' && input !== undefined && (!input?.productId || (this.wantsProposal && !this.candidates().some(c => c.productId === input.productId)))) return false;
    return true;
  }

  missingWork() {
    if (!this.session.customerId) return [];
    const missing = [];
    if (this.change && !this.completed('what_if')) missing.push('what_if for the requested change');
    if (!this.completed('compare_products')) missing.push('compare_products');
    if (this.wantsSimulation && !this.completed('simulate')) missing.push('simulate the selected eligible product');
    const capacity = this.board.findLast(e => e.tool === 'find_savings_capacity')?.output;
    if (this.wantsProposal && (this.session.memory.riskComfort || capacity?.segment === 'business' || capacity?.microSaving > 0) && !this.completed('propose_plan')) missing.push('propose_plan within capacity');
    return missing;
  }

  sharedResults() {
    const unique = new Map();
    for (const e of this.board) if (!e.output.error) unique.set(e.tool, { tool: e.tool, agent: e.agent || ownerOf(e.tool), output: modelOutput(e.output) });
    return [...unique.values()];
  }

  messagesFor(messages, role) {
    return messages.flatMap(message => {
      if (message.agent && message.agent !== role) return [];
      if (message.role === 'tool') return message.agent === role ? [message] : [];
      if (message.toolCalls?.length) {
        const toolCalls = message.agent === role ? message.toolCalls : [];
        return toolCalls.length ? [{ role: 'assistant', text: '', toolCalls }] : [];
      }
      return [message];
    });
  }

  provider(provider) {
    return {
      name: provider.name,
      model: provider.model,
      complete: async request => {
        const role = this.role();
        this.enter(role);
        const tools = definitions.filter(d => specialists[role].tools.includes(d.name) && this.permitted(d.name)).map(d => {
          if (role !== 'planning') return d;
          const spec = structuredClone(d), candidates = this.candidates();
          spec.inputSchema.required = [...new Set([...spec.inputSchema.required, 'productId'])];
          if (this.wantsProposal && candidates.length) {
            spec.inputSchema.properties.productId.enum = candidates.map(c => c.productId);
            spec.inputSchema.properties.monthly.maximum = Math.max(...candidates.map(c => c.monthlyLimit));
          }
          return spec;
        });
        if (role === 'budget' && !this.change) tools.splice(0, tools.length);
        const stage = this.active;
        stage.modelCalls++;
        const response = await provider.complete({
          ...request,
          system: specialistPrompt(this.session, role, this.sharedResults(), this.findings, { change: this.change, prepareProposal: this.wantsProposal, simulate: this.wantsSimulation, eligiblePlanningCandidates: role === 'planning' ? this.candidates() : undefined }),
          messages: this.messagesFor(request.messages, role),
          tools
        });
        if (request.signal?.aborted) throw new Error('TURN_ABORTED');
        stage.inputTokens += response.usage?.inputTokens || 0;
        stage.outputTokens += response.usage?.outputTokens || 0;
        return { ...response, handoff: role === 'budget' && !response.toolCalls?.length ? role : null };
      }
    };
  }

  acceptHandoff(response) {
    this.findings = [{ agent: response.handoff, text: response.text }];
    this.budgetReviewed = true;
  }

  fallback(reason) {
    this.finish('fallback', reason);
    this.mode = 'offline';
    this.enter('coordinator');
  }

  snapshot(mode, cancelled) {
    if (!cancelled && this.active?.agent !== 'coordinator') this.enter('coordinator');
    this.finish(cancelled ? 'cancelled' : 'completed');
    return { enabled: true, strategy: VERSION, mode, stages: this.stages.map(s => this.publicStage(s)), handoffs: this.handoffs };
  }
}

async function runTurn(store, session, text, options = {}) {
  const config = { ...settings(), ...options.config };
  if (!config.orchestration) return agentTurn(store, session, text, options);
  const provider = Object.hasOwn(options, 'provider') ? options.provider : createProvider(config);
  const notify = options.onEvent || (() => {});
  const coordinator = new SpecialistCoordinator(store, session, text, config, notify);
  if (!provider) coordinator.mode = 'offline';
  const result = await agentTurn(store, session, text, {
    ...options,
    config,
    provider: provider ? coordinator.provider(provider) : null,
    decorateTool: e => coordinator.decorate(e),
    currentAgent: () => coordinator.active?.agent,
    authorizeTool: (name,input) => coordinator.permitted(name,input),
    onHandoff: response => coordinator.acceptHandoff(response),
    missingWork: () => coordinator.missingWork(),
    onFallback: reason => coordinator.fallback(reason),
    onEvent: event => { if (event.type !== 'done') notify(event); }
  });
  if (result.error) return result;
  result.promptVersion = VERSION;
  result.orchestration = coordinator.snapshot(result.mode, result.cancelled);
  if (!result.cancelled) notify({ type: 'done', result });
  return result;
}

module.exports = { runTurn, SpecialistCoordinator };
