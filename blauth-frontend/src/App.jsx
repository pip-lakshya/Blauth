import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import "./App.css";
import Register from "./pages/Register";
import FaceVerify from "./pages/FaceVerify";
import Wallet from "./pages/Wallet";
import Consent from "./pages/Consent";
import VerifierAge from "./pages/VerifierAge";
import DisclosureHistory from "./pages/DisclosureHistory";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<FaceVerify />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/consent" element={<Consent />} />
        <Route path="/verifier/age" element={<VerifierAge />} />
        <Route path="/verify-age" element={<VerifierAge />} />
        <Route path="/history" element={<DisclosureHistory />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
