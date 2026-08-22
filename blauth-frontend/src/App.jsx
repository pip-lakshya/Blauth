import { BrowserRouter, Routes, Route } from "react-router-dom";

function Home() {
  return (
    <div>
      <h1>BLAuth</h1>
      <p>Prove who you are. Share only what you choose.</p>
    </div>
  );
}

function Register() {
  return <h1>Register</h1>;
}

function FaceVerify() {
  return <h1>Face Verification</h1>;
}

function Wallet() {
  return <h1>Wallet</h1>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<FaceVerify />} />
        <Route path="/wallet" element={<Wallet />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;