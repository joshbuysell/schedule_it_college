import { devices, type Browser, type Page } from "@playwright/test";
import { accessible, expect, noHorizontalScroll, test } from "./fixtures";
import { GROUP, NOW, TEACHER, TOMORROW } from "./env";

// Повний цикл: навчальна частина видає доступи → викладач з телефона подає заявки →
// навчальна частина їх розглядає → студенти й табло бачать результат.
test.describe.configure({ mode: "serial" });
test.use({ storageState: "e2e/.auth/admin.json" });

let teacherLogin = "";
let teacherPassword = "";

async function teacherPhone(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ ...devices["iPhone 15"], locale: "uk-UA", timezoneId: "Europe/Kyiv" });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  return page;
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Логін або email").fill(teacherLogin);
  await page.getByLabel("Пароль").fill(teacherPassword);
  await page.getByRole("button", { name: "Увійти" }).click();
  await expect(page).toHaveURL(/\/cabinet$/);
}

async function openThursday(page: Page) {
  await page.getByRole("button", { name: /^Чт/ }).first().click();
  await expect(page.getByRole("heading", { level: 2 }).first()).toContainText("29 жовтня");
}

const card = (page: Page, pair: number, group: string) =>
  page.locator("div.rounded-md.border", { has: page.getByText(`${pair} пара`, { exact: true }) }).filter({ hasText: group }).first();

test("навчальна частина створює доступи для всіх викладачів", async ({ page }) => {
  await page.goto("/admin/users");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Створити доступи для всіх викладачів/ }).click();
  await expect(page.getByText("пароль показується лише один раз")).toBeVisible({ timeout: 60_000 });
  const row = page.getByRole("row", { name: new RegExp(TEACHER.split(" ")[0]) });
  const cells = row.getByRole("cell");
  teacherLogin = (await cells.nth(1).innerText()).trim();
  teacherPassword = (await cells.nth(2).innerText()).trim();
  expect(teacherLogin).not.toBe("");
  expect(teacherPassword.length).toBeGreaterThanOrEqual(8);
});

test("викладач не входить з неправильним паролем", async ({ browser }) => {
  const page = await teacherPhone(browser);
  await page.goto("/login");
  await page.getByLabel("Логін або email").fill(teacherLogin);
  await page.getByLabel("Пароль").fill("wrong-password");
  await page.getByRole("button", { name: "Увійти" }).click();
  await expect(page.getByText(/невірн|неправильн/i)).toBeVisible();
  await page.context().close();
});

test("викладач з телефона просить іншу аудиторію і скасування пари", async ({ browser }) => {
  const page = await teacherPhone(browser);
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Прищляк");
  await noHorizontalScroll(page);

  await openThursday(page);
  const second = card(page, 2, "ІП-31");
  await second.getByRole("button", { name: "Інша аудиторія" }).click();
  await second.getByPlaceholder(/Нова аудиторія/).fill("211");
  await second.getByPlaceholder(/Коментар/).fill("Потрібен проєктор");
  await second.getByRole("button", { name: "Надіслати" }).click();
  await expect(page.getByText("Заявку надіслано до навчальної частини.")).toBeVisible();
  await expect(second.getByText(/Заявка очікує розгляду: аудиторія 211/)).toBeVisible();

  const third = card(page, 3, "МТ-230");
  await third.getByRole("button", { name: "Скасувати пару" }).click();
  await third.getByPlaceholder(/Причина/).fill("Конференція");
  await third.getByRole("button", { name: "Надіслати" }).click();
  await expect(third.getByText(/Заявка очікує розгляду/)).toBeVisible();

  const mine = page.locator("section", { has: page.getByRole("heading", { name: "Мої заявки" }) });
  await expect(mine.getByText("очікує розгляду")).toHaveCount(2);
  await noHorizontalScroll(page);

  const past = await page.request.post("/api/cabinet/absence", { data: { date: "2026-10-27" } });
  expect(past.status(), "на минулу дату заявку подати не можна").toBe(400);
  await page.context().close();
});

