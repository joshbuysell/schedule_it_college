import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { NOW } from "./env";

export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.clock.setFixedTime(new Date(NOW));
    await provide(page);
  },
});

export { expect };

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "сторінка не має прокручуватися вбік").toBeLessThanOrEqual(1);
}

export async function accessible(page: Page) {
  // Даємо завершитися CSS-переходам, інакше axe міряє контраст посеред анімації.
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const report = violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(" ")).slice(0, 5).join("\n  ")}`);
  expect.soft(report, `порушення доступності: ${page.url()}`).toEqual([]);
}
