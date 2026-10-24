import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/me", (route) => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Sesi tidak ditemukan." } }),
  }));
});

test("halaman terlindungi mengarahkan pengguna yang belum login ke form masuk", async ({ page }) => {
  await page.goto("/admin/users");

  await expect(page).toHaveURL(/\/login$/u);
  await expect(page.getByRole("heading", { name: "Masuk ke SABABUKA" })).toBeVisible();
  await expect(page.getByLabel("Email atau username")).toBeVisible();
  await expect(page.locator('input[autocomplete="current-password"]')).toBeVisible();
});

test("form login menampilkan kesalahan autentikasi yang bisa dipahami", async ({ page }) => {
  await page.route("**/api/v1/auth/login", (route) => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ error: { code: "INVALID_CREDENTIALS", message: "Email/username atau kata sandi tidak sesuai." } }),
  }));

  await page.goto("/login");
  await page.getByLabel("Email atau username").fill("uji@sababuka.test");
  await page.locator('input[autocomplete="current-password"]').fill("bukan-kredensial-asli");
  await page.getByRole("button", { name: "Masuk" }).click();

  await expect(page.getByText("Email/username atau kata sandi tidak sesuai.")).toBeVisible();
});
