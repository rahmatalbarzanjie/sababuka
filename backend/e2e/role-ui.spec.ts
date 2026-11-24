import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const screenshotDir = resolve(import.meta.dirname, "../../.impeccable");
const sessionId = "8cded9b3-e081-4fa1-8d0b-cfabf2948bb9";
const indicatorId = "ee17b958-2a7e-48d8-b8ea-67dd573d39d2";

mkdirSync(screenshotDir, { recursive: true });

function monitorBrowser(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function mockBupati(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    let body: unknown;
    if (path === "/api/v1/me") body = {
      id: "9a29f9f2-b1bd-4368-b3f7-87c250b0c83b",
      email: "bupati@sababuka.com",
      full_name: "Bupati Kapuas",
      mfa_required: false,
      must_change_password: false,
      roles: [{ code: "pimpinan", scope_type: "published", organization_id: null }],
      permissions: ["assistant.use"],
      organizations: [],
    };
    else if (path === "/api/v1/me/menu") body = { data: [{ code: "assistant", label: "Tanya Sababuka", icon: "message-circle", route_name: "/assistant", navigation_disabled: false, display_order: 1, children: [] }] };
    else if (path === "/api/v1/assistant/briefing") body = { date: "2026-11-24", items: [
      { key: "perhatian", tone: "warn", title: "Tingkat Kemiskinan perlu dicermati", detail: "5,48 % pada 2025, +1,2% dari tahun sebelumnya.", question: "Bagaimana tren Tingkat Kemiskinan?", read: false },
      { key: "target", tone: "bad", title: "8 indikator belum mencapai target", detail: "14 tercapai, 46 masih menunggu realisasi.", question: "Indikator apa yang belum mencapai target?", read: false },
      { key: "opd", tone: "info", title: "3 OPD perlu pembinaan", detail: "Bapperida (skor 6) dan DKPP (skor 7).", question: "Bagaimana kondisi dan perkembangan OPD di Kapuas?", read: false },
    ] };
    else if (path === "/api/v1/assistant/sessions" && request.method() === "GET") body = { data: [
      { id: sessionId, title: "Perkembangan kemiskinan Kapuas", status: "active", started_at: "2026-11-20T08:00:00.000Z", updated_at: "2026-11-21T03:00:00.000Z", message_count: 2 },
      { id: "6c508554-1990-45f9-8b02-194acbde69e8", title: "Prioritas pembangunan kecamatan", status: "active", started_at: "2026-11-19T08:00:00.000Z", updated_at: "2026-11-19T09:00:00.000Z", message_count: 4 },
    ] };
    else if (path === `/api/v1/assistant/sessions/${sessionId}`) body = {
      id: sessionId,
      title: "Perkembangan kemiskinan Kapuas",
      status: "active",
      started_at: "2026-11-20T08:00:00.000Z",
      updated_at: "2026-11-21T03:00:00.000Z",
      message_count: 2,
      messages: [
        { id: "50efb536-3792-44ee-9810-086804cdeefa", role: "user", content: "Bagaimana perkembangan kemiskinan di Kapuas?", created_at: "2026-11-21T02:59:00.000Z" },
        { id: "89fc5982-a374-4d45-8ebd-3290f297e3ec", role: "assistant", content: "Persentase penduduk miskin menurun dari **5,64 persen pada 2023** menjadi **5,21 persen pada 2025**. Penurunan sebesar 0,43 poin persentase menunjukkan perbaikan, tetapi perhatian tetap diperlukan pada kecamatan dengan capaian terendah.", created_at: "2026-11-21T03:00:00.000Z", answer: {
          message_id: "89fc5982-a374-4d45-8ebd-3290f297e3ec",
          answer: "Persentase penduduk miskin menurun dari **5,64 persen pada 2023** menjadi **5,21 persen pada 2025**. Penurunan sebesar 0,43 poin persentase menunjukkan perbaikan, tetapi perhatian tetap diperlukan pada kecamatan dengan capaian terendah.",
          sufficiency: "sufficient",
          citations: [{ publication_item_id: "publikasi-1", label: "Persentase Penduduk Miskin", indicator: "Persentase Penduduk Miskin", period: "2023-2025", organization: "BAPPERIDA Kabupaten Kapuas", source: "Pelaporan RPJMD" }],
          visuals: [{ kind: "trend", title: "Tren penduduk miskin", unit: "persen", points: [{ year: 2023, value: 5.64 }, { year: 2024, value: 5.4 }, { year: 2025, value: 5.21 }] }],
          suggestions: ["Kecamatan mana yang perlu diprioritaskan?"],
        } },
      ],
    };
    else body = { data: [] };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

async function mockBps(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    let body: unknown;
    if (path === "/api/v1/me") body = {
      id: "e0cba949-563c-4cf1-87ce-fab6900cddf5",
      email: "bps@sababuka.com",
      full_name: "Pembina Data BPS",
      mfa_required: false,
      must_change_password: false,
      roles: [{ code: "pembina_statistik", scope_type: "global", organization_id: null }],
      permissions: ["bank_data.view", "bank_data.note"],
      organizations: [],
    };
    else if (path === "/api/v1/me/menu") body = { data: [{ code: "bank-data", label: "Bank Data", icon: "database", route_name: "/dashboard/bank-data", navigation_disabled: false, display_order: 1, children: [] }] };
    else if (path === "/api/v1/executive/bank-data") body = {
      generated_at: "2026-11-21T03:00:00.000Z",
      summary: { series: 126, observations: 1842, with_districts: 38, max_districts: 17, sectors: 12, bps: 94, satudata: 32, first_year: 1990, last_year: 2026 },
      items: [{ indicator_id: indicatorId, code: "BPS-KAPUAS-001", name: "Jumlah Penduduk Menurut Kecamatan", sector: "Kependudukan", source_kind: "bps", unit: "jiwa", source_name: "BPS Kapuas dalam Angka", first_year: 2021, last_year: 2025, years: 5, observations: 85, districts: 17, latest_value: 423210, latest_year: 2025 }],
    };
    else if (path === `/api/v1/bank-data/${indicatorId}/guidance`) body = { data: [{ id: "87be9e4d-dcbe-4531-9e02-08089418615a", guidance_type: "metadata", notes: "Definisi operasional perlu mencantumkan sumber proyeksi penduduk.", snapshot_json: {}, created_at: "2026-11-20T03:00:00.000Z", created_by_name: "Pembina Data BPS", resolved_at: null, resolution_notes: null, resolved_by_name: null, status: "open" }] };
    else body = { data: [] };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

test("Tanya Sababuka nyaman dipakai Bupati pada desktop dan ponsel", async ({ page }) => {
  const errors = monitorBrowser(page);
  await mockBupati(page);
  await page.goto("/assistant");
  await expect(page.getByRole("heading", { name: /Bapak Bupati./u })).toBeVisible();
  await expect(page.getByRole("button", { name: /8 indikator belum mencapai target/u })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Pantauan Bupati" })).toBeAttached();
  await expect(page.getByRole("complementary", { name: "Riwayat Tanya Sababuka" })).toBeVisible();
  await page.getByRole("button", { name: /Perkembangan kemiskinan Kapuas/u }).click();
  await expect(page.getByText(/Persentase penduduk miskin menurun/u)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: resolve(screenshotDir, "chat-bupati-desktop.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Buka riwayat chat" })).toBeVisible();
  await page.getByRole("button", { name: "Buka riwayat chat" }).click();
  await expect(page.getByRole("complementary", { name: "Riwayat Tanya Sababuka" })).toHaveClass(/open/u);
  await page.screenshot({ path: resolve(screenshotDir, "chat-bupati-mobile.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("BPS hanya memantau Bank Data dan membuat catatan pembinaan", async ({ page }) => {
  const errors = monitorBrowser(page);
  await mockBps(page);
  await page.goto("/dashboard/bank-data");
  await expect(page.getByRole("heading", { name: "Seluruh data yang tersimpan" })).toBeVisible();
  await page.getByRole("button", { name: "Buka", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Catatan pembinaan baru" })).toBeVisible();
  await expect(page.getByText("Catatan pembinaan tidak mengubah nilai.")).toBeVisible();
  await page.screenshot({ path: resolve(screenshotDir, "bank-data-bps-desktop.png"), fullPage: true });
  expect(errors).toEqual([]);
});
