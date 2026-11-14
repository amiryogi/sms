/** The signed-in person's photo in the home header, and its fallbacks. */
import { fresh, type Fresh } from "../isolated";

jest.setTimeout(20000);

let m: Fresh;
beforeEach(async () => {
  m = await fresh();
});

const avatar = () => m.req<typeof import("@/features/dashboard/HeroAvatar")>("@/features/dashboard/HeroAvatar").HeroAvatar;

test("shows the initials when there is no photo", async () => {
  const HeroAvatar = avatar();
  await m.render(<HeroAvatar name="Asha Kumari Gurung" uri={null} />);
  expect(await m.screen().findByText("AG")).toBeTruthy();
});

test("shows the photo instead of the initials when there is one", async () => {
  const HeroAvatar = avatar();
  await m.render(<HeroAvatar name="Asha Gurung" uri="https://example.test/a.jpg" />);
  // Give the initials a chance to appear; they must not.
  await new Promise((r) => setTimeout(r, 50));
  expect(m.screen().queryByText("AG")).toBeNull();
});
