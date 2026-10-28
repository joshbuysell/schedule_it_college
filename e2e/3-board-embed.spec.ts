import { BASE_URL, GROUP } from "./env";
import { expect, test } from "./fixtures";

test.describe("Табло для холу", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("під час пари показує, скільки до дзвінка, зміни й вільні аудиторії", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByText(/2 пара · 10:00–11:20/)).toBeVisible();
    await expect(page.getByText("до дзвінка 50 хв")).toBeVisible();

    const changes = page.locator("section", { has: page.getByRole("heading", { name: "Зміни в розкладі" }) });
    await expect(changes).toContainText(GROUP);
    await expect(changes).toContainText("Скасовано");
    await expect(changes).toContainText("Заміна");
    await expect(changes).toContainText("Інша аудиторія");

    await expect(page.getByRole("heading", { name: /Вільні аудиторії на 2 пару/ })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    expect(overflow, "табло має вміщатися в екран без прокручування").toBeLessThanOrEqual(1);
  });

  test("на перерві показує наступну пару", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-28T11:30:00+02:00"));
    await page.goto("/board");
    await expect(page.getByText(/Перерва · 3 пара о 12:00/)).toBeVisible();
  });

  test("ввечері — пари завершено", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-28T19:00:00+02:00"));
    await page.goto("/board");
    await expect(page.getByText("Пари на сьогодні завершено")).toBeVisible();
  });
});

test.describe("Вставка на сайт коледжу", () => {
  // Інше джерело (127.0.0.1 замість localhost) — для браузера це чужий сайт, як itcollege.lviv.ua.
  const college = BASE_URL.replace("localhost", "127.0.0.1") + "/college-test/";

  test("два рядки коду показують розклад і блок змін на чужому сайті", async ({ page }) => {
    // Chrome не пускає «публічну» сторінку до localhost; у реальності обидва сайти публічні.
    await page.context().grantPermissions(["local-network-access"]);
    await page.route(college, (route) =>
      route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: `<!doctype html><meta charset="utf-8"><title>Коледж</title>
          <main style="display:flex;gap:24px">
            <article style="flex:1"><h1>Розклад занять</h1><div id="itc-schedule"></div></article>
            <aside style="width:300px"><div id="itc-changes" data-link="${college}" data-limit="5"></div></aside>
          </main>
          <script src="${BASE_URL}/embed.js" async></script>`,
      }),
    );
    await page.goto(college);

    const schedule = page.frameLocator("#itc-schedule iframe");
    await expect(schedule.getByPlaceholder(/Ваша група або прізвище викладача/)).toBeVisible();

    const widget = page.frameLocator("#itc-changes iframe");
    await expect(widget.getByRole("heading", { name: "Зміни в розкладі" })).toBeVisible();
    await expect(widget.getByText(GROUP).first()).toBeVisible();

    const height = await page.locator("#itc-changes iframe").evaluate((f) => f.getBoundingClientRect().height);
    expect(height, "висота віджета підлаштовується під вміст").toBeGreaterThan(150);

    await widget.getByRole("link", { name: GROUP }).first().click();
    await expect(page).toHaveURL(/#schedule=g/);
    await expect(schedule.getByRole("heading", { name: GROUP }).first()).toBeVisible();
  });
});
