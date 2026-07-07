import { useEffect } from "react";
import { useToast } from "../context/ToastContext";

// Drop-in replacement for an inline `<div className="error">{message}</div>`
// banner: renders nothing, and instead surfaces the message as a floating toast
// whenever it changes to a non-empty value. Lets pages keep their existing
// error state (setError/…) while showing errors as popups.
export default function FormError({ message }) {
  const toast = useToast();
  useEffect(() => {
    if (message) toast.error(message);
    // Fire whenever the message value changes; toast is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);
  return null;
}
