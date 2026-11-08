import apiClient from "./apiClient";

/**
 * Student and parent portal (docs/plans/finance-and-portals.md, Phases 6-7).
 * The API only answers for the signed-in student, or a parent's linked child.
 */
export const portalService = {
  /** Profile, enrolment, subjects, attendance, latest published result, upcoming exams, assignments and fees. */
  getOverview: async (studentId) => (await apiClient.get(`/portal/students/${studentId}/overview`)).data,
};

export default portalService;
