import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getWallet } from "../services/api";
import { clearEnrolledDescriptor } from "../services/biometricIdentity";

const WALLET_ID_KEY = "blauthWalletId";

function maskPhone(phone) {
  const visibleDigits = phone.replace(/\D/g, "").slice(-4);
  return visibleDigits ? `••••••${visibleDigits}` : "••••••••••";
}

function Wallet() {
  const navigate = useNavigate();
  const [walletId] = useState(() => localStorage.getItem(WALLET_ID_KEY));
  const [identity, setIdentity] = useState(null);
  const [walletState, setWalletState] = useState(() => (walletId ? "loading" : "missing"));
  const [walletError, setWalletError] = useState("");
  const [showDob, setShowDob] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    if (!walletId) return undefined;

    getWallet(walletId)
      .then(({ credentials }) => {
        if (!isCurrent) return;
        setIdentity(credentials);
        setWalletState("ready");
      })
      .catch((error) => {
        if (!isCurrent) return;
        setWalletError(error.message || "The backend wallet could not be loaded.");
        setWalletState("error");
      });

    return () => { isCurrent = false; };
  }, [walletId]);

  async function resetLocalDemo() {
    if (!window.confirm("Reset this browser's local BLAuth identity? This removes the local wallet ID, profile, and enrolled biometric descriptor from this browser only.")) return;

    try {
      await clearEnrolledDescriptor();
      localStorage.removeItem("blauthIdentity");
      localStorage.removeItem(WALLET_ID_KEY);
      navigate("/register", { replace: true });
    } catch (error) {
      setResetError(error.message || "Could not reset local browser data.");
    }
  }

  if (walletState !== "ready" || !identity) {
    return (
      <main className="blauth-wallet">
        <nav className="blauth-register-nav" aria-label="Wallet navigation"><Link className="blauth-brand" to="/"><span className="blauth-brand-mark">B</span><span>BLAuth</span></Link><span className="blauth-nav-status"><i /> Privacy-first identity</span></nav>
        <section className="blauth-wallet-empty"><span className="blauth-wallet-empty-mark" aria-hidden="true">B</span><p className="blauth-eyebrow"><span /> Your private wallet</p><h1>{walletState === "loading" ? <>Loading your<br /><em>identity.</em></> : <>No backend<br /><em>wallet found.</em></>}</h1><p>{walletState === "loading" ? "Retrieving your identity wallet." : walletState === "error" ? walletError : "Complete local face verification to register your backend wallet."}</p><Link className="blauth-button blauth-button-primary" to="/register">Create Identity <span>→</span></Link></section>
      </main>
    );
  }

  const fields = [
    { label: "Name", value: identity.name },
    { label: "Email", value: identity.email },
    { label: "Student ID", value: identity.studentId },
    { label: "Date of Birth", value: showDob ? identity.dob : "•• / •• / ••••", toggle: () => setShowDob((value) => !value), shown: showDob },
    { label: "Phone", value: showPhone ? identity.phone : maskPhone(identity.phone || ""), toggle: () => setShowPhone((value) => !value), shown: showPhone },
  ];

  return (
    <main className="blauth-wallet">
      <div className="blauth-register-orb blauth-wallet-orb-one" /><div className="blauth-register-orb blauth-wallet-orb-two" />
      <nav className="blauth-register-nav" aria-label="Wallet navigation"><Link className="blauth-brand" to="/"><span className="blauth-brand-mark">B</span><span>BLAuth</span></Link><span className="blauth-nav-status"><i /> Private identity wallet</span></nav>
      <section className="blauth-wallet-shell">
        <header className="blauth-wallet-intro"><p className="blauth-eyebrow"><span /> Step 3 of 3</p><h1>Your identity,<br /><em>in your hands.</em></h1><p>These details stay in your local BLAuth wallet until you choose what to share.</p></header>
        <article className="blauth-wallet-card">
          <header className="blauth-wallet-card-header"><div><span className="blauth-wallet-card-mark">B</span><div><p>BLAuth Identity</p><h2>{identity.name || "Your identity"}</h2></div></div><span className="blauth-wallet-status"><i /> Identity verified locally</span></header>
          <div className="blauth-wallet-details" aria-label="Registered identity details">{fields.map((field) => <div className="blauth-wallet-field" key={field.label}><span>{field.label}</span><div><strong>{field.value || "Not provided"}</strong>{field.toggle && <button type="button" onClick={field.toggle}>{field.shown ? "Hide" : "Show"}</button>}</div></div>)}</div>
          <footer className="blauth-wallet-footer"><span aria-hidden="true">⌁</span><p>Your identity details are loaded from your BLAuth wallet.</p></footer>
          <div className="blauth-wallet-history-link"><Link to="/history">View disclosure history <span>→</span></Link></div>
          <div className="blauth-wallet-reset"><button type="button" onClick={resetLocalDemo}>Reset local demo identity</button><p>Use this before enrolling a different person on this browser.</p>{resetError && <p className="blauth-field-error" role="alert">{resetError}</p>}</div>
        </article>
      </section>
    </main>
  );
}

export default Wallet;
