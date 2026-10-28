import { expect, test as setup } from "@playwright/test";
import { ADMIN } from "./env";

setup("навчальна частина входить в адмінку", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Логін або email").fill(ADMIN.email);
  await page.getByLabel("Пароль").fill(ADMIN.password);
  await page.getByRole("button", { name: "Увійти" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.context().storageState({ path: "e2e/.auth/admin.json" });
});
