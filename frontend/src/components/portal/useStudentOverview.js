import { useEffect, useState } from "react";
import { portalService } from "../../api/portalService";

/** GET /portal/students/:id/overview for one student: { data, error } (data null while loading). */
export const useStudentOverview = (studentId) => {
  const [state, setState] = useState({ id: null, data: null, error: "" });

  useEffect(() => {
    if (!studentId) return undefined;
    let alive = true;
    portalService
      .getOverview(studentId)
      .then((res) => alive && setState({ id: studentId, data: res.data, error: "" }))
      .catch((err) => alive && setState({ id: studentId, data: null, error: err.response?.data?.message || "Could not load" }));
    return () => {
      alive = false;
    };
  }, [studentId]);

  // Never show a previous student's data while the next one loads (parent switching children).
  return state.id === studentId ? state : { id: studentId, data: null, error: "" };
};

export default useStudentOverview;
