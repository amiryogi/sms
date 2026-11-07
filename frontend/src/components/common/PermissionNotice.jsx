import { useEffect } from "react";
import { API_EVENTS } from "../../api/apiClient";
import { toast } from "../ui/toastStore";

/**
 * When the API answers 403, show one "no permission" toast. apiClient
 * dispatches API_EVENTS.FORBIDDEN on window; repeated 403s reuse the same
 * toast id, so they collapse into one. Mounted once in DashboardLayout.
 */
const PermissionNotice = () => {
  useEffect(() => {
    const onForbidden = () =>
      toast.error("You don't have permission to do that.", { id: "forbidden" });
    window.addEventListener(API_EVENTS.FORBIDDEN, onForbidden);
    return () => window.removeEventListener(API_EVENTS.FORBIDDEN, onForbidden);
  }, []);
  return null;
};

export default PermissionNotice;
