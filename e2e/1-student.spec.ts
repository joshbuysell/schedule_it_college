import { accessible, expect, noHorizontalScroll, test } from "./fixtures";
import { GROUP } from "./env";

test.describe("Студент", () => {
  test("вперше відкриває сайт: підказка, пошук без перемикання розкладки, «моя група»", async ({ page }) => {
    await page.goto("/");
    const hint = page.getByRole("region", { name: "Як почати" });
    await expect(hint).toBeVisible();

    await page.getByRole("combobox", { name: "Пошук розкладу" }).fill("rs-21");
    await page.getByRole("button", { name: new RegExp(`^${GROUP}`) }).click();
    await expect(page).toHaveURL(new RegExp(`/group/${encodeURIComponent(GROUP)}$`));
    await expect(page.getByRole("heading", { level: 1 })).toContainText(GROUP);
    await expect(page.getByText("Теорія електричних та магнітних кіл").filter({ visible: true }).first()).toBeVisible();
    await noHorizontalScroll(page);

    await page.getByRole("button", { name: "Зробити моєю групою" }).click();
    await expect(page.getByRole("button", { name: "Моя група" })).toBeVisible();

    await page.goto("/");
    await expect(hint).toBeHidden();
    const card = page.locator("section", { has: page.getByRole("heading", { name: `Моя група ${GROUP}` }) });
    await expect(card.getByText("2 пара")).toBeVisible();
    await expect(card.getByText("зараз", { exact: true })).toBeVisible();
    await expect(card.getByText("Теорія електричних та магнітних кіл")).toBeVisible();
    await noHorizontalScroll(page);
  });

  test("закриває підказку назавжди", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Зрозуміло, більше не показувати" }).click();
    await page.reload();
    await expect(page.getByRole("region", { name: "Як почати" })).toBeHidden();
  });

  test("знаходить викладача за прізвищем латиницею", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("combobox", { name: "Пошук розкладу" }).fill("kubyk");
    await page.getByRole("button", { name: /Кубик Лілія Ярославівна/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Кубик");
    await expect(page.getByText("Алгоритми і методи обчислень").filter({ visible: true }).first()).toBeVisible();
  });

  test("незнайома група — зрозуміла сторінка 404", async ({ page }) => {
    const res = await page.goto("/group/ХХ-99");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Сторінку не знайдено" })).toBeVisible();
  });

  test("сповіщення: пояснення, що робити на цьому пристрої", async ({ page, isMobile }) => {
    await page.goto(`/group/${encodeURIComponent(GROUP)}`);
    await page.getByRole("button", { name: "Сповіщення" }).click();
    const panel = page.getByText(/На iPhone сповіщення працюють із головного екрана|Щоранку перед парами|не підтримує сповіщення|заблоковано в браузері/).first();
    await expect(panel).toBeVisible();
    if (isMobile) {
      const box = await panel.boundingBox();
      const vw = page.viewportSize()!.width;
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(vw);
    }
  });

  test("панель сповіщень закривається дотиком поза нею та клавішею Esc", async ({ page, isMobile }) => {
    await page.goto(`/group/${encodeURIComponent(GROUP)}`);
    const button = page.getByRole("button", { name: "Сповіщення" });
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const outside = page.getByRole("heading", { level: 1 });
    if (isMobile) await outside.tap();
    else await outside.click();
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await button.click();
    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });

  test("на телефоні над розкладом лише потрібні студенту кнопки", async ({ page, isMobile }) => {
    test.skip(!isMobile, "лише для телефона");
    await page.goto(`/group/${encodeURIComponent(GROUP)}`);
    await expect(page.getByRole("button", { name: "Друк" })).toBeHidden();
    await expect(page.getByRole("link", { name: "QR для аудиторії" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Сповіщення" })).toBeVisible();
  });

  test("підписка на календар віддає коректний iCalendar", async ({ page, request }) => {
    await page.goto(`/group/${encodeURIComponent(GROUP)}`);
    await page.getByRole("button", { name: "У календар" }).click();
    const download = page.getByRole("link", { name: /Завантажити/ });
    await expect(download).toBeVisible();
    const res = await request.get((await download.getAttribute("href"))!);
    expect(res.headers()["content-type"]).toContain("text/calendar");
    const ics = (await res.text()).replace(/\r\n[ \t]/g, "");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("Теорія електричних та магнітних кіл");
  });

  test("вільні аудиторії й довідка відкриваються без помилок", async ({ page }) => {
    await page.goto("/rooms");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await noHorizontalScroll(page);
    await page.goto("/help");
    await page.getByRole("link", { name: "Сповіщення на iPhone" }).click();
    await expect(page.getByRole("heading", { name: "Сповіщення на iPhone" })).toBeInViewport();
    await noHorizontalScroll(page);
  });

  test("публічні сторінки доступні для екранних читалок", async ({ page }) => {
    for (const path of ["/", `/group/${encodeURIComponent(GROUP)}`, "/teachers", "/rooms", "/help"]) {
      await page.goto(path);
      await test.step(path, () => accessible(page));
    }
  });
});
