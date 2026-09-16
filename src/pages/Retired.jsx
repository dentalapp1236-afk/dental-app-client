import { useEffect, useState } from "react";
import api from "../api/axios";
import Icon from "../components/Icon";
import { MYMEDIN_URL } from "../config/retirement";

// Full-screen replacement for the whole app once MyDentalBooking is retired.
//
// Two paths, depending on whether the visitor still has a valid session:
//  - Signed in  -> one tap, handed straight over to MyMedIn already logged in
//                  (the API mints a short-lived handoff token).
//  - Signed out -> a plain link; they sign in there with the same credentials,
//                  which migrated across unchanged.
export default function Retired() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [handingOff, setHandingOff] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Let the splash screen go, whatever happens next.
    const done = () => {
      setChecking(false);
      window.finishSplash?.();
    };
    if (!localStorage.getItem("token")) {
      done();
      return;
    }
    api
      .get("/auth/me", { skipLoader: true })
      .then((r) => setUser(r.data.user))
      .catch(() => setUser(null))
      .finally(done);
  }, []);

  const continueToMyMedIn = async () => {
    setHandingOff(true);
    setError("");
    try {
      const { data } = await api.post("/handoff/token", null, { skipLoader: true });
      window.location.assign(data.url);
    } catch {
      // Handoff is a convenience, never a gate — fall back to a plain visit.
      setError("Couldn't sign you in automatically. Opening MyMedIn — please sign in there.");
      setTimeout(() => window.location.assign(MYMEDIN_URL), 1800);
    }
  };

  return (
    <div className="retired-page">
      <div className="retired-card">
        <div className="retired-logo">
          <Icon name="local_hospital" size={44} />
        </div>

        <h1>We've moved to MyMedIn</h1>
        <p className="retired-lede">
          MyDentalBooking is now <strong>MyMedIn</strong>. Your account, appointments,
          patients and payment history have all moved across already — nothing was lost.
        </p>

        {checking ? (
          <div className="retired-actions">
            <button type="button" className="icon" disabled>
              Checking your account…
            </button>
          </div>
        ) : user ? (
          <>
            <p className="retired-greeting">
              Signed in as <strong>{user.name}</strong>
            </p>
            <div className="retired-actions">
              <button type="button" className="icon" onClick={continueToMyMedIn} disabled={handingOff}>
                <Icon name="arrow_forward" size={18} />
                {handingOff ? "Taking you there…" : "Continue to MyMedIn"}
              </button>
            </div>
            <p className="retired-note muted">You'll be signed in automatically — no password needed.</p>
            {/* Always offer a plain link too. The one-tap handoff depends on
                MyMedIn's receiver being live; this one can never fail. */}
            <div className="retired-actions retired-actions-secondary">
              <a className="btn-secondary icon" href={MYMEDIN_URL}>
                <Icon name="open_in_new" size={16} /> Go to mymedin.com
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="retired-actions">
              <a className="btn-primary-link icon" href={MYMEDIN_URL}>
                <Icon name="arrow_forward" size={18} /> Go to mymedin.com
              </a>
            </div>
            <p className="retired-note muted">
              Sign in with the same email or phone number and password you used here.
            </p>
          </>
        )}

        {error && <div className="error retired-error">{error}</div>}

        <div className="retired-divider" />

        <div className="retired-install">
          <h2 className="icon">
            <Icon name="install_mobile" size={20} /> Add MyMedIn to your home screen
          </h2>
          <p className="muted">
            You can remove the old MyDentalBooking icon — it no longer works. To install the new app:
          </p>
          <ul className="retired-steps muted">
            <li>
              <strong>iPhone / iPad:</strong> open <span className="retired-url">mymedin.com</span> in Safari,
              tap Share, then <em>Add to Home Screen</em>.
            </li>
            <li>
              <strong>Android:</strong> open <span className="retired-url">mymedin.com</span> in Chrome,
              tap the menu, then <em>Install app</em>.
            </li>
          </ul>
        </div>

        <p className="retired-help muted">
          Trouble getting in? Contact your clinic and they'll help you get set up.
        </p>
      </div>
    </div>
  );
}
