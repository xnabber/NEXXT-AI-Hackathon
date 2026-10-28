import { test, expect } from "@playwright/test";
test("fits phone, tablet, laptop, and large monitor resolutions with readable text", async ({
  page,
}) => {
  test.setTimeout(120000);
  for (const width of [360, 390, 768, 1024, 1280, 1366, 1440, 1920, 2560]) {
    await page.setViewportSize({
      width,
      height: width < 720 ? 844 : width < 1440 ? 800 : 1080,
    });
    for (const route of ["/", "/coach", "/onboarding"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${route} at ${width}px overflows`,
      ).toBe(true);
      if (route === "/coach") {
        expect(
          await page
            .locator(".chat-welcome p")
            .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
        ).toBeGreaterThanOrEqual(15);
        expect(
          await page
            .getByRole("textbox", { name: "Ask your investment coach" })
            .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
        ).toBeGreaterThanOrEqual(16);
        if (width >= 1440) {
          const chat = await page.locator(".chat-card").boundingBox();
          expect(chat!.y + chat!.height).toBeLessThanOrEqual(1096);
        }
        if (width >= 1920)
          expect(
            (await page.locator(".coach-page").boundingBox())!.width,
          ).toBeGreaterThan(1600);
      }
    }
  }
});
