import { useState } from "react";
import { Link } from "react-router-dom";

function readIdentity() {
  try {
    const storedIdentity = localStorage.getItem("blauthIdentity");
    return storedIdentity ? JSON.parse(storedIdentity) : null;
  } catch (error) {
    console.error("Unable to read the local identity wallet:", error);
    return null;
  }
}

function maskPhone(phone) {
  const visibleDigits = phone.replace(/\D/g, "").slice(-4);
  return visibleDigits ? `••••••${visibleDigits}` : "••••••••••";
}

function Wallet() {
  const [identity] = useState(readIdentity);
  const [showDob, setShowDob] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  if (!identity) {
    return (
      <main className="blauth-wallet">
        <nav className="blauth-register-nav" aria-label="Wallet navigation">
          <Link className="blauth-brand" to="/" aria-label="BLAuth home"><span className="blauth-brand-mark">B</span><span>BLAuth</span></Link>
          <span className="blauth-nav-status"><i /> Privacy-first identity</span>
        </nav>
        <section className="blauth-wallet-empty" aria-labelledby="wallet-empty-title">
          <span className="blauth-wallet-empty-mark" aria-hidden="true">B</span>
          <p className="blauth-eyebrow"><span /> Your private wallet</p>
          <h1 id="wallet-empty-title">No identity<br /><em>registered yet.</em></h1>
          <p>Create your local identity first, then return here to view the details you control.</p>
          <Link className="blauth-button blauth-button-primary" to="/register">Create Identity <span>→</span></Link>
        </section>
      </main>
    );
  }

  const fields = [
    { label: "Name", value: identity.name },
    { label: "Email", value: identity.email },
    { label: "College", value: identity.college },
    { label: "Student ID", value: identity.studentId },
    { label: "Date of Birth", value: showDob ? identity.dob : "•• / •• / ••••", toggle: () => setShowDob((value) => !value), shown: showDob },
    { label: "Phone", value: showPhone ? identity.phone : maskPhone(identity.phone || ""), toggle: () => setShowPhone((value) => !value), shown: showPhone },
  ];

  return (
    <main className="blauth-wallet">
      <div className="blauth-register-orb blauth-wallet-orb-one" /><div className="blauth-register-orb blauth-wallet-orb-two" />
      <nav className="blauth-register-nav" aria-label="Wallet navigation">
        <Link className="blauth-brand" to="/" aria-label="BLAuth home"><span className="blauth-brand-mark">B</span><span>BLAuth</span></Link>
        <span className="blauth-nav-status"><i /> Private identity wallet</span>
      </nav>
      <section className="blauth-wallet-shell" aria-labelledby="wallet-title">
        <header className="blauth-wallet-intro">
          <p className="blauth-eyebrow"><span /> Step 3 of 3</p>
          <h1 id="wallet-title">Your identity,<br /><em>in your hands.</em></h1>
          <p>These details stay in your local BLAuth wallet until you choose what to share.</p>
        </header>
        <article className="blauth-wallet-card">
          <header className="blauth-wallet-card-header">
            <div><span className="blauth-wallet-card-mark">B</span><div><p>BLAuth Identity</p><h2>{identity.name || "Your identity"}</h2></div></div>
            <span className="blauth-wallet-status"><i /> Identity verified locally</span>
          </header>
          <div className="blauth-wallet-details" aria-label="Registered identity details">
            {fields.map((field) => <div className="blauth-wallet-field" key={field.label}><span>{field.label}</span><div><strong>{field.value || "Not provided"}</strong>{field.toggle && <button type="button" onClick={field.toggle}>{field.shown ? "Hide" : "Show"}</button>}</div></div>)}
          </div>
          <footer className="blauth-wallet-footer"><span aria-hidden="true">⌁</span><p>Your identity details are stored locally on this device.</p></footer>
          <div className="blauth-wallet-consent-link"><Link to="/consent">Review a sharing request <span>→</span></Link></div>
          <div className="blauth-wallet-history-link"><Link to="/history">View disclosure history <span>→</span></Link></div>
        </article>
      </section>
    </main>
  );
}

export default Wallet;
