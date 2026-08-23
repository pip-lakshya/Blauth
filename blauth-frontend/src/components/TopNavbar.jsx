import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/", label: "Home" },
  { to: "/register", label: "Create Identity" },
  { to: "/wallet", label: "Wallet" },
  { to: "/developer", label: "Developer Console" },
];

function TopNavbar() {
  const { pathname } = useLocation();

  // The BLAuth user authentication surface intentionally has its own minimal
  // header and must not expose developer navigation.
  if (pathname === "/authenticate") return null;

  return (
    <header className="blauth-app-nav">
      <Link className="blauth-brand" to="/" aria-label="BLAuth home"><span className="blauth-brand-mark">B</span><span>BLAuth</span></Link>
      <nav aria-label="Application navigation">
        {links.map((link) => <Link className={pathname === link.to ? "is-active" : ""} key={link.to} to={link.to}>{link.label}</Link>)}
      </nav>
    </header>
  );
}

export default TopNavbar;
