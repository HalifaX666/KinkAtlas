import { Link, NavLink, Outlet } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { useEffect } from "react";

export function Shell() {
  useEffect(() => {
    const preventKeyboardZoom = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;

      if (modifier && ["+", "=", "-", "0"].includes(event.key)) {
        event.preventDefault();
      }
    };

    const preventWheelZoom = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    };

    const preventGestureZoom = (event: Event) => {
      event.preventDefault();
    };

    document.addEventListener("keydown", preventKeyboardZoom, {
      capture: true,
    });

    document.addEventListener("wheel", preventWheelZoom, {
      passive: false,
      capture: true,
    });

    document.addEventListener("gesturestart", preventGestureZoom, {
      passive: false,
    });

    document.addEventListener("gesturechange", preventGestureZoom, {
      passive: false,
    });

    document.addEventListener("gestureend", preventGestureZoom, {
      passive: false,
    });

    return () => {
      document.removeEventListener("keydown", preventKeyboardZoom, {
        capture: true,
      });

      document.removeEventListener("wheel", preventWheelZoom, {
        capture: true,
      });

      document.removeEventListener("gesturestart", preventGestureZoom);
      document.removeEventListener("gesturechange", preventGestureZoom);
      document.removeEventListener("gestureend", preventGestureZoom);
    };
  }, []);
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
