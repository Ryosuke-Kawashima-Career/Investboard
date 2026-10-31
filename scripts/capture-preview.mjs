import { chromium } from "@playwright/test";
const browser = await chromium.launch();
for (const [name, width, height] of [
  ["desktop", 1440, 1050],
  ["mobile", 360, 800],
]) {
  const page = await browser.newPage({
    viewport: { width, height },
    reducedMotion: "reduce",
  });
  await page.goto("http://127.0.0.1:5173");
  await page.screenshot({ path: `dev/previews/${name}.png`, fullPage: true });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  console.log(`${name}: horizontal overflow=${overflow}`);
  await page
    .locator(".company-table")
    .getByRole("button", { name: "Tata Consultancy Services", exact: true })
    .first()
    .click();
  await page.screenshot({
    path: `dev/previews/${name}-company.png`,
    fullPage: true,
  });
  console.log(
    `${name} company: horizontal overflow=${await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)}`,
  );
  await page.close();
}
await browser.close();
