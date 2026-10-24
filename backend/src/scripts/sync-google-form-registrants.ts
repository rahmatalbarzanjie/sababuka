import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { loadConfig } from "../config.js";
import { createDatabase, type QueryResultRow } from "../database.js";
import { hashToken, randomToken } from "../security/tokens.js";
import { recordAudit } from "../services/audit-service.js";

interface Registrant {
  timestamp?: string;
  email: string;
  full_name: string;
  job_title: string;
  contact_phone: string;
  organization_name: string;
  other_organization?: string;
}

interface OrganizationRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  short_name: string | null;
}

interface ExistingUserRow extends QueryResultRow {
  id: string;
  email: string;
  full_name: string;
  organization_id: string | null;
  organization_code: string | null;
  status: string;
}

const sourceUrl = process.env.REGISTRANTS_SOURCE_URL?.trim();
if (!sourceUrl) throw new Error("REGISTRANTS_SOURCE_URL wajib diatur.");

const outputPath = resolve(process.env.REGISTRANTS_INVITATION_OUTPUT ?? "tmp/google-form-invitations.json");
const config = loadConfig();
const db = createDatabase(config.databaseUrl);

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{M}/gu, "")
    .replace(/\b(kabupaten|kab\.?|dinas|badan)\b/gu, " ")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function normalizePerson(value: string): string {
  return normalize(value)
    .replace(/\b(s kom|st|mt|skm|sh|mh|cfra|cgcae|s sos|mm)\b/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

async function readStdin(): Promise<string> {
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of lines) {
    lines.close();
    return line;
  }
  return "";
}

const input = JSON.parse(await readStdin()) as Registrant[];
if (!Array.isArray(input) || input.length === 0) throw new Error("Input pendaftar harus berupa array JSON yang tidak kosong.");

const organizations = await db.query<OrganizationRow>(
  `SELECT id::text, code, name, short_name
   FROM sababuka.organizations
   WHERE is_active = true AND archived_at IS NULL
     AND organization_type IN ('opd','vertical_agency')`,
);
const organizationIndex = new Map<string, OrganizationRow>();
for (const organization of organizations.rows) {
  organizationIndex.set(normalize(organization.name), organization);
  if (organization.short_name) organizationIndex.set(normalize(organization.short_name), organization);
}

const actor = await db.query<{ id: string } & QueryResultRow>(
  `SELECT u.id::text
   FROM sababuka.users u
   JOIN sababuka.user_role_assignments ura ON ura.user_id=u.id AND ura.ends_at IS NULL
   JOIN sababuka.roles r ON r.id=ura.role_id AND r.code IN ('superadmin','developer')
   WHERE u.status='active' AND u.archived_at IS NULL
   ORDER BY CASE WHEN lower(u.email::text)='developer@sababuka.com' THEN 0 ELSE 1 END
   LIMIT 1`,
);
if (!actor.rows[0]) throw new Error("Akun Developer/Superadmin aktif tidak ditemukan.");

const invitationRecords: Array<Record<string, string>> = [];
const results: Array<Record<string, string>> = [];

try {
  for (const row of input) {
    const email = row.email.trim().toLowerCase();
    const requestedOrganization = row.organization_name.includes("lainnya")
      ? row.other_organization?.trim() ?? ""
      : row.organization_name.trim();
    const organization = organizationIndex.get(normalize(requestedOrganization));
    if (!organization) {
      results.push({ email: maskEmail(email), status: "unresolved_organization", organization: requestedOrganization });
      continue;
    }

    const existing = await db.query<ExistingUserRow>(
      `SELECT u.id::text, lower(u.email::text) AS email, u.full_name, u.status,
              om.organization_id::text, o.code AS organization_code
       FROM sababuka.users u
       LEFT JOIN sababuka.organization_memberships om ON om.user_id=u.id AND om.ends_at IS NULL
       LEFT JOIN sababuka.organizations o ON o.id=om.organization_id
       WHERE u.archived_at IS NULL
         AND (lower(u.email::text)=$1 OR om.organization_id=$2)
       ORDER BY (lower(u.email::text)=$1) DESC, u.created_at`,
      [email, organization.id],
    );
    const emailMatch = existing.rows.find((candidate) => candidate.email === email);
    if (emailMatch) {
      results.push({ email: maskEmail(email), status: "already_registered", organization: emailMatch.organization_code ?? organization.code });
      continue;
    }
    const identityMatch = existing.rows.find((candidate) =>
      candidate.organization_id === organization.id && normalizePerson(candidate.full_name) === normalizePerson(row.full_name),
    );
    if (identityMatch) {
      results.push({ email: maskEmail(email), status: "already_registered_same_person", organization: organization.code });
      continue;
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const user = await client.query<{ id: string } & QueryResultRow>(
        `INSERT INTO sababuka.users (email, full_name, status, mfa_required)
         VALUES ($1,$2,'invited',true)
         ON CONFLICT (email) DO NOTHING
         RETURNING id::text`,
        [email, row.full_name.trim()],
      );
      if (!user.rows[0]) {
        await client.query("ROLLBACK");
        results.push({ email: maskEmail(email), status: "already_registered_race", organization: organization.code });
        continue;
      }
      const userId = user.rows[0].id;
      await client.query(
        `INSERT INTO sababuka.organization_memberships
           (user_id,organization_id,membership_type,is_primary)
         VALUES ($1,$2,'applicant',true)`,
        [userId, organization.id],
      );
      const activePic = existing.rows.find((candidate) =>
        candidate.organization_id === organization.id && ["active", "locked"].includes(candidate.status) && !candidate.email.endsWith("@local.sababuka.test"),
      );
      const requestNote = activePic
        ? `Sinkronisasi Google Form; OPD sudah memiliki PIC aktif. Wajib ditinjau sebagai usulan pergantian PIC. Sumber: ${sourceUrl}`
        : `Sinkronisasi Google Form registrasi SABABUKA. Sumber: ${sourceUrl}`;
      await client.query(
        `INSERT INTO sababuka.user_registration_requests
           (user_id,requested_organization_id,contact_email,contact_phone,job_title,request_note)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [userId, organization.id, email, row.contact_phone.trim(), row.job_title.trim(), requestNote],
      );
      const token = randomToken(32);
      const expiresAt = new Date(Date.now() + config.invitationTtlSeconds * 1000);
      await client.query(
        `INSERT INTO sababuka.user_invitations (user_id,token_hash,expires_at,created_by)
         VALUES ($1,$2,$3,$4)`,
        [userId, hashToken(token), expiresAt, actor.rows[0].id],
      );
      await recordAudit(client, {
        actorId: actor.rows[0].id,
        requestId: randomUUID(),
        ipAddress: null,
        userAgent: "sababuka-google-form-sync",
        eventType: "user.registration_imported",
        entityType: "user",
        entityId: userId,
        organizationId: organization.id,
        afterData: { email, full_name: row.full_name.trim(), organization_code: organization.code, status: "pending" },
        metadata: { source_url: sourceUrl, source_timestamp: row.timestamp ?? null, active_pic_conflict: Boolean(activePic) },
      });
      await client.query("COMMIT");
      invitationRecords.push({
        email,
        full_name: row.full_name.trim(),
        organization_code: organization.code,
        invitation_url: `http://127.0.0.1:5173/activate?token=${encodeURIComponent(token)}`,
        expires_at: expiresAt.toISOString(),
      });
      results.push({
        email: maskEmail(email),
        status: activePic ? "created_pending_pic_conflict" : "created_pending",
        organization: organization.code,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({ source_url: sourceUrl, invitations: invitationRecords }, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ total: input.length, invitation_output: outputPath, results }, null, 2));
} finally {
  await db.end();
}
