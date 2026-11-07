import React, { useEffect, useRef, useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import { API_EVENTS } from "../../api/apiClient";

const DISPLAY_MS = 5000;
const DEFAULT_MESSAGE = "You don't have permission to do that.";

/**
 * App-wide notice shown when the API answers 403. Mounted once in
 * DashboardLayout; apiClient dispatches API_EVENTS.FORBIDDEN on window.
 * Several 403s in a row collapse into one notice (the timer restarts).
 */
const PermissionNotice = () => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const onForbidden = () => {
      setVisible(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), DISPLAY_MS);
    };
    window.addEventListener(API_EVENTS.FORBIDDEN, onForbidden);
    return () => {
      window.removeEventListener(API_EVENTS.FORBIDDEN, onForbidden);
      clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="permission-notice" role="status" aria-live="polite">
      <ShieldAlert size={18} className="permission-notice-icon" />
      <span>{DEFAULT_MESSAGE}</span>
      <button
        type="button"
        className="permission-notice-close"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default PermissionNotice;
