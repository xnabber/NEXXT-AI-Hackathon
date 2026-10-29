import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Download,
  Fingerprint,
  LockKeyhole,
  Mail,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Sprout,
  UserRound,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Disclosure, PageIntro } from "./components/Layout";
import { useJourney } from "./lib/journey";

export function JourneySummary() {
  const { state, update } = useJourney();
  const saved = state.messages.length;
  return (
    <aside className="journey-summary">
      <span className="summary-sprout">
        <Sprout size={32} strokeWidth={1.5} />
      </span>
      <div className="eyebrow">ONE CONVERSATION, NEVER RESTARTED</div>
      <h2>
        Your chat continues
        <br />
        <span>right after sign-up.</span>
      </h2>
      <div className="saved-simulation">
        {state.chatConsent ? (
          <>
            <span>
              <Check size={15} /> CHAT SAVED WITH YOUR CONSENT
            </span>
            <p>
              {saved
                ? `${saved} ${saved === 1 ? "message" : "messages"} will continue in the app.`
                : "Your browser chat will continue in the app."}
            </p>
            <button
              className="text-button"
              onClick={() => update({ chatConsent: false })}
            >
              Don’t save my chat
            </button>
          </>
        ) : (
          <>
            <span>
              <MessageCircle size={15} /> CHAT NOT CARRIED OVER
            </span>
            <p>You’ll start a fresh conversation in the app.</p>
            <button
              className="text-button"
              onClick={() => update({ chatConsent: true })}
            >
              I agree, save my chat to my new profile
            </button>
          </>
        )}
      </div>
      <span className="summary-bottom">
        <ShieldCheck size={16} /> Demo only. No money will move.
      </span>
    </aside>
  );
}
export default function Onboarding() {
  const { state, update } = useJourney();
  if (state.authenticated) return <Navigate to="/account/coach" replace />;
  return (
    <main className="container flow-page">
      <Link className="back-link" to="/coach">
        <ChevronLeft size={16} /> Back to my chat
      </Link>
      <div className="onboarding-grid">
        <div>
          <PageIntro
            eyebrow="CREATE YOUR ACCOUNT"
            title="Download the app and create an account."
          >
            Happy with the chat? Two steps, then your coach picks up right where
            you stopped.
          </PageIntro>
          <ol className="app-steps">
            <li className={state.appInstalled ? "app-step done" : "app-step"}>
              <span className="app-step-number">
                {state.appInstalled ? <Check size={22} /> : 1}
              </span>
              <div>
                <h2>Download the app</h2>
                <p>Get the Raiffeisen app on iOS or Android.</p>
                {state.appInstalled ? (
                  <span className="app-installed" role="status">
                    <Smartphone size={15} /> App installed (simulated)
                  </span>
                ) : (
                  <div className="store-buttons">
                    {["App Store", "Google Play"].map((store) => (
                      <Button
                        key={store}
                        variant="dark"
                        size="small"
                        onClick={() => update({ appInstalled: true })}
                      >
                        <Download size={15} /> {store}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </li>
            <li className={state.appInstalled ? "app-step" : "app-step locked"}>
              <span className="app-step-number">2</span>
              <div>
                <h2>Create an account</h2>
                <p>
                  About 8 minutes in the app. Your chat continues right after.
                </p>
                {state.appInstalled ? (
                  <div className="store-buttons">
                    <Button asChild size="small">
                      <Link to="/onboarding/new-account">
                        Create my account <ArrowRight size={15} />
                      </Link>
                    </Button>
                    <Link className="text-link" to="/onboarding/login">
                      I’m already a Raiffeisen customer
                    </Link>
                  </div>
                ) : (
                  <p className="fine-print">Download the app first.</p>
                )}
              </div>
            </li>
          </ol>
          <Disclosure short />
          <p className="fine-print">
            No real app is downloaded. No banking credentials, identity
            documents, or personal details are needed.
          </p>
        </div>
        <JourneySummary />
      </div>
    </main>
  );
}
export function AccountForm() {
  const { pathname } = useLocation();
  const login = pathname.endsWith("login");
  const { state, update } = useJourney();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(state.name);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  if (state.authenticated) return <Navigate to="/account/coach" replace />;
  function complete() {
    if (!name.trim()) {
      setError("Please add a demo display name. A nickname is fine.");
      return;
    }
    if (!acknowledged) {
      setError("Please confirm that you understand this is a demo.");
      return;
    }
    update((current) => ({
      authenticated: true,
      appInstalled: true,
      name: name.trim().slice(0, 30),
      /* The browser chat only carries over with consent. */
      messages: current.chatConsent ? current.messages : [],
      question: 0,
    }));
    navigate("/account/coach");
  }
  return (
    <main className="container flow-page">
      <Link className="back-link" to="/onboarding">
        <ChevronLeft size={16} /> Back to the steps
      </Link>
      <div className="onboarding-grid">
        <section className="account-form">
          <PageIntro
            eyebrow={
              login
                ? "RAIFFEISEN APP · LOG IN (DEMO)"
                : "RAIFFEISEN APP · CREATE ACCOUNT (DEMO)"
            }
            title={
              login
                ? "Good to see you again."
                : step === 0
                  ? "Create your account."
                  : "One clear confirmation."
            }
          >
            {login
              ? "Continue as an example customer. Your real bank login stays out of this experience."
              : step === 0
                ? "In the real app this takes about 8 minutes. Here it’s a short walkthrough: use a nickname, no personal information needed."
                : "In a real journey, a regulated onboarding process would verify your identity and complete required checks."}
          </PageIntro>
          {!login && (
            <div className="form-steps">
              <span className={step === 0 ? "active" : "done"}>
                1 <span>Demo profile</span>
              </span>
              <i />
              <span className={step === 1 ? "active" : ""}>
                2 <span>Review & continue</span>
              </span>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!login && step === 0) {
                if (name.trim()) {
                  setStep(1);
                  setError("");
                } else setError("Please add a demo display name.");
              } else complete();
            }}
          >
            <div className="form-card">
              {login || step === 0 ? (
                <>
                  <span className="form-card-icon">
                    {login ? (
                      <Fingerprint size={30} />
                    ) : (
                      <UserRound size={28} />
                    )}
                  </span>
                  <h2>
                    {login
                      ? "Demo customer access"
                      : "What should we call you?"}
                  </h2>
                  <p>
                    {login
                      ? "No password. No connection to a real bank account."
                      : "A first name or a nickname is all we need for this demo."}
                  </p>
                  <label className="field-label" htmlFor="display-name">
                    Demo display name
                  </label>
                  <input
                    id="display-name"
                    className="text-input"
                    autoComplete="off"
                    value={name}
                    maxLength={30}
                    onChange={(e) => setName(e.target.value)}
                    aria-describedby={error ? "form-error" : undefined}
                  />
                  <div className="identity-note">
                    <LockKeyhole size={16} />
                    <span>
                      Stored only in this browser. Never used to create a real
                      account.
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <span className="form-card-icon">
                    <ShieldCheck size={30} />
                  </span>
                  <h2>Here’s what happens in a real journey</h2>
                  <div className="illustrative-checks">
                    <p>
                      <Mail size={18} />
                      <span>
                        Verify contact details
                        <small>Illustrated only — no email is sent.</small>
                      </span>
                    </p>
                    <p>
                      <Fingerprint size={18} />
                      <span>
                        Complete identity checks
                        <small>Not performed in this prototype.</small>
                      </span>
                    </p>
                    <p>
                      <ShieldCheck size={18} />
                      <span>
                        Review terms and eligibility
                        <small>Real product checks would be required.</small>
                      </span>
                    </p>
                  </div>
                </>
              )}
              {(login || step === 1) && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                  />
                  <span>
                    I understand this is a demo. No real account is created or
                    verified.
                  </span>
                </label>
              )}
              {error && (
                <p className="form-error" id="form-error" role="alert">
                  {error}
                </p>
              )}
              <Button className="full-width" type="submit">
                {login
                  ? "Continue as demo customer"
                  : step === 0
                    ? "Continue to review"
                    : "Create my demo profile"}
                <ArrowRight size={17} />
              </Button>
              {step === 1 && !login && (
                <button
                  className="text-button form-back"
                  type="button"
                  onClick={() => setStep(0)}
                >
                  <ArrowLeft size={14} /> Edit my display name
                </button>
              )}
            </div>
          </form>
          <Disclosure short />
        </section>
        <JourneySummary />
      </div>
    </main>
  );
}
