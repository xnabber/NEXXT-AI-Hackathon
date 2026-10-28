import { money, products, project } from "./finance.ts";
import type { Risk } from "./finance.ts";
export type GuideContext = { monthly: number; years: number; risk: Risk };
export function guidedReply(
  question: string,
  context: GuideContext = { monthly: 500, years: 10, risk: "balanced" },
  previousQuestion?: string,
): string {
  let q = question.toLowerCase().trim();
  if (/^(hi|hello|hey|good morning|good evening)[!.\s]*$/.test(q))
    return "Hi! What would you like to understand about investing? You can ask about the numbers on screen, fees, risk, or how a fund works.";
  if (/^(thanks|thank you|great|got it)[!.\s]*$/.test(q))
    return "You’re welcome. Take your time exploring, and ask whenever something is unclear.";
  if (
    /^(why|how so|what about that|can you explain that|tell me more)[?!.\s]*$/.test(
      q,
    ) &&
    previousQuestion
  )
    q = previousQuestion.toLowerCase();
  const product = products.find((p) => p.id === context.risk) || products[1];
  if (/withdraw|access|liquid|take.*out|anytime|emergency/.test(q))
    return "The example funds show a 3–5 business-day withdrawal period. It is not instant cash: actual timing, charges, and restrictions depend on the product. Selling after a market fall could mean getting back less than you invested. Keep emergency savings separate and readily accessible.";
  if (/fee|cost|tax|charge/.test(q))
    return `The ${product.name} example uses a ${(product.fee * 100).toFixed(1)}% annual fee. We subtract that from its ${(product.grossReturn * 100).toFixed(0)}% assumed annual return before calculating monthly growth. Taxes and other charges are excluded. These are demo assumptions; a real product’s documents set out its actual costs.`;
  if (/los|risk|safe|afraid|fall|guarantee/.test(q))
    return "Investments can fall in value, and none of these example funds guarantees your capital or returns. Bond-focused funds usually fluctuate less than equity funds, but still carry risk. If a drop would force you to sell or leave you short for everyday needs, consider your cash buffer and time horizon before making any real decision.";
  if (
    /projection|how much|how.*grow|my (plan|scenario|money)|these numbers|this (chart|simulation)|today.s money/.test(
      q,
    )
  ) {
    const result = project(
      context.monthly,
      context.years,
      product.grossReturn,
      product.fee,
    );
    return `For the scenario currently on screen, ${money(context.monthly)} lei a month over ${context.years} years means ${money(result.contributed)} lei contributed. Its illustrative value is ${money(result.balance)} lei after the example fund fee, or about ${money(result.real)} lei in today’s buying power. This assumes ${(product.grossReturn * 100).toFixed(0)}% gross annual growth and 5.5% inflation; it is an illustration, not a forecast. Change the controls to explore another scenario.`;
  }
  if (/inflation|purchas|idle cash/.test(q))
    return "Inflation means the same money buys less as prices rise. At an illustrative 5.5% a year, 10,000 lei has about 7,651 lei of today’s purchasing power after five years. The account balance has not disappeared; its buying power has changed. Investing may help over time, but can also lose value.";
  if (/bond/.test(q))
    return "A bond is a loan to a government or company. In return, the borrower usually pays interest and aims to repay the loan at an agreed time. Bonds can still lose value, for example if interest rates rise or the borrower cannot repay. A bond fund owns several bonds rather than a single loan.";
  if (/stock|share|equit/.test(q))
    return "A stock is a small ownership share in a company. Its price can rise or fall as the company and market change, and some companies pay dividends. Owning different stocks through a fund can spread exposure, but does not eliminate the risk of loss.";
  if (/fund|diversif/.test(q))
    return "A fund pools investors’ money to hold a collection of assets, such as shares or bonds. That can spread exposure across several investments. Our fictional funds use different mixes of bonds and equities, with different fees and risks. Diversification helps spread risk; it does not guarantee a profit.";
  if (/compound|interest/.test(q))
    return "Compounding means returns can themselves earn returns. For example, if 1,000 lei grows by an illustrative 5%, it becomes 1,050 lei; another 5% would be earned on 1,050 lei. Our chart combines this with monthly contributions. Real returns vary and can be negative.";
  if (/start|small|monthly|begin/.test(q))
    return "Starting with a manageable monthly amount can help build a habit. First think about accessible emergency savings, everyday costs, and how long you can leave money invested. You can explore from 100 lei a month in this demo, without committing to anything.";
  return "I can help explain investment concepts and the scenario on screen. What specifically would you like to understand: how the projection works, the example fund’s fees, risk, or access to your money? This educational guide cannot verify live market information or make a personal recommendation.";
}
