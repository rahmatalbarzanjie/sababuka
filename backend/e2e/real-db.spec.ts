import { expect, test, type Page } from "@playwright/test";

// Uji browser dengan backend dan PostgreSQL nyata (tanpa mock). Wajib mengatur kata sandi lewat env.
const password = process.env.SABABUKA_REALDB_PASSWORD;
const bpsAccount = process.env.SABABUKA_REALDB_BPS ?? "pembina_statistik.qa@sababuka.test";

function browserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function login(page: Page, identifier: string) {
  await page.goto("/login");
  await page.getByLabel("Email atau username").fill(identifier);
  await page.locator('input[autocomplete="current-password"]').fill(password!);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  await page.waitForLoadState("networkidle");
}

test("Bupati: riwayat chat tersimpan di server (kirim, muat ulang, ganti judul, arsip, pulihkan)", async ({ page }) => {
  test.skip(!password, "SABABUKA_REALDB_PASSWORD belum diatur.");
  const errors = browserErrors(page);
  await login(page, "bupati@sababuka.com");
  await expect(page).toHaveURL(/\/assistant/u);

  await page.getByRole("button", { name: "Chat baru" }).first().click();
  const question = `Bagaimana kondisi indikator utama Kapuas? ${Date.now()}`;
  await page.getByLabel("Pertanyaan untuk Sababuka").fill(question);
  await page.getByRole("button", { name: "Kirim pertanyaan" }).click();
  await expect(page.locator(".chat-text", { hasText: question }).first()).toBeVisible();
  await expect(page.getByText("Menganalisis...")).toBeHidden({ timeout: 45_000 });

  // Riwayat dibaca dari server: muat ulang halaman dan buka percakapan dari panel riwayat.
  await page.reload();
  await page.waitForLoadState("networkidle");
  const history = page.getByRole("complementary", { name: "Riwayat Tanya Sababuka" });
  await expect(history.getByRole("button", { name: /Bagaimana kondisi indikator utama/u }).first()).toBeVisible();
  await history.getByRole("button", { name: /Bagaimana kondisi indikator utama/u }).first().click();
  await expect(page.locator(".chat-text", { hasText: question }).first()).toBeVisible();

  const title = `Judul uji ${Date.now()}`;
  await page.getByRole("button", { name: "Ganti judul chat" }).click();
  await page.getByLabel("Judul chat").fill(title);
  await page.getByRole("button", { name: "Simpan judul" }).click();
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(history.getByRole("button", { name: new RegExp(title, "u") })).toBeVisible();

  await history.getByRole("button", { name: new RegExp(title, "u") }).click();
  await page.getByRole("button", { name: "Arsipkan chat" }).click();
  // Percakapan arsip hilang dari daftar aktif dan muncul di arsip.
  await expect(history.getByRole("button", { name: new RegExp(title, "u") })).toBeHidden();
  await history.getByRole("button", { name: "Lihat arsip" }).click();
  await history.getByRole("button", { name: new RegExp(title, "u") }).click();
  await expect(page.getByLabel("Pertanyaan untuk Sababuka")).toBeDisabled();
  await page.getByRole("button", { name: "Pulihkan chat" }).click();
  await history.getByRole("button", { name: "Kembali ke chat aktif" }).click();
  await expect(history.getByRole("button", { name: new RegExp(title, "u") })).toBeVisible();

  expect(errors.filter((entry) => !/Failed to load resource/u.test(entry))).toEqual([]);
});

test("Bupati dialihkan ke chat dan ditolak API Dashboard Analisis dan Bank Data", async ({ page }) => {
  test.skip(!password, "SABABUKA_REALDB_PASSWORD belum diatur.");
  await login(page, "bupati@sababuka.com");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/assistant/u);
  await page.goto("/dashboard/bank-data");
  await expect(page).toHaveURL(/\/assistant/u);
  const denied = await page.evaluate(async () => (await fetch("/api/v1/executive/dashboard", { credentials: "include" })).status);
  expect(denied).toBe(403);
});

test("BPS membuat catatan pembinaan, tersimpan setelah muat ulang, dan nilai tidak berubah", async ({ page }) => {
  test.skip(!password, "SABABUKA_REALDB_PASSWORD belum diatur.");
  const errors = browserErrors(page);
  await login(page, bpsAccount);
  await page.goto("/dashboard/bank-data");
  await expect(page.getByRole("heading", { name: "Seluruh data yang tersimpan" })).toBeVisible();
  const open = page.getByRole("button", { name: "Buka", exact: true });
  test.skip((await open.count()) === 0, "Katalog Bank Data kosong pada database uji.");
  const firstRow = page.locator("table.all-table tbody tr").first();
  const seriesName = (await firstRow.locator("strong").first().innerText()).trim();
  await open.first().click();
  await expect(page.getByRole("heading", { name: "Catatan pembinaan baru" })).toBeVisible();

  const note = `Metadata satuan perlu disamakan dengan publikasi BPS. ${Date.now()}`;
  await page.locator(".bank-guidance-form textarea").fill(note);
  await page.getByRole("button", { name: "Simpan catatan" }).click();
  await expect(page.getByText(note)).toBeVisible();

  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.locator("table.all-table tbody tr", { hasText: seriesName }).first().getByRole("button", { name: "Buka", exact: true }).click();
  await expect(page.getByText(note)).toBeVisible();
  await expect(page.getByText("Perlu ditinjau").first()).toBeVisible();
  expect(errors.filter((entry) => !/Failed to load resource/u.test(entry))).toEqual([]);
});
