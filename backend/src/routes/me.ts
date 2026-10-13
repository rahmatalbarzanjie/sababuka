import type { FastifyInstance } from "fastify";
import { ApiError } from "../errors.js";
import { authService, requireSuperadmin } from "../plugins/authentication.js";

export async function currentUserRoutes(app: FastifyInstance): Promise<void> {
  app.get("/me", async (request) => {
    if (!request.auth) throw new ApiError(401, "AUTH_REQUIRED", "Sesi diperlukan.");
    return request.auth.user;
  });

  app.get("/me/menu", async (request) => {
    if (!request.auth) throw new ApiError(401, "AUTH_REQUIRED", "Sesi diperlukan.");
    return { data: request.auth.user.simulation?.active
      ? await authService(request).getMenuForRoles(request.auth.user.roles.map((role) => role.code))
      : await authService(request).getMenu(request.auth.user.id) };
  });

  app.get("/me/announcement", async (request) => {
    if (!request.auth) throw new ApiError(401, "AUTH_REQUIRED", "Sesi diperlukan.");
    const result = await app.db.query<{ value: unknown; updated_at: Date }>(
      `SELECT value, updated_at FROM sababuka.system_settings
       WHERE key = 'dashboard.login_announcement' AND is_secret = false
       LIMIT 1`,
    );
    const row = result.rows[0];
    const value = row?.value;
    if (!value || typeof value !== "object" || Array.isArray(value)) return { enabled: false };
    const input = value as Record<string, unknown>;
    const text = (key: string, max: number) => typeof input[key] === "string" ? input[key].trim().slice(0, max) : "";
    const safeUrl = (raw: string): string | null => {
      if (!raw) return null;
      if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
      try {
        const parsed = new URL(raw);
        return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
      } catch { return null; }
    };
    const title = text("title", 120);
    const message = text("message", 2_000);
    const imageUrl = safeUrl(text("image_url", 1_000));
    const actionUrl = safeUrl(text("action_url", 1_000));
    if (input.enabled !== true || !title || !message) return { enabled: false };
    return {
      enabled: true,
      title,
      message,
      image_url: imageUrl,
      action_label: actionUrl ? text("action_label", 80) || "Buka informasi" : null,
      action_url: actionUrl,
      updated_at: row.updated_at,
    };
  });

  app.get("/me/preview-options", async (request) => {
    requireSuperadmin(request);
    const result = await app.db.query(
      `SELECT id::text, code, name, short_name FROM sababuka.organizations
       WHERE is_active = true AND archived_at IS NULL AND organization_type = 'opd'
       ORDER BY name, code`,
    );
    return { organizations: result.rows };
  });
}
