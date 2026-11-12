import { fullName } from "../utils/format";
/**
 * React-admin Auth Provider: a thin adapter over the app's own AuthContext.
 * The app has already signed the user in and guards the route
 * (ProtectedRoute), and `apiClient` refreshes expired access tokens itself.
 * Roles are exposed only so screens can hide buttons; the Express backend is
 * the security boundary.
 */
const buildAuthProvider = ({ user, logout }) => ({
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(false), // never let react-admin redirect on its own
  checkAuth: () => (localStorage.getItem("accessToken") ? Promise.resolve() : Promise.reject()),
  // 401 reaches here only after apiClient's refresh failed: sign out through the
  // app. 403 is "not allowed", not "signed out": stay on the page.
  checkError: async (error) => {
    if (error?.status === 401) {
      await logout();
      throw new Error("Your session has ended. Please sign in again.");
    }
  },
  getIdentity: () =>
    Promise.resolve({
      id: user?.id,
      fullName: fullName(user),
      avatar: user?.avatarUrl || undefined,
    }),
  getPermissions: () => Promise.resolve(user?.roles || []),
});

export default buildAuthProvider;
