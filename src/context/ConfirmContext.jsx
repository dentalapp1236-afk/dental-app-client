import { createContext, useCallback, useContext, useRef, useState } from "react";
import Icon from "../components/Icon";

const ConfirmContext = createContext(null);

// App-wide replacement for window.confirm(): returns a Promise<boolean> that
// resolves once the user picks Cancel or the destructive action, so callers
// can just `if (!(await confirm("..."))) return;` exactly like before.
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setState({
        message,
        title: opts.title || "Are you sure?",
        confirmLabel: opts.confirmLabel || "Delete",
      });
    });
  }, []);

  const settle = (result) => {
    setState(null);
    resolver.current?.(result);
    resolver.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="modal-backdrop" onClick={() => settle(false)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon confirm-icon-danger">
              <Icon name="warning" />
            </div>
            <h3 style={{ margin: 0 }}>{state.title}</h3>
            <p className="muted" style={{ margin: 0 }}>{state.message}</p>
            <div className="row gap" style={{ justifyContent: "center" }}>
              <button type="button" className="btn-secondary" onClick={() => settle(false)}>
                Cancel
              </button>
              <button type="button" className="btn-danger" onClick={() => settle(true)}>
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}