test("навчальна частина бачить заявки, одну підтверджує, другу відхиляє", async ({ page }) => {
  await page.goto("/admin");
  await page.getByRole("link", { name: /Заміни/ }).first().click();
  const requests = page.locator("section", { has: page.getByRole("heading", { name: /Заявки від викладачів/ }) });
  await expect(requests.getByRole("heading")).toHaveText("Заявки від викладачів: 2");

  const room = requests.getByRole("listitem").filter({ hasText: "ІП-31" });
  await expect(room).toContainText("211");
  await expect(room).toContainText("Потрібен проєктор");
  await room.getByRole("button", { name: "Підтвердити як є" }).click();
  await expect(page.getByRole("heading", { name: /Заявки від викладачів: 1/ })).toBeVisible();

  await requests.getByRole("listitem").filter({ hasText: "МТ-230" }).getByRole("button", { name: "Відхилити" }).click();
  await expect(page.getByRole("heading", { name: /Заявки від викладачів/ })).toBeHidden();
});

test("студенти ІП-31 бачать нову аудиторію на четвер", async ({ page }) => {
  const res = await page.request.get(`/api/v1/groups/${encodeURIComponent("ІП-31")}`);
  const { changes } = await res.json();
  expect(changes.filter((c: { date: string; room: string }) => c.date === TOMORROW && c.room === "211")).toHaveLength(1);

  await page.goto(`/group/${encodeURIComponent("ІП-31")}`);
  const lesson = page.locator(".lesson", { hasText: "Потрібен проєктор" }).filter({ visible: true });
  await expect(lesson).toContainText("Інша аудиторія");
  await expect(lesson).toContainText("211");
  await expect(lesson).toContainText("замість: ауд. 304");
});

test("викладач бачить рішення по своїх заявках", async ({ browser }) => {
  const page = await teacherPhone(browser);
  await signIn(page);
  const mine = page.locator("section", { has: page.getByRole("heading", { name: "Мої заявки" }) });
  await expect(mine.getByRole("listitem").filter({ hasText: "ІП-31" })).toContainText("підтверджено");
  await expect(mine.getByRole("listitem").filter({ hasText: "МТ-230" })).toContainText("відхилено");

  await openThursday(page);
  await expect(card(page, 2, "ІП-31")).toContainText("Зміна:");
  await test.step("кабінет доступний для екранних читалок", () => accessible(page));
  await page.context().close();
});

test("навчальна частина сама оформлює заміну і скасування на сьогодні", async ({ page }) => {
  await page.goto("/admin/changes");
  await page.getByRole("combobox").filter({ has: page.getByRole("option", { name: "Виберіть групу" }) }).selectOption({ label: GROUP });

  const row3 = page.getByRole("row").filter({ hasText: "Алгоритми і методи обчислень" });
  await row3.getByRole("button", { name: "Замінити" }).click();
  const teacher = page.getByText("Викладач", { exact: true }).locator("..").getByRole("textbox");
  await teacher.fill("Юнак");
  const option = page.getByRole("button", { name: /Юнак О\.М\./ });
  await expect(option).toContainText("вільний");
  await option.click();
  await page.getByPlaceholder("Напр. пара переноситься з 4-ї").fill("Викладач на курсах");
  await page.getByRole("button", { name: "Зберегти заміну" }).click();

  const row4 = page.getByRole("row").filter({ hasText: "Дискретна математика" });
  await row4.getByRole("button", { name: "Скасувати" }).click();

  const all = page.locator("section", { has: page.getByRole("heading", { name: /Усі зміни на цей день: 2/ }) });
  await expect(all).toContainText("Юнак");
  await expect(all).toContainText(/скасовано/i);
});

test("студент КІ-21 бачить зміни на сьогодні на сторінці групи", async ({ page }) => {
  await page.goto(`/group/${encodeURIComponent(GROUP)}`);
  await expect(page.getByText("Юнак О.М.").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Скасовано").filter({ visible: true }).first()).toBeVisible();
});

test("адмінка доступна для екранних читалок", async ({ page }) => {
  for (const path of ["/admin", "/admin/editor", "/admin/changes", "/admin/dictionaries", "/admin/reports", "/admin/history", "/admin/users", "/admin/settings"]) {
    await page.goto(path);
    await test.step(path, () => accessible(page));
  }
});
