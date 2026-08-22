import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { identityFieldLabels, verifierRequests } from "../mockData";

const DISCLOSURE_HISTORY_KEY = "blauthDisclosureHistory";

function readIdentity() {
  try {
    const storedIdentity = localStorage.getItem("blauthIdentity");
    return storedIdentity ? JSON.parse(storedIdentity) : null;
  } catch (error) {
    console.error("Unable to read the local identity:", error);
    return null;
  }
}

function appendDisclosureHistory(record) {
  try {
    const savedHistory = JSON.parse(localStorage.getItem(DISCLOSURE_HISTORY_KEY) || "[]");
    const history = Array.isArray(savedHistory) ? savedHistory : [];
    localStorage.setItem(DISCLOSURE_HISTORY_KEY, JSON.stringify([...history, record]));
  } catch (error) {
    console.error("Unable to save the local disclosure history:", error);
  }
}

function Consent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("verifier") || "college-portal";
  const request = verifierRequests[requestId] || verifierRequests["college-portal"];
  const [identity] = useState(readIdentity);
  const [allowedFields, setAllowedFields] = useState(() => new Set());
  const [result, setResult] = useState(null);

  function toggleField(field) {
    setAllowedFields((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  function approveAndShare() {
    const sharedFields = request.requestedFields.filter((field) => allowedFields.has(field));
    const withheldFields = request.requestedFields.filter((field) => !allowedFields.has(field));
    const disclosure = sharedFields.reduce((data, field) => ({ ...data, [field]: identity[field] }), {});
    const record = { verifier: request.verifier, sharedFields, withheldFields, timestamp: new Date().toISOString(), disclosure };
    appendDisclosureHistory(record);
    setResult({ sharedFields, withheldFields });
  }

  if (!identity) {
    return <main className="blauth-consent"><nav className="blauth-register-nav" aria-label="Consent navigation"><Link className="blauth-brand" to="/" aria-label="BLAuth home"><span className="blauth-brand-mark">B</span><span>BLAuth</span></Link></nav><section className="blauth-consent-empty" aria-labelledby="consent-empty-title"><p className="blauth-eyebrow"><span /> Selective disclosure</p><h1 id="consent-empty-title">No identity<br /><em>registered yet.</em></h1><p>Create your local identity before reviewing a sharing request.</p><Link className="blauth-button blauth-button-primary" to="/register">Create Identity <span>→</span></Link></section></main>;
  }

  if (result) {
    return (
      <main className="blauth-consent">
        <nav className="blauth-register-nav" aria-label="Consent navigation"><Link className="blauth-brand" to="/" aria-label="BLAuth home"><span className="blauth-brand-mark">B</span><span>BLAuth</span></Link><span className="blauth-nav-status"><i /> You control what is shared</span></nav>
        <section className="blauth-consent-shell" aria-labelledby="shared-title">
          <header className="blauth-consent-intro"><p className="blauth-eyebrow"><span /> Disclosure complete</p><h1 id="shared-title">Identity shared<br /><em>on your terms.</em></h1><p>Only the fields you approved were included in this local disclosure.</p></header>
          <article className="blauth-consent-card blauth-disclosure-result">
            <div className="blauth-result-mark">✓</div><h2>Identity shared</h2><p className="blauth-result-verifier">With {request.verifier}</p>
            <div className="blauth-result-columns">
              <section><h3>Shared</h3>{result.sharedFields.length ? result.sharedFields.map((field) => <p className="is-shared" key={field}>✓ {identityFieldLabels[field]}</p>) : <p>Nothing shared</p>}</section>
              <section><h3>Not shared</h3>{result.withheldFields.map((field) => <p className="is-withheld" key={field}>○ {identityFieldLabels[field]}</p>)}</section>
            </div>
            <button className="blauth-continue-button" type="button" onClick={() => navigate("/wallet")}>Return to Wallet <span>→</span></button>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className="blauth-consent">
      <div className="blauth-register-orb blauth-consent-orb-one" /><div className="blauth-register-orb blauth-consent-orb-two" />
      <nav className="blauth-register-nav" aria-label="Consent navigation"><Link className="blauth-brand" to="/" aria-label="BLAuth home"><span className="blauth-brand-mark">B</span><span>BLAuth</span></Link><span className="blauth-nav-status"><i /> You control what is shared</span></nav>
      <section className="blauth-consent-shell" aria-labelledby="consent-title">
        <header className="blauth-consent-intro"><p className="blauth-eyebrow"><span /> Selective disclosure</p><h1 id="consent-title">Review before<br /><em>you share.</em></h1><p>Choose exactly which fields {request.verifier} can receive. You can deny any field.</p></header>
        <article className="blauth-consent-card">
          <header className="blauth-request-header"><span className="blauth-request-mark">↗</span><div><p>Sharing request from</p><h2>{request.verifier}</h2></div></header>
          <p className="blauth-request-purpose">{request.purpose}</p>
          <div className="blauth-consent-list" aria-label="Requested identity fields">
            {request.requestedFields.map((field) => <div className="blauth-consent-field" key={field}><span>{identityFieldLabels[field]}</span><button className={allowedFields.has(field) ? "is-allowed" : ""} type="button" aria-pressed={allowedFields.has(field)} onClick={() => toggleField(field)}>{allowedFields.has(field) ? "Allowed" : "Allow"}</button></div>)}
          </div>
          <aside className="blauth-privacy-notice"><span aria-hidden="true">⌁</span><p><strong>Only approved fields will be shared.</strong> Your biometric information is never part of this request.</p></aside>
          <div className="blauth-consent-actions"><button className="blauth-back-button" type="button" onClick={() => navigate(-1)}>← Back</button><button className="blauth-deny-button" type="button" onClick={() => setAllowedFields(new Set())}>Deny All</button><button className="blauth-continue-button" type="button" onClick={approveAndShare}>Approve &amp; Share <span>→</span></button></div>
        </article>
      </section>
    </main>
  );
}

export default Consent;
