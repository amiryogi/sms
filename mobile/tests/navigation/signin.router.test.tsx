/**
 * End to end through the router: signing in flips the guards and opens the
 * role's home. One guard flip per file: Expo Router's in-memory test router
 * keeps state after a mounted guard flips, which would leak into a next test.
 */
import path from "path";
import { fireEvent, renderRouter, screen, waitFor } from "expo-router/testing-library";
import { authService } from "@/api/services/auth";
import { makeUser } from "../fixtures/user";
import { resetDevice, seedSignedOutDevice } from "../helpers";

jest.mock("@/api/services/auth", () => ({
  authService: { me: jest.fn(), login: jest.fn(), logout: jest.fn(), changePassword: jest.fn() },
}));
jest.setTimeout(30_000);

it("signs a parent in and opens the parent area", async () => {
  await resetDevice();
  await seedSignedOutDevice();
  (authService.login as jest.Mock).mockResolvedValue({ user: makeUser(["PARENT"]), accessToken: "a", refreshToken: "r" });

  await renderRouter(path.resolve(__dirname, "../../src/app"), { initialUrl: "/login" });
  fireEvent.changeText(await screen.findByLabelText("Username or email"), "p.stu20240001");
  fireEvent.changeText(screen.getByLabelText("Password"), "password123");
  fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

  await waitFor(() => expect(screen).toHavePathname("/parent"));
});
