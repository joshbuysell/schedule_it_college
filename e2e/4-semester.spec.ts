import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { GROUP, TEACHER } from "./env";

// Навчальна частина готує новий семестр як чернетку, публікує його, а потім повертає старий.
test.describe.configure({ mode: "serial" });
test.use({ storageState: "e2e/.auth/admin.json" });

const TITLE = "І семестр 2026/2027 н.р.";
const SUBJECT = "Проєктний практикум";
const groupPage = `/group/${encodeURIComponent(GROUP)}`;

const semesterRow = (page: Page, title: string) => page.getByRole("listitem").filter({ hasText: title });

function cell(page: Page, day: number, pair: number) {
  return page.locator("div.grid.min-w-\\[860px\\] > div").nth(6 + (pair - 1) * 6 + day);
}

async function combobox(page: Page, label: string) {
  return page.getByText(label, { exact: true }).locator("..").getByRole("textbox");
}

test("створює чернетку нового семестру з копії поточного", async ({ page }) => {
  await page.goto("/admin/settings");
  const form = page.locator("form", { has: page.getByRole("button", { name: "Створити чернетку" }) });
  await form.getByLabel("Назва").fill(TITLE);
  await form.getByLabel("Понеділок першого тижня-чисельника").fill("2026-11-02");
  await form.getByLabel("Кінець семестру").fill("2027-01-29");
  await expect(form.getByLabel("Почати з")).toHaveValue(/\d+/);
  await form.getByRole("button", { name: "Створити чернетку" }).click();

  const row = semesterRow(page, TITLE);
  await expect(row).toContainText("чернетка");
  await expect(row).toContainText(/\d{3,} занять/);
});

test("додає пару в чернетку, бачить накладку викладача", async ({ page }) => {
  await page.goto("/admin/settings");
  await semesterRow(page, TITLE).getByRole("link", { name: "Редагувати" }).click();
  await expect(page.getByText("Чернетка: студенти поки бачать інший семестр")).toBeVisible();

  await page.getByRole("button", { name: new RegExp(`^${GROUP}`) }).click();
  await expect(page.getByRole("heading", { level: 1, name: GROUP })).toBeVisible();

  await cell(page, 3, 5).click();
  await expect(page.getByRole("heading", { name: "Середа, 5 пара" })).toBeVisible();
  const subject = await combobox(page, "Дисципліна");
  await subject.fill(SUBJECT);
  await page.getByRole("button", { name: `+ Додати «${SUBJECT}»` }).click();

  const teacher = await combobox(page, "Викладач");
  await teacher.fill(TEACHER.split(" ")[0]);
  await page.getByRole("button", { name: new RegExp(TEACHER.replace(/\./g, "\\.")) }).click();
  await expect(page.getByText("Накладка", { exact: true })).toBeVisible();
  await expect(page.getByText(`${TEACHER} уже веде пару в МТ-230`)).toBeVisible();

  await teacher.fill("Юнак");
  const free = page.getByRole("button", { name: /Юнак О\.М\./ });
  await expect(free).toContainText("вільний");
  await free.click();
  await expect(page.getByText("Накладка", { exact: true })).toBeHidden();

  await page.getByRole("button", { name: "Додати пару" }).last().click();
  await expect(cell(page, 3, 5)).toContainText(SUBJECT);
});

test("поки семестр — чернетка, студенти його не бачать", async ({ page }) => {
  await page.goto(groupPage);
  await expect(page.getByText("Теорія електричних та магнітних кіл").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText(SUBJECT)).toHaveCount(0);
});

test("публікує семестр — студенти бачать новий розклад", async ({ page }) => {
  await page.goto("/admin/settings");
  page.once("dialog", (d) => d.accept());
  await semesterRow(page, TITLE).getByRole("button", { name: "Опублікувати" }).click();
  await expect(semesterRow(page, TITLE)).toContainText("опубліковано");

  await page.goto(groupPage);
  await expect(page.getByText(SUBJECT).filter({ visible: true }).first()).toBeVisible();
});

test("повертає попередній семестр і видаляє чернетку", async ({ page }) => {
  await page.goto("/admin/settings");
  const old = semesterRow(page, "ІІ семестр 2025/2026");
  page.once("dialog", (d) => d.accept());
  await old.getByRole("button", { name: "Опублікувати" }).click();
  await expect(old).toContainText("опубліковано");

  page.once("dialog", (d) => d.accept());
  await semesterRow(page, TITLE).getByRole("button", { name: "Видалити" }).click();
  await expect(semesterRow(page, TITLE)).toHaveCount(0);

  await page.goto(groupPage);
  await expect(page.getByText(SUBJECT)).toHaveCount(0);
});
