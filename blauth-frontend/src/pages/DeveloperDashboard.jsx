import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createVerificationRequest } from "../services/api";

const WALLET_ID_KEY = "blauthWalletId";

const verifierOptions = {
  "college-portal": {
    verifier: "College Portal",
    requestedFields: ["name", "studentId"],
    fieldLabels: ["Name", "Student ID"],
  },
  "age-restricted-service": {
    verifier: "Age Restricted Service",
    requestedFields: ["ageOver18"],
    fieldLabels: ["Age Over 18"],
  },
};

function DeveloperDashboard() {
  const navigate = useNavigate();
  const [walletId] = useState(() => localStorage.getItem(WALLET_ID_KEY));
  const [verifierId, setVerifierId] = useState("college-portal");
  const [requestState, setRequestState] = useState("idle");
  const [requestError, setRequestError] = useState("");
  const [createdRequest, setCreatedRequest] = useState(null);
  const selectedVerifier = verifierOptions[verifierId];

  async function handleCreateRequest() {
    if (!walletId || requestState === "creating") return;

    setRequestState("creating");
    setRequestError("");
    setCreatedRequest(null);

    try {
      const { requestId } = await createVerificationRequest({
        walletId,
        verifierId,
        requestedFields: selectedVerifier.requestedFields,
      });
      setCreatedRequest({ requestId, ...selectedVerifier });
      setRequestState("created");
    } catch (error) {
      console.error("Unable to create developer verification request:", error);
      setRequestError(error.message || "The verification request could not be created.");
      setRequestState("error");
    }
  }

  function handleVerifierChange(event) {
    setVerifierId(event.target.value);
    setCreatedRequest(null);
    setRequestError("");
    setRequestState("idle");
  }

  return (
    <main className="blauth-consent">
      <div className="blauth-register-orb blauth-consent-orb-one" /><div className="blauth-register-orb blauth-consent-orb-two" />
      <nav className="blauth-register-nav" aria-label="Developer dashboard navigation"><Link className="blauth-brand" to="/" aria-label="BLAuth home"><span className="blauth-brand-mark">B</span><span>BLAuth</span></Link><span className="blauth-nav-status"><i /> Verifier tools</span></nav>
      <section className="blauth-consent-shell" aria-labelledby="developer-title">
        <header className="blauth-consent-intro"><p className="blauth-eyebrow"><span /> Developer tools</p><h1 id="developer-title">Developer<br /><em>Verification Console.</em></h1><p>Create a privacy-preserving verification request for only the identity attributes your service needs.</p></header>
        <article className="blauth-consent-card">
          <header className="blauth-request-header"><span className="blauth-request-mark">⌁</span><div><p>Verifier request builder</p><h2>Choose a verifier</h2></div></header>
          <p className="blauth-request-purpose">The user reviews the request in BLAuth before any approved fields are disclosed.</p>
          <div className="blauth-input-group"><label htmlFor="developer-verifier">Available verifier</label><select id="developer-verifier" value={verifierId} onChange={handleVerifierChange} disabled={requestState === "creating"}>{Object.entries(verifierOptions).map(([id, option]) => <option key={id} value={id}>{option.verifier}</option>)}</select></div>
          <div className="blauth-consent-list" aria-label="Requested identity fields">{selectedVerifier.fieldLabels.map((field) => <div className="blauth-consent-field" key={field}><span>{field}</span><strong>Requested</strong></div>)}</div>
          <aside className="blauth-privacy-notice"><span aria-hidden="true">⌁</span><p><strong>Request only what you need.</strong> Date of birth, camera data, and biometric information are never selectable here.</p></aside>
          {!walletId && <p className="blauth-field-error" role="alert">Register an identity first to create a wallet.</p>}
          {requestState === "creating" && <p className="blauth-enrollment-message" role="status">Creating verification request…</p>}
          {requestError && <p className="blauth-field-error" role="alert">{requestError}</p>}
          <div className="blauth-consent-actions"><button className="blauth-back-button" type="button" onClick={() => navigate(-1)}>← Back</button><button className="blauth-continue-button" type="button" disabled={!walletId || requestState === "creating"} onClick={handleCreateRequest}>{requestState === "creating" ? "Creating…" : "Create Verification Request"} <span>→</span></button></div>
          {createdRequest && <section className="blauth-disclosure-result" aria-live="polite"><div className="blauth-result-mark">✓</div><h2>Request Created</h2><p className="blauth-result-verifier">Request ID: {createdRequest.requestId}</p><div className="blauth-result-columns"><section><h3>Verifier</h3><p>{createdRequest.verifier}</p><h3>Requested fields</h3>{createdRequest.fieldLabels.map((field) => <p className="is-shared" key={field}>✓ {field}</p>)}</section><section><h3>Status</h3><p>Awaiting user consent</p></section></div><button className="blauth-continue-button" type="button" onClick={() => navigate(`/consent?verifier=${verifierId}`)}>Continue to Consent <span>→</span></button></section>}
        </article>
      </section>
    </main>
  );
}

export default DeveloperDashboard;
