import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createDeveloperApp, createDeveloperVerificationRequest } from "../services/api";

const WALLET_ID_KEY = "blauthWalletId";
const verifierOptions = {
  "college-portal": { verifier: "College Portal", requestedFields: ["name", "studentId"], fieldLabels: ["Name", "Student ID"] },
  "age-restricted-service": { verifier: "Age-Restricted Service", requestedFields: ["ageOver18"], fieldLabels: ["Age Over 18"] },
};

const integrationSnippet = `const result = await BLAuth.authenticate({
  requestedFields: ["name", "studentId"]
});`;

function DeveloperDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [walletId] = useState(() => localStorage.getItem(WALLET_ID_KEY));
  const [developerApp, setDeveloperApp] = useState(null);
  const [appState, setAppState] = useState("idle");
  const [appError, setAppError] = useState("");
  const [verifierId, setVerifierId] = useState("college-portal");
  const [requestState, setRequestState] = useState("idle");
  const [requestError, setRequestError] = useState("");
  const [createdRequest, setCreatedRequest] = useState(null);
  const [verificationResult] = useState(() => location.state?.verificationResult || null);
  const selectedVerifier = verifierOptions[verifierId];

  async function handleConnectDeveloperApp() {
    if (appState === "creating") return;
    setAppState("creating");
    setAppError("");
    try {
      // The creation response is held only in React memory for this session.
      setDeveloperApp(await createDeveloperApp({ name: "College Portal" }));
      setAppState("ready");
    } catch (error) {
      setAppError(error.message || "The developer application could not be created.");
      setAppState("error");
    }
  }

  async function handleCreateRequest() {
    if (!walletId || !developerApp || requestState === "creating") return;
    setRequestState("creating");
    setRequestError("");
    setCreatedRequest(null);
    try {
      const { requestId } = await createDeveloperVerificationRequest({
        walletId,
        requestedFields: selectedVerifier.requestedFields,
        apiKey: developerApp.apiKey,
        apiSecret: developerApp.apiSecret,
      });
      setCreatedRequest({ requestId, ...selectedVerifier });
      setRequestState("created");
    } catch (error) {
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

  function openAuthenticationSurface() {
    navigate(`/authenticate?requestId=${encodeURIComponent(createdRequest.requestId)}`, {
      state: { request: { verifier: createdRequest.verifier, requestedFields: createdRequest.requestedFields } },
    });
  }

  return (
    <main className="blauth-consent">
      <nav className="blauth-register-nav"><Link className="blauth-brand" to="/"><span className="blauth-brand-mark">B</span><span>BLAuth</span></Link><span className="blauth-nav-status"><i /> Verifier tools</span></nav>
      <section className="blauth-consent-shell">
        <header className="blauth-consent-intro"><p className="blauth-eyebrow"><span /> Developer integration</p><h1>BLAuth<br /><em>Developer Console.</em></h1><p>Your website initiates the request. BLAuth owns biometric authentication and user consent.</p></header>
        <article className="blauth-consent-card">
          <header className="blauth-request-header"><div><p>BLAuth Application</p><h2>{selectedVerifier.verifier}</h2></div></header>
          <p className="blauth-request-purpose">Create an authenticated request, then hand the user off to BLAuth for biometric authentication and consent.</p>
          <div className="blauth-input-group"><label htmlFor="developer-verifier">Demo verifier</label><select id="developer-verifier" value={verifierId} onChange={handleVerifierChange} disabled={requestState === "creating"}>{Object.entries(verifierOptions).map(([id, option]) => <option key={id} value={id}>{option.verifier}</option>)}</select></div>
          <p className="blauth-enrollment-message">Requested attributes</p>
          <div className="blauth-consent-list">{selectedVerifier.fieldLabels.map((field) => <div className="blauth-consent-field" key={field}><span>{field}</span><strong>Requested</strong></div>)}</div>
          {!developerApp && <button className="blauth-continue-button" type="button" disabled={appState === "creating"} onClick={handleConnectDeveloperApp}>{appState === "creating" ? "Creating demo application..." : "Create Demo BLAuth Application"}</button>}
          {developerApp && <p className="blauth-enrollment-message" role="status">Demo application connected for this browser session. Its API secret is held only in memory and never shown to the user.</p>}
          {appError && <p className="blauth-field-error" role="alert">{appError}</p>}
          {!walletId && <p className="blauth-field-error" role="alert">Register an identity first to create a wallet.</p>}
          {requestError && <p className="blauth-field-error" role="alert">{requestError}</p>}
          <div className="blauth-consent-actions"><button className="blauth-back-button" type="button" onClick={() => navigate(-1)}>Back</button><button className="blauth-continue-button" type="button" disabled={!walletId || !developerApp || requestState === "creating"} onClick={handleCreateRequest}>{requestState === "creating" ? "Creating request..." : "Continue with BLAuth"}</button></div>
          {createdRequest && <section className="blauth-disclosure-result" aria-live="polite"><h2>BLAuth request ready</h2><p className="blauth-result-verifier">A real request was created for this developer application.</p><p>Open the separate BLAuth authentication surface. The developer cannot approve consent or inspect biometric data.</p><button className="blauth-continue-button" type="button" onClick={openAuthenticationSurface}>Open BLAuth Authentication</button></section>}
          {verificationResult && <section className="blauth-disclosure-result" aria-live="polite"><h2>Verification Result</h2>{verificationResult.verified ? Object.entries(verificationResult.data).map(([field, value]) => <p className="is-shared" key={field}>{field}: {String(value)}</p>) : <p>Nothing was approved for disclosure.</p>}</section>}
          <section className="blauth-integration-example" aria-label="BLAuth conceptual integration example"><p>Conceptual integration</p><pre><code>{integrationSnippet}</code></pre><small>BLAuth returns only the user-approved verification assertion.</small></section>
        </article>
      </section>
    </main>
  );
}

export default DeveloperDashboard;
