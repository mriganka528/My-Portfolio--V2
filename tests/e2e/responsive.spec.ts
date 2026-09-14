import { test, expect, type Page } from "@playwright/test";

async function expectNoOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    main: document.querySelector("main")!.scrollWidth,
    mainWidth: document.querySelector("main")!.clientWidth
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport + 1);
  expect(widths.main).toBeLessThanOrEqual(widths.mainWidth + 1);
}

test.describe("mobile scrolling and zoom", () => {
  test.use({ reducedMotion: "no-preference" });

  test("phone layouts fit the viewport and navigation remains tappable", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Touch-device layout check.");
    for (const width of [320, 360, 392, 430]) {
      await page.setViewportSize({ width, height: 850 });
      await page.goto("/");
      await expectNoOverflow(page);
      const navigation = page.getByRole("navigation", { name: "Portfolio sections" });
      for (const name of ["about", "skills", "projects", "contact"]) {
        const button = navigation.getByRole("button", { name, exact: true });
        const box = await button.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        await button.tap();
        await expect(page.locator(`#${name}`)).toBeInViewport();
      }
      await expectNoOverflow(page);
      await page.getByLabel("email", { exact: true }).fill("mobile@example.org");
      expect(await page.getByLabel("email", { exact: true }).evaluate(element => getComputedStyle(element).fontSize)).toBe("16px");
      expect(await page.evaluate(() => window.visualViewport!.scale)).toBeCloseTo(1, 1);
    }
  });

  test("pinch zoom returns to the mobile layout without exposing a wider page", async ({ page, context, isMobile }) => {
    test.skip(!isMobile, "Requires mobile pinch gestures.");
    await page.setViewportSize({ width: 392, height: 850 });
    await page.goto("/");
    const width = await page.evaluate(() => document.documentElement.clientWidth);
    const client = await context.newCDPSession(page);
    await client.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
    await expect.poll(() => page.evaluate(() => window.visualViewport!.scale)).toBeGreaterThan(1.1);
    await client.send("Emulation.setPageScaleFactor", { pageScaleFactor: 0.5 });
    await expect.poll(() => page.evaluate(() => window.visualViewport!.scale)).toBeCloseTo(1, 1);
    expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(width);
    await expectNoOverflow(page);
    await page.getByRole("navigation", { name: "Portfolio sections" }).getByRole("button", { name: "contact", exact: true }).tap();
    await expect(page.locator("#contact")).toBeInViewport();
    await client.detach();
  });

  test("touch devices keep the marquee moving while heavy decorative effects stay disabled", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Touch-device rendering check.");
    await page.goto("/");
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.locator(".custom-cursor")).toHaveCount(0);
    expect(await page.evaluate(() => getComputedStyle(document.body, "::after").display)).toBe("none");
    expect(await page.locator(".scanline").evaluate(element => getComputedStyle(element, "::before").display)).toBe("none");
    await expect(page.locator(".marquee-inner")).toHaveCSS("white-space", "nowrap");
    await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.playState === "running").map(animation => animation instanceof CSSAnimation ? animation.animationName : "unknown"))).toEqual(["marquee"]);
    for (const reveal of await page.locator(".section-reveal").all()) await expect(reveal).toHaveCSS("opacity", "1");
  });

  test("reduced-motion preferences keep navigation and content accessible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.getByRole("navigation", { name: "Portfolio sections" }).getByRole("button", { name: "contact", exact: true }).click();
    await expect(page.locator("#contact")).toBeInViewport();
    await page.getByRole("button", { name: "back to top ↑", exact: true }).click();
    await expect(page.locator("#hero")).toBeInViewport();
  });

  test("desktop effects activate only for a desktop pointer and stop for reduced motion", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop decoration check.");
    await page.goto("/");
    await expect(page.locator("canvas")).toHaveCount(1);
    await page.mouse.move(400, 250);
    await expect(page.locator(".custom-cursor")).toHaveCount(1);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.locator(".custom-cursor")).toHaveCount(0);
  });
});
