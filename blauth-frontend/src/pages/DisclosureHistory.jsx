import { useState } from "react";
import { Link } from "react-router-dom";

const DISCLOSURE_HISTORY_KEY = "blauthDisclosureHistory";

function readDisclosureHistory() {
  try {
    const storedHistory = localStorage.getItem(DISCLOSURE_HISTORY_KEY);
    const history = storedHistory ? JSON.parse(storedHistory) : [];
    return Array.isArray(history) ? [...history].reverse() : [];
  } catch (error) {
    console.error("Unable to read local disclosure history:", error);
    return [];
  }
}

function formatField(field) {
  const labels = { name: "Name", email: "Email", college: "College", studentId: "Student ID", dob: "Date of Birth", phone: "Phone", ageOver18: "Age over 18" };
  return labels[field] || field;
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
}

function DisclosureHistory() {
  const [history] = useState(readDisclosureHistory);

  return (
    <main className="blauth-history">
      <div className="blauth-register-orb blauth-history-orb-one" /><div className="blauth-register-orb blauth-history-orb-two" />
      <nav className="blauth-register-nav" aria-label="Disclosure history navigation"><Link className="blauth-brand" to="/" aria-label="BLAuth home"><span className="blauth-brand-mark">B</span><span>BLAuth</span></Link><span className="blauth-nav-status"><i /> Your disclosure record</span></nav>
      <section className="blauth-history-shell" aria-labelledby="history-title">
        <header className="blauth-history-intro"><p className="blauth-eyebrow"><span /> Your activity</p><h1 id="history-title">Disclosure<br /><em>history.</em></h1><p>Every local sharing decision is recorded here so you can see exactly what was approved.</p></header>
        <div className="blauth-history-card">
          <header><h2>Recent disclosures</h2><span>{history.length} {history.length === 1 ? "record" : "records"}</span></header>
          {history.length ? <ol className="blauth-history-list">{history.map((record, index) => <li key={`${record.timestamp}-${index}`}><div className="blauth-history-record-header"><div><h3>{record.verifier || "Unknown verifier"}</h3><p>{formatTimestamp(record.timestamp)}</p></div><span className="blauth-history-local">Local</span></div><div className="blauth-history-columns"><section><h4>Shared</h4>{record.sharedFields?.length ? record.sharedFields.map((field) => <p className="is-shared" key={field}>✓ {formatField(field)}</p>) : <p>Nothing shared</p>}</section><section><h4>Withheld</h4>{record.withheldFields?.length ? record.withheldFields.map((field) => <p key={field}>○ {formatField(field)}</p>) : <p>None</p>}</section></div></li>)}</ol> : <div className="blauth-history-empty"><span>○</span><h3>No disclosures yet</h3><p>When you approve a sharing request, the fields you chose will appear here.</p><Link to="/wallet">Return to Wallet <span>→</span></Link></div>}
          {history.length > 0 && <footer><Link to="/wallet">← Return to Wallet</Link></footer>}
        </div>
      </section>
    </main>
  );
}

export default DisclosureHistory;
