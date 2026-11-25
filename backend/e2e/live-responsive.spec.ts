import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const captureDir = resolve(import.meta.dirname, "../../.impeccable/live-local");
const bupatiPassword = process.env.SABABUKA_BUPATI_PASSWORD;
const developerPassword = process.env.SABABUKA_DEVELOPER_PASSWORD;

mkdirSync(captureDir, { recursive: true });

function browserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function login(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email atau username").fill(identifier);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForLoadState("networkidle");
}

async function expectNoHorizontalOverflow(page: Page) {
  const measurements = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    offenders: [...document.querySelectorAll<HTMLElement>("body *")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName.toLowerCase(), className: element.className, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
      })
      .filter((entry) => entry.right > document.documentElement.clientWidth + 1 || entry.left < -1 || entry.width > document.documentElement.clientWidth + 1)
      .slice(0, 12),
  }));
  expect(measurements.document, JSON.stringify(measurements)).toBeLessThanOrEqual(measurements.viewport + 1);
  expect(measurements.body, JSON.stringify(measurements)).toBeLessThanOrEqual(measurements.viewport + 1);
}

test("Bupati: layout percakapan responsif pada desktop, tablet, dan ponsel", async ({ page }) => {
  test.skip(!bupatiPassword, "SABABUKA_BUPATI_PASSWORD belum diatur.");
  const errors = browserErrors(page);

  await page.setViewportSize({ width: 1440, height: 1024 });
  await login(page, "bupati@sababuka.com", bupatiPassword!);
  errors.length = 0;
  await expect(page).toHaveURL(/\/assistant$/u);
  await expect(page.getByRole("region", { name: "Percakapan Tanya Sababuka" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: resolve(captureDir, "bupati-desktop-1440.png"), fullPage: true });

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(250);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: resolve(captureDir, "bupati-tablet-1024.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await expectNoHorizontalOverflow(page);
  await expect(page.getByRole("button", { name: "Buka riwayat chat" })).toBeVisible();
  await page.screenshot({ path: resolve(captureDir, "bupati-mobile-390.png"), fullPage: true });
  await page.getByRole("button", { name: "Buka riwayat chat" }).click();
  await expect(page.getByRole("complementary", { name: "Riwayat Tanya Sababuka" })).toHaveClass(/open/u);
  await page.waitForTimeout(250);
  const historyBox = await page.getByRole("complementary", { name: "Riwayat Tanya Sababuka" }).boundingBox();
  const historyTitleBox = await page.getByText("Riwayat chat", { exact: true }).boundingBox();
  const newChatBox = await page.getByRole("button", { name: "Percakapan baru", exact: true }).boundingBox();
  expect(historyBox?.x).toBeGreaterThanOrEqual(0);
  expect(historyTitleBox?.x).toBeGreaterThanOrEqual(12);
  expect(newChatBox?.x).toBeGreaterThanOrEqual(12);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: resolve(captureDir, "bupati-mobile-390-drawer.png") });
  await page.getByRole("button", { name: "Tutup riwayat", exact: true }).click();

  await page.setViewportSize({ width: 320, height: 720 });
  await page.waitForTimeout(250);
  await expectNoHorizontalOverflow(page);
  await expect(page.getByLabel("Pertanyaan untuk Sababuka")).toBeVisible();
  await page.screenshot({ path: resolve(captureDir, "bupati-mobile-320.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("Developer: permukaan kerja dan pratinjau lintas peran tetap rapi", async ({ page }) => {
  test.skip(!developerPassword, "SABABUKA_DEVELOPER_PASSWORD belum diatur.");
  const errors = browserErrors(page);
  await page.setViewportSize({ width: 1440, height: 1024 });
  await login(page, "developer@sababuka.com", developerPassword!);
  errors.length = 0;
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: resolve(captureDir, "developer-desktop-1440.png"), fullPage: true });

  await page.getByRole("button", { name: /Developer SABABUKA/u }).click();
  await page.getByRole("button", { name: "Pembina Statistik BPS", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/dashboard\/bank-data$/u);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: resolve(captureDir, "bps-desktop-1440.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: resolve(captureDir, "bps-mobile-390.png"), fullPage: true });
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Kembali ke Developer", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/u);
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.getByRole("button", { name: /Developer SABABUKA/u }).click();
  await page.getByRole("button", { name: "BAPPERIDA", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/operations$/u);
  await page.getByRole("button", { name: "Dashboard Analisis", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/dashboard$/u);
  await expect(page.getByText("Anda tidak memiliki hak akses untuk membuka halaman ini.")).toHaveCount(0);
  await expect(page.locator(".page-state-loading")).toHaveCount(0, { timeout: 15_000 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: resolve(captureDir, "bapperida-dashboard-desktop-1440.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: resolve(captureDir, "bapperida-dashboard-mobile-390.png"), fullPage: true });

  await page.getByRole("button", { name: "Kembali ke Developer", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/u);
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.getByRole("button", { name: /Developer SABABUKA/u }).click();
  await page.getByLabel("Pratinjau OPD").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Masuk sebagai OPD terpilih", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/operations$/u);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: resolve(captureDir, "opd-desktop-1440.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: resolve(captureDir, "opd-mobile-390.png"), fullPage: true });
  expect(errors).toEqual([]);
});
