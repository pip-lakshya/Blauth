import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const initialFormData = { name: "", email: "", college: "", studentId: "", dob: "", phone: "" };
const fields = [
  { name: "name", label: "Full Name", type: "text", placeholder: "Enter your full name", autoComplete: "name", wide: true },
  { name: "email", label: "Email", type: "email", placeholder: "you@example.com", autoComplete: "email", wide: true },
  { name: "college", label: "College", type: "text", placeholder: "Your college or university", autoComplete: "organization" },
  { name: "studentId", label: "Student ID", type: "text", placeholder: "e.g. STU-2026-041", autoComplete: "off" },
  { name: "dob", label: "Date of Birth", type: "date", autoComplete: "bday" },
  { name: "phone", label: "Phone Number", type: "tel", placeholder: "10-digit phone number", autoComplete: "tel", inputMode: "tel" },
];

function validate(formData) {
  const errors = {};
  const phoneDigits = formData.phone.replace(/\D/g, "");
  Object.entries(formData).forEach(([name, value]) => {
    if (!value.trim()) errors[name] = "This field is required.";
  });
  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Enter a valid email address.";
  if (formData.phone && (phoneDigits.length < 10 || phoneDigits.length > 15)) errors.phone = "Enter a valid phone number.";
  return errors;
}

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(formData);
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    localStorage.setItem("blauthIdentity", JSON.stringify(formData));
    navigate("/verify");
  }

  return (
    <main className="blauth-register">
      <div className="blauth-register-orb blauth-register-orb-one" />
      <div className="blauth-register-orb blauth-register-orb-two" />
      <nav className="blauth-register-nav" aria-label="Registration navigation">
        <Link className="blauth-brand" to="/" aria-label="BLAuth home"><span className="blauth-brand-mark">B</span><span>BLAuth</span></Link>
        <span className="blauth-nav-status"><i /> Privacy-first identity</span>
      </nav>
      <section className="blauth-register-shell" aria-labelledby="register-title">
        <header className="blauth-register-intro">
          <p className="blauth-eyebrow"><span /> Step 1 of 3</p>
          <h1 id="register-title">Create your<br /><em>identity.</em></h1>
          <p>Start with the details you choose to keep in your private identity wallet.</p>
        </header>
        <div className="blauth-register-card">
          <ol className="blauth-register-progress" aria-label="Registration progress">
            <li className="is-active"><span>1</span><strong>Registration</strong></li><li><span>2</span><strong>Face Verification</strong></li><li><span>3</span><strong>Wallet</strong></li>
          </ol>
          <form className="blauth-register-form" noValidate onSubmit={handleSubmit}>
            <div className="blauth-form-heading"><h2>Your details</h2><p>All fields are required.</p></div>
            <div className="blauth-form-grid">
              {fields.map((field) => {
                const error = errors[field.name];
                return <div className={`blauth-input-group${field.wide ? " is-wide" : ""}`} key={field.name}>
                  <label htmlFor={field.name}>{field.label}</label>
                  <input {...field} id={field.name} value={formData[field.name]} onChange={handleChange} aria-invalid={Boolean(error)} aria-describedby={error ? `${field.name}-error` : undefined} />
                  {error && <p className="blauth-field-error" id={`${field.name}-error`} role="alert">{error}</p>}
                </div>;
              })}
            </div>
            <aside className="blauth-privacy-notice"><span aria-hidden="true">⌁</span><p><strong>Your biometric data stays on your device.</strong> BLAuth only moves forward with details you approve.</p></aside>
            <div className="blauth-register-actions"><button className="blauth-back-button" type="button" onClick={() => navigate("/")}>← Back</button><button className="blauth-continue-button" type="submit">Continue <span>→</span></button></div>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Register;
