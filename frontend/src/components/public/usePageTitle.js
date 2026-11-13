import { useEffect } from "react";

/** Sets the browser tab title for a public page: "<title> · Vidyalaya SMS". */
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Vidyalaya SMS` : "Vidyalaya SMS — School Management System for Nepal";
  }, [title]);
}
