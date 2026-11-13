// The public product site: home, the navbar pages, contact links, footer credit.
// No sign-in needed except where noted; console errors fail a test (helpers/fixtures).
const { test, expect, stateFor } = require("../helpers/fixtures");

const PAGES = [
  { label: "Features", url: "/features", heading: /Built for the whole school year/ },
  { label: "Portals", url: "/portals", heading: /A portal for every person/ },
  { label: "Tour", url: "/tour", heading: /Every screen, as it really is/ },
  { label: "Pricing", url: "/pricing", heading: /Simple prices for every school/ },
  { label: "Contact", url: "/contact", heading: /Let's talk about your school/ },
];

test.describe("public site", () => {
  test("the home page renders and every navbar link reaches its page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Run your whole school from one place");
    const nav = page.getByRole("navigation", { name: "Site" });
    for (const p of PAGES) {
      await nav.getByRole("link", { name: p.label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${p.url}$`));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(p.heading);
    }
    await nav.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("link", { name: /Sign in/ }).first().click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByRole("link", { name: "Back to home" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("contact links and the footer credit point where they should", async ({ page }) => {
    await page.goto("/contact");
    const main = page.locator("main");
    await expect(main.getByRole("link", { name: /Call now/ })).toHaveAttribute("href", "tel:+9779861158271");
    await expect(main.getByRole("link", { name: /Open WhatsApp/ })).toHaveAttribute("href", "https://wa.me/9779861158271");
    await expect(main.getByRole("link", { name: /Open Viber/ })).toHaveAttribute("href", "viber://chat?number=%2B9779861158271");
    await expect(main.getByRole("link", { name: /Write an email/ })).toHaveAttribute("href", "mailto:amirsvi766@gmail.com");

    const footer = page.locator("footer");
    await expect(footer).toContainText("Created and Designed by Amir Shrestha");
    const credit = footer.getByRole("link", { name: "Amir Shrestha" });
    await expect(credit).toHaveAttribute("href", "https://amirlearner.me");
    await expect(credit).toHaveAttribute("target", "_blank");
  });

  test("the enquiry form asks for a name and a message", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: "Send by email" }).click();
    await expect(page.getByText("Tell us your name")).toBeVisible();
    await expect(page.getByText("Write a short message")).toBeVisible();
  });

  test("pricing: the yearly/monthly switch changes the price, and a plan opens a ready enquiry", async ({ page }) => {
    await page.goto("/pricing");
    const basic = page.getByTestId("price-basic");
    await expect(basic).toHaveText("NPR 35,000");
    await page.getByRole("tab", { name: /monthly/i }).click();
    await expect(basic).toHaveText("NPR 3,500");
    await page.getByRole("tab", { name: /yearly/i }).click();
    await expect(basic).toHaveText("NPR 35,000");

    await page.getByRole("link", { name: "Choose Basic" }).click();
    await expect(page).toHaveURL(/\/contact\?plan=Basic#enquiry$/);
    await expect(page.locator("#c-message")).toHaveValue(/interested in the "Basic" option/);
    // an unknown plan name is ignored
    await page.goto("/contact?plan=%3Cscript%3E");
    await expect(page.locator("#c-message")).toHaveValue("");
  });

  test("every screenshot on the tour exists", async ({ page }) => {
    await page.goto("/tour");
    await expect(page.getByRole("button", { name: "Open Admin dashboard" })).toBeVisible();
    const sources = await page.locator("main ul img").evaluateAll((imgs) => imgs.map((i) => i.getAttribute("src")));
    expect(sources.length).toBeGreaterThanOrEqual(18);
    for (const src of sources) {
      const res = await page.request.get(src);
      expect(res.status(), src).toBe(200);
      expect(res.headers()["content-type"], src).toContain("image/jpeg");
    }
    // the link-preview image (og:image) is served, at the size the tags announce
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(og).toMatch(/^https:\/\/.+\/og-image\.jpg$/);
    const ogRes = await page.request.get("/og-image.jpg");
    expect(ogRes.status()).toBe(200);
    expect(ogRes.headers()["content-type"]).toContain("image/jpeg");
    // the lightbox opens, steps with the arrow keys and closes with Escape
    await page.getByRole("button", { name: "Open Admin dashboard" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Admin dashboard" })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByRole("heading", { name: "Student directory" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("the menu opens, navigates, and closes; nothing scrolls sideways", async ({ page }) => {
      await page.goto("/");
      const toggle = page.getByRole("button", { name: "Open menu" });
      await toggle.click();
      await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
      await page.locator("#public-mobile-menu").getByRole("link", { name: "Features" }).click();
      await expect(page).toHaveURL(/\/features$/);
      await expect(page.locator("#public-mobile-menu")).toBeHidden();
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.keyboard.press("Escape");
      await expect(page.locator("#public-mobile-menu")).toBeHidden();
      // the contact buttons stack full-width at their normal height (they were squashed once)
      await page.goto("/contact");
      for (const name of ["Send by email", "Send on WhatsApp"]) {
        const box = await page.getByRole("button", { name }).boundingBox();
        expect(box.height, `${name} height`).toBeGreaterThanOrEqual(40);
        expect(box.width, `${name} width`).toBeGreaterThan(250);
      }
      for (const url of ["/", ...PAGES.map((p) => p.url)]) {
        await page.goto(url);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${url} scrolls sideways`).toBeLessThanOrEqual(0);
      }
    });
  });

  test.describe("signed in", () => {
    test.use({ storageState: stateFor("admin") });

    test("the home page offers the dashboard instead of sign-in", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("link", { name: /Go to dashboard/ }).click();
      await expect(page).toHaveURL(/\/admin\/dashboard/);
    });
  });
});
