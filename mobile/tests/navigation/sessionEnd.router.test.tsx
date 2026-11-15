/**
 * End to end through the router: when the API reports the session is over,
 * the app leaves the protected area for sign-in. (One guard flip per file.)
 */
import path from "path";
import { act, renderRouter, screen, waitFor } from "expo-router/testing-library";
import { apiEvents } from "@/api/events";
import { authService } from "@/api/services/auth";
import { makeUser } from "../fixtures/user";
import { resetDevice, seedSignedInDevice } from "../helpers";

jest.mock("@/api/services/auth", () => ({
  authService: { me: jest.fn(), login: jest.fn(), logout: jest.fn(), changePassword: jest.fn() },
}));
jest.setTimeout(30_000);

it("returns a teacher to sign-in when the session expires", async () => {
  await resetDevice();
  await seedSignedInDevice();
  (authService.me as jest.Mock).mockResolvedValue(makeUser(["TEACHER"]));

  await renderRouter(path.resolve(__dirname, "../../src/app"), { initialUrl: "/" });
  await waitFor(() => expect(screen).toHavePathname("/teacher"));

  await act(async () => {
    apiEvents.emit({ type: "session-expired" });
  });

  await waitFor(() => expect(screen).toHavePathname("/login"));
  expect(await screen.findByText("Your session has ended. Please sign in again.")).toBeTruthy();
});
