import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const DISCLOSURE_HISTORY_KEY = "blauthDisclosureHistory";
const WITHHELD_FIELDS = ["dob", "name", "email", "phone", "college", "studentId"];

function readIdentity() {
  try {
    const savedIdentity = localStorage.getItem("blauthIdentity");
    return savedIdentity ? JSON.parse(savedIdentity) : null;
  } catch (error) {
    console.error("Unable to read the local identity:", error);
    return null;
  }
}

function calculateAge(dateOfBirth) {
  const [year, month, day] = (dateOfBirth || "").split("-").map(Number);
  const birthday = new Date(year, month - 1, day);
  if (!year || !month || !day || birthday.getFullYear() !== year || birthday.getMonth() !== month - 1 || birthday.getDate() !== day) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const birthdayHasPassed = today.getMonth() > month - 1 || (today.getMonth() === month - 1 && today.getDate() >= day);
  if (!birthdayHasPassed) age -= 1;
  return age;
}

function appendAgeDisclosure(record) {
  try {
    const savedHistory = JSON.parse(localStorage.getItem(DISCLOSURE_HISTORY_KEY) || "[]");
    const history = Array.isArray(savedHistory) ? savedHistory : [];
    localStorage.setItem(DISCLOSURE_HISTORY_KEY, JSON.stringify([...history, record]));
  } catch (error) {
    console.error("Unable to save the local age disclosure:", error);
  }
}

function VerifierAge() {
  const navigate = useNavigate();
  const [identity] = useState(readIdentity);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  function verifyAge() {
    const age = calculateAge(identity?.dob);
    if (age === null || age < 0) {
      setError("A valid date of birth is required to complete this local age check.");
      return;
    }

    const disclosure = { ageOver18: age >= 18 };
    if (disclosure.ageOver18) {
      appendAgeDisclosure({
        verifier: "Age-Restricted Service",
        sharedFields: ["ageOver18"],
        withheldFields: WITHHELD_FIELDS,
        timestamp: new Date().toISOString(),
        disclosure,
      });
    }
    setResult(disclosure);
  }

  if (!identity) {
    return <main className="blauth-consent"><nav className="blauth-register-nav" aria-label="Age verifier navigation"><Link className="blauth-brand" to="/" aria-label="BLAuth home"><span className="blauth-brand-mark">B</span><span>BLAuth</span></Link></nav><section className="blauth-consent-empty" aria-labelledby="age-empty-title"><p className="blauth-eyebrow"><span /> Derived disclosure</p><h1 id="age-empty-title">No identity<br /><em>registered yet.</em></h1><p>Create your local identity before checking age eligibility.</p><Link className="blauth-button blauth-button-primary" to="/register">Create Identity <span>→</span></Link></section></main>;
  }

  if (result) {
    const isEligible = result.ageOver18;
    return (
      <main className="blauth-consent">
        <nav className="blauth-register-nav" aria-label="Age verifier navigation"><Link className="blauth-brand" to="/" aria-label="BLAuth home"><span className="blauth-brand-mark">B</span><span>BLAuth</span></Link><span className="blauth-nav-status"><i /> Derived data only</span></nav>
        <section className="blauth-consent-shell" aria-labelledby="age-result-title">
          <header className="blauth-consent-intro"><p className="blauth-eyebrow"><span /> Age verification complete</p><h1 id="age-result-title">Age checked,<br /><em>privacy kept.</em></h1><p>The service received only an eligibility result, never your date of birth.</p></header>
          <article className="blauth-consent-card blauth-disclosure-result">
            <div className="blauth-result-mark">{isEligible ? "✓" : "×"}</div><h2>Age verification complete</h2><p className="blauth-result-verifier">{isEligible ? "✓ Age requirement satisfied" : "✕ Age requirement not satisfied"}</p>
            <div className="blauth-result-columns">
              <section><h3>Shared</h3><p className="is-shared">✓ Age over 18: {String(isEligible)}</p></section>
              <section><h3>Not shared</h3><p>○ Date of Birth</p><p>○ Name</p><p>○ Email</p><p>○ Phone</p><p>○ College</p><p>○ Student ID</p></section>
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
      <nav className="blauth-register-nav" aria-label="Age verifier navigation"><Link className="blauth-brand" to="/" aria-label="BLAuth home"><span className="blauth-brand-mark">B</span><span>BLAuth</span></Link><span className="blauth-nav-status"><i /> Derived data only</span></nav>
      <section className="blauth-consent-shell" aria-labelledby="age-title">
        <header className="blauth-consent-intro"><p className="blauth-eyebrow"><span /> Derived disclosure</p><h1 id="age-title">Prove your age,<br /><em>not your birthday.</em></h1><p>BLAuth can answer this request locally without sharing your date of birth or any other identity detail.</p></header>
        <article className="blauth-consent-card">
          <header className="blauth-request-header"><span className="blauth-request-mark">18+</span><div><p>Verification request from</p><h2>Age-Restricted Service</h2></div></header>
          <p className="blauth-request-purpose">Are you over 18?</p>
          <div className="blauth-consent-list"><div className="blauth-consent-field"><span>Age over 18</span><strong>Derived locally</strong></div></div>
          <aside className="blauth-privacy-notice"><span aria-hidden="true">⌁</span><p><strong>Your date of birth will not be shared.</strong> Only the true or false age-over-18 result is disclosed.</p></aside>
          {error && <p className="blauth-field-error" role="alert">{error}</p>}
          <div className="blauth-consent-actions"><button className="blauth-back-button" type="button" onClick={() => navigate("/wallet")}>← Back</button><button className="blauth-continue-button" type="button" onClick={verifyAge}>Check age eligibility <span>→</span></button></div>
        </article>
      </section>
    </main>
  );
}

export default VerifierAge;
