import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { identityFieldLabels, verifierRequests } from "../mockData";
import { submitConsent } from "../services/api";

const WALLET_ID_KEY = "blauthWalletId";

function Consent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("requestId") || "";
  const verifierKey = searchParams.get("verifier") || "college-portal";
  const request = verifierRequests[verifierKey] || verifierRequests["college-portal"];
  const [walletId] = useState(() => localStorage.getItem(WALLET_ID_KEY));
  const [allowedFields, setAllowedFields] = useState(() => new Set());
  const [result, setResult] = useState(null);
  const [consentState, setConsentState] = useState("idle");
  const [consentError, setConsentError] = useState("");
  const canSubmitConsent = Boolean(walletId && requestId) && consentState !== "submitting";

  function toggleField(field) {
    setAllowedFields((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  async function approveAndShare() {
    if (!canSubmitConsent) return;
    setConsentState("submitting");
    setConsentError("");
    try {
      const approvedFields = request.requestedFields.filter((field) => allowedFields.has(field));
      const { consentApproved, data } = await submitConsent({ requestId, approvedFields });
      const sharedFields = request.requestedFields.filter((field) => Object.hasOwn(data, field));
      const withheldFields = request.requestedFields.filter((field) => !Object.hasOwn(data, field));
      if (location.state?.returnToDeveloper) {
        navigate("/developer", { state: { verificationResult: { verified: consentApproved, data } } });
        return;
      }
      setResult({ sharedFields, withheldFields, consentApproved });
      setConsentState("complete");
    } catch (error) {
      console.error("Unable to submit backend consent:", error);
      setConsentError(error.message || "The consent decision could not be submitted.");
      setConsentState("error");
    }
  }

  if (result) {
    return <main className="blauth-consent"><nav className="blauth-register-nav"><Link className="blauth-brand" to="/"><span className="blauth-brand-mark">B</span><span>BLAuth</span></Link></nav><section className="blauth-consent-shell"><article className="blauth-consent-card blauth-disclosure-result"><h1>{result.consentApproved ? "Identity shared" : "Identity not shared"}</h1><p>With {request.verifier}</p><section><h3>Shared</h3>{result.sharedFields.length ? result.sharedFields.map((field) => <p className="is-shared" key={field}>✓ {identityFieldLabels[field]}</p>) : <p>Nothing shared</p>}</section><section><h3>Not shared</h3>{result.withheldFields.map((field) => <p key={field}>○ {identityFieldLabels[field]}</p>)}</section><button className="blauth-continue-button" type="button" onClick={() => navigate("/wallet")}>Return to Wallet</button></article></section></main>;
  }

  return (
    <main className="blauth-consent">
      <nav className="blauth-register-nav"><Link className="blauth-brand" to="/"><span className="blauth-brand-mark">B</span><span>BLAuth</span></Link><span className="blauth-nav-status"><i /> You control what is shared</span></nav>
      <section className="blauth-consent-shell">
        <header className="blauth-consent-intro"><p className="blauth-eyebrow"><span /> Selective disclosure</p><h1>Review before<br /><em>you share.</em></h1><p>Choose exactly which fields {request.verifier} can receive.</p></header>
        <article className="blauth-consent-card">
          <header className="blauth-request-header"><div><p>Sharing request from</p><h2>{request.verifier}</h2></div></header>
          <p className="blauth-request-purpose">{request.purpose}</p>
          <div className="blauth-consent-list">{request.requestedFields.map((field) => <div className="blauth-consent-field" key={field}><span>{identityFieldLabels[field]}</span><button className={allowedFields.has(field) ? "is-allowed" : ""} type="button" aria-pressed={allowedFields.has(field)} onClick={() => toggleField(field)}>{allowedFields.has(field) ? "Allowed" : "Allow"}</button></div>)}</div>
          {!walletId || !requestId ? <p className="blauth-field-error" role="alert">Open this page from a backend verification request with a registered wallet.</p> : null}
          {consentState === "submitting" && <p className="blauth-enrollment-message" role="status">Submitting your consent decision…</p>}
          {consentError && <p className="blauth-field-error" role="alert">{consentError}</p>}
          <div className="blauth-consent-actions"><button className="blauth-back-button" type="button" onClick={() => navigate(-1)}>Back</button><button className="blauth-deny-button" type="button" onClick={() => setAllowedFields(new Set())}>Deny All</button><button className="blauth-continue-button" type="button" disabled={!canSubmitConsent} onClick={approveAndShare}>{consentState === "submitting" ? "Submitting…" : "Approve & Share"}</button></div>
        </article>
      </section>
    </main>
  );
}

export default Consent;
