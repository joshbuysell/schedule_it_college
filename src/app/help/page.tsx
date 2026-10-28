import Link from "next/link";
import type { Metadata } from "next";
import { Bell, CalendarPlus, Search, Smartphone, Star } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = { title: "Довідка", description: "Як користуватися розкладом: студентам, викладачам і навчальній частині." };

const SECTIONS = [
  { id: "students", label: "Студентам" },
  { id: "iphone", label: "Сповіщення на iPhone" },
  { id: "teachers", label: "Викладачам" },
  { id: "staff", label: "Навчальній частині" },
  { id: "faq", label: "Питання" },
];

function Step({ n, icon: Icon, title, children }: { n: number; icon: typeof Search; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
        <Icon className="size-4.5" aria-hidden />
      </span>
      <div>
        <p className="font-semibold">
          {n}. {title}
        </p>
        <div className="mt-0.5 text-ink-2">{children}</div>
      </div>
    </li>
  );
}

function Badge({ tone, children }: { tone: "accent" | "danger" | "brand"; children: React.ReactNode }) {
  const cls = { accent: "border-accent/50 text-accent", danger: "border-danger/50 text-danger", brand: "border-brand/40 text-brand" }[tone];
  return <span className={`rounded border px-1.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export default function HelpPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Довідка</h1>
        <p className="mt-2 max-w-2xl text-ink-2">Як знайти свій розклад, дізнаватися про заміни й подавати заявки.</p>

        <div className="mt-8 grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
          <nav aria-label="Розділи довідки" className="lg:sticky lg:top-20 lg:self-start">
            <ul className="flex flex-wrap gap-2 text-sm lg:flex-col lg:gap-1">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-md border border-line px-3 py-1.5 hover:border-brand hover:text-brand lg:border-0 lg:px-2">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="max-w-3xl space-y-14 [&_h2]:scroll-mt-20 [&_h2]:text-2xl [&_h2]:font-semibold">
            <section>
              <h2 id="students">Студентам</h2>
              <ol className="mt-5 space-y-5">
                <Step n={1} icon={Search} title="Знайдіть свою групу">
                  Почніть вводити назву в пошуку на <Link href="/" className="text-brand underline underline-offset-2 hover:no-underline">головній</Link>: «КІ-21», «ки21» чи навіть «rb21» в
                  англійській розкладці — система зрозуміє. Так само шукаються викладачі й аудиторії.
                </Step>
                <Step n={2} icon={Star} title="Зробіть її своєю">
                  На сторінці групи натисніть «Зробити моєю групою». Тепер на головній одразу видно пари на сьогодні з урахуванням замін.
                </Step>
                <Step n={3} icon={Bell} title="Увімкніть сповіщення">
                  Кнопка «Сповіщення» на сторінці групи: коли навчальна частина змінить пару, на телефон прийде повідомлення. За бажання — щоранку
                  розклад на день.
                </Step>
                <Step n={4} icon={CalendarPlus} title="Або додайте в календар">
                  «У календар» підписує Google чи Apple Календар на розклад групи. Він оновлюється сам, заміни теж зʼявляються там.
                </Step>
                <Step n={5} icon={Smartphone} title="Встановіть як застосунок">
                  На Android: меню браузера → «Додати на головний екран». На iPhone: «Поділитися» → «На початковий екран». Розклад відкриватиметься
                  як звичайний застосунок і працюватиме навіть без інтернету.
                </Step>
              </ol>

              <h3 className="mt-8 font-semibold">Як читати розклад</h3>
              <ul className="mt-2 space-y-2 text-ink-2">
                <li>
                  <b className="text-ink">Чисельник і знаменник</b> чергуються щотижня. Сайт сам показує поточний тиждень, а в суботу й неділю — наступний.
                </li>
                <li>
                  <b className="text-ink">Підгрупи.</b> Перемикач «Уся група / 1 підгрупа / 2 підгрупа» над сіткою ховає чужі пари.
                </li>
                <li>
                  <b className="text-ink">Позначки:</b> <Badge tone="accent">заміна</Badge> — пару змінено на цю дату, <Badge tone="danger">скасовано</Badge> —
                  пари не буде, <Badge tone="brand">зараз</Badge> — пара, що йде просто зараз.
                </li>
                <li>
                  <b className="text-ink">Вільні аудиторії</b> для самостійної роботи — на сторінці <Link href="/rooms" className="text-brand underline underline-offset-2 hover:no-underline">«Аудиторії»</Link>.
                </li>
              </ul>
            </section>

            <section>
              <h2 id="iphone">Сповіщення на iPhone</h2>
              <p className="mt-3 text-ink-2">Apple дозволяє сповіщення від сайтів лише з головного екрана (iOS 16.4 і новіші):</p>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-ink-2">
                <li>Відкрийте розклад у Safari.</li>
                <li>
                  Натисніть «Поділитися» (квадрат зі стрілкою; на iOS 26 — у меню «⋯» поруч з адресою) → «На початковий екран» → «Додати». Якщо пункту
                  не видно, він під «Показати більше».
                </li>
                <li>Відкрийте розклад зі значка «Розклад ІТК» на головному екрані.</li>
                <li>Знайдіть свою групу й знову натисніть «Зробити моєю групою»: застосунок на головному екрані не бачить налаштувань із Safari.</li>
                <li>Натисніть «Сповіщення» → «Увімкнути» → «Дозволити».</li>
              </ol>
              <p className="mt-3 text-ink-2">На Android і компʼютері достатньо натиснути «Сповіщення» прямо в браузері.</p>
            </section>

            <section>
              <h2 id="teachers">Викладачам</h2>
              <p className="mt-3 text-ink-2">
                Свій розклад можна знайти пошуком за прізвищем — так само, як групу. Для заявок потрібен кабінет: логін і пароль видає навчальна частина.
              </p>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink-2">
                <li>
                  Увійдіть на <Link href="/cabinet" className="text-brand underline underline-offset-2 hover:no-underline">сторінці кабінету</Link>. Відкриються ваші пари на два тижні вперед.
                </li>
                <li>Виберіть день, а потім потрібну пару.</li>
                <li>
                  Оберіть дію: <b className="text-ink">«Інша аудиторія»</b>, <b className="text-ink">«Потрібна заміна»</b> чи{" "}
                  <b className="text-ink">«Скасувати пару»</b> — і додайте коментар.
                </li>
                <li>
                  Якщо вас не буде цілий день — кнопка <b className="text-ink">«Мене не буде цього дня»</b>. Навчальна частина побачить усі ваші пари й
                  призначить заміни.
                </li>
              </ol>
              <p className="mt-3 text-ink-2">
                Стан заявок видно в розділі «Мої заявки». Увімкніть «Сповіщення» в кабінеті — і дізнаватиметеся про рішення одразу. Студенти побачать
                зміну, щойно навчальна частина її підтвердить.
              </p>
            </section>

            <section>
              <h2 id="staff">Навчальній частині</h2>
              <ul className="mt-3 space-y-3 text-ink-2">
                <li>
                  <b className="text-ink">Новий семестр.</b> Налаштування → Семестри → «Новий семестр» (заняття можна скопіювати з попереднього). Поки семестр не
                  активний, він — чернетка: студенти бачать старий розклад.
                </li>
                <li>
                  <b className="text-ink">Заповнення.</b> Редактор → клітинка групи й пари → дисципліна, викладач, аудиторія. Підказки показують, хто
                  вільний, а групи з накладками позначені червоним. Можна завантажити весь розклад з Excel: Звіти → Імпорт (є шаблон).
                </li>
                <li>
                  <b className="text-ink">Заміни.</b> Розділ «Заміни» — на конкретну дату, основний розклад не змінюється. Заявки викладачів
                  зʼявляються там же з лічильником у меню.
                </li>
                <li>
                  <b className="text-ink">Друк і плакати.</b> Огляд → «Друк розкладу» (офіційний формат із грифом «Затверджую») і QR-плакати для дверей
                  аудиторій.
                </li>
                <li>
                  <b className="text-ink">Табло для холу.</b> Відкрийте <Link href="/board" className="text-brand underline underline-offset-2 hover:no-underline">/board</Link> на телевізорі біля
                  входу й натисніть «На весь екран».
                </li>
                <li>
                  <b className="text-ink">Викладачі.</b> Користувачі → «Створити доступи для всіх викладачів» — система згенерує логіни й паролі, які можна одразу
                  роздрукувати.
                </li>
              </ul>
            </section>

            <section>
              <h2 id="faq">Питання</h2>
              <dl className="mt-3 space-y-4">
                {[
                  ["Розклад на сайті відрізняється від паперового?", "Сайт показує актуальний розклад разом із замінами на дату. Якщо бачите помилку — зверніться до навчальної частини."],
                  ["Сповіщення не приходять", "Перевірте, що сповіщення для сайту дозволені в налаштуваннях браузера чи телефона. На iPhone розклад має бути відкритий з головного екрана, а дозвіл перевіряється в Параметрах → Сповіщення → Розклад ІТК."],
                  ["Чи потрібна реєстрація студентам?", "Ні. Усе працює без входу, а «моя група» запамʼятовується на вашому пристрої."],
                  ["Чи збираються мої дані?", "Ні. Для сповіщень зберігається лише технічна адреса браузера та вибрана група. Вимкнути можна тією ж кнопкою."],
                ].map(([q, a]) => (
                  <div key={q}>
                    <dt className="font-semibold">{q}</dt>
                    <dd className="mt-0.5 text-ink-2">{a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
