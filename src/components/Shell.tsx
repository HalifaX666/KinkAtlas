import { Link, NavLink, Outlet } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";

export function Shell() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="wordmark" to="/" aria-label="Kink Atlas home">
          <BrandLogo size="header" />
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/philosophy">Consent philosophy</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/assessment" className="nav-cta">
            Start exploring
          </NavLink>
        </nav>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer>
        <div className="footer-brand">
          <Link className="wordmark" to="/" aria-label="Kink Atlas home">
            <BrandLogo size="footer" />
          </Link>

          <p>Discover your desires. Know your boundaries. Learn your language.</p>
        </div>

        <div className="footer-center">
          <nav className="footer-links" aria-label="Further information">
            <Link to="/about#how-it-works">How it works</Link>
            <Link to="/about#privacy">Privacy</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/philosophy">Consent philosophy</Link>
          </nav>

          <p className="footer-attribution">Built by D.</p>
        </div>

        <p className="footer-copyright">© {new Date().getFullYear()} KinkAtlas. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
