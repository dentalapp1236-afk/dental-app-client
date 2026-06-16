import { useEffect, useState } from "react";
import { loadingStore } from "../api/loading";

// Non-blocking global fetch indicator: a slim top progress bar plus a small
// corner spinner. Debounced so very fast requests don't cause a flash.
export default function GlobalLoader() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timer;
    const unsubscribe = loadingStore.subscribe((pending) => {
      clearTimeout(timer);
      if (pending) {
        timer = setTimeout(() => setActive(true), 120);
      } else {
        setActive(false);
      }
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return (
    <>
      <div className={`global-loader ${active ? "active" : ""}`} aria-hidden="true">
        <div className="global-loader-bar" />
      </div>
      {active && (
        <div className="global-spinner" role="status" aria-label="Loading">
          <span className="spinner" />
        </div>
      )}
    </>
  );
}
