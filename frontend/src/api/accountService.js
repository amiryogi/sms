import apiClient from "./apiClient";

/**
 * Sign-in details: passwords an admin sets, and your own password.
 * A temporary password comes back once, in the response; it is never stored.
 */
export const accountService = {
  /** Admin: reset someone's password. body: { password? } (empty = generate one). */
  resetPassword: async (userId, body = {}) => (await apiClient.post(`/users/${userId}/reset-password`, body)).data,

  /** Admin: temporary passwords for a class, for printed login slips (dryRun: counts only). */
  classLogins: async (body) => (await apiClient.post("/students/credentials/bulk", body)).data,

  /** Change your own password. After an admin-set one, the response carries new tokens. */
  changePassword: async (currentPassword, newPassword) =>
    (await apiClient.put("/auth/change-password", { currentPassword, newPassword })).data,
};
