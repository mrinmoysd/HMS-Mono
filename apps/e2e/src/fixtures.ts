import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';
import { CONSOLE_IGNORE, storageStateFor, type Role } from './config';

export interface PageError {
  kind: 'console' | 'pageerror' | 'http';
  text: string;
}

/** Attaches console/pageerror/5xx listeners and returns the collected list. */
export function watchForErrors(page: Page): PageError[] {
  const errors: PageError[] = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (CONSOLE_IGNORE.some((re) => re.test(text))) return;
    errors.push({ kind: 'console', text });
  });

  page.on('pageerror', (err) => {
    errors.push({ kind: 'pageerror', text: `${err.name}: ${err.message}` });
  });

  page.on('response', (res) => {
    if (res.status() < 500) return;
    errors.push({ kind: 'http', text: `${res.status()} ${res.request().method()} ${res.url()}` });
  });

  return errors;
}

export function formatErrors(errors: PageError[]): string {
  return errors.map((e) => `  [${e.kind}] ${e.text}`).join('\n');
}

type Fixtures = {
  /** Errors observed on the default `page` for the whole test. */
  pageErrors: PageError[];
  /** Open a fresh, authenticated page as any seeded role. */
  asRole: (role: Role) => Promise<{ page: Page; context: BrowserContext; errors: PageError[] }>;
};

export const test = base.extend<Fixtures>({
  pageErrors: async ({ page }, use) => {
    const errors = watchForErrors(page);
    await use(errors);
  },

  asRole: async ({ browser }, use) => {
    const opened: BrowserContext[] = [];

    await use(async (role: Role) => {
      const context = await browser.newContext({ storageState: storageStateFor(role) });
      opened.push(context);
      const page = await context.newPage();
      const errors = watchForErrors(page);
      return { page, context, errors };
    });

    for (const c of opened) await c.close();
  },
});

export { expect };

/**
 * The app's `Field` component renders `<label>` without `htmlFor`, and the inputs
 * carry no `id`, so `getByLabel()` cannot be used. This walks from the label text
 * to the control inside the same field wrapper instead.
 */
export function fieldControl(page: Page, label: string, kind: 'input' | 'textarea' | 'select' = 'input') {
  return page
    .locator('div')
    .filter({ has: page.locator(`> label:text-is("${label}")`) })
    .last()
    .locator(kind)
    .first();
}

/** Fill a labelled text field inside an open FormDrawer. */
export async function fillField(page: Page, label: string, value: string): Promise<void> {
  await fieldControl(page, label).fill(value);
}

/** Choose an option in a labelled `<select>`. */
export async function selectField(page: Page, label: string, value: string): Promise<void> {
  await fieldControl(page, label, 'select').selectOption(value);
}

/** Pick a patient through the searchable PatientSelect widget. */
export async function pickPatient(page: Page, query: string): Promise<string> {
  const search = page.getByPlaceholder('Search by name, phone, or patient no…');
  await search.fill(query);
  const firstResult = page.locator('button', { hasText: query }).first();
  await firstResult.waitFor({ state: 'visible', timeout: 10_000 });
  const label = (await firstResult.innerText()).trim();
  await firstResult.click();
  return label;
}

/** The DataTable's shared search box. */
export function tableSearch(page: Page) {
  return page.getByPlaceholder('Search…');
}

/** Unique-ish suffix so repeated runs don't collide on the seeded DB. */
export function unique(prefix = 'E2E'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
}

/** Today / offset date as YYYY-MM-DD. */
export function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Assert a page rendered its heading and produced no runtime errors. */
export async function expectCleanPage(page: Page, heading: string | RegExp, errors: PageError[]): Promise<void> {
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
  expect(errors, `Runtime errors on ${page.url()}:\n${formatErrors(errors)}`).toEqual([]);
}
