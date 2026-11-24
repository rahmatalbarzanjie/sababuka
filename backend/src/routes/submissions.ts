import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireCsrf, requirePermission } from "../plugins/authentication.js";
import { requestAuditContext } from "../request-context.js";
import { SubmissionService, type ObservationInput } from "../services/submission-service.js";

const uuid = { type: "string", format: "uuid" } as const;
const service = (request: FastifyRequest) => new SubmissionService(request.server.db);
const mutate = (request: FastifyRequest, permission: string) => { requireCsrf(request); requirePermission(request, permission); };

export async function submissionRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { organization_id: string } }>("/submissions/available-periods", {
    schema: { querystring: { type: "object", additionalProperties: false, required: ["organization_id"], properties: { organization_id: uuid } } },
  }, async (request) => {
    requirePermission(request,"submission.view");
    return service(request).availablePeriods(request.auth!,request.query.organization_id);
  });

  app.get<{ Querystring: { page?: number; page_size?: number; organization_id?: string; period_id?: string; status?: string; sort_by?: string; sort_order?: "asc" | "desc" } }>("/submissions", {
    schema: { querystring: { type: "object", additionalProperties: false, properties: {
      page: { type: "integer", minimum: 1 }, page_size: { type: "integer", minimum: 1, maximum: 100 },
      organization_id: uuid, period_id: uuid,
      status: { type: "string", enum: ["draft", "submitted", "under_review", "returned", "approved"] },
      sort_by: { type: "string", enum: ["updated_at", "organization", "period", "row_count", "status"] },
      sort_order: { type: "string", enum: ["asc", "desc"] },
    } } },
  }, async (request) => {
    requirePermission(request, "submission.view");
    return service(request).list(request.auth!, { page: request.query.page ?? 1, pageSize: request.query.page_size ?? 25,
      organizationId: request.query.organization_id, periodId: request.query.period_id, status: request.query.status,
      sortBy: request.query.sort_by, sortOrder: request.query.sort_order });
  });

  app.post<{ Body: { organization_id: string; period_id: string } }>("/submissions", {
    schema: { body: { type: "object", additionalProperties: false, required: ["organization_id", "period_id"],
      properties: { organization_id: uuid, period_id: uuid } } },
  }, async (request, reply) => {
    mutate(request, "submission.create");
    return reply.code(201).send(await service(request).create(request.auth!, request.body, requestAuditContext(request)));
  });

  app.get<{ Params: { submission_id: string } }>("/submissions/:submission_id", {
    schema: { params: { type: "object", additionalProperties: false, required: ["submission_id"], properties: { submission_id: uuid } } },
  }, async (request) => {
    requirePermission(request, "submission.view"); return service(request).get(request.auth!, request.params.submission_id);
  });

  app.put<{ Params: { submission_id: string; indicator_version_id: string }; Body: ObservationInput }>(
    "/submissions/:submission_id/observations/:indicator_version_id",
    { schema: {
      params: { type: "object", additionalProperties: false, required: ["submission_id", "indicator_version_id"], properties: { submission_id: uuid, indicator_version_id: uuid } },
      body: { type: "object", additionalProperties: false, required: ["value"], properties: {
        value: { anyOf: [{ type: "number" }, { type: "string", minLength: 1, maxLength: 4000 }] },
        notes: { type: ["string", "null"], maxLength: 4000 },
      } },
    } },
    async (request) => {
      mutate(request, "submission.update");
      return service(request).saveObservation(request.auth!, request.params.submission_id, request.params.indicator_version_id,
        request.body, requestAuditContext(request));
    },
  );

  app.post<{ Params: { submission_id: string; action: "submit" | "start-review" | "return" | "approve" | "reopen" }; Body?: { notes?: string | null; indicator_version_ids?: string[] } }>(
    "/submissions/:submission_id/actions/:action",
    { schema: {
      params: { type: "object", additionalProperties: false, required: ["submission_id", "action"], properties: {
        submission_id: uuid, action: { type: "string", enum: ["submit", "start-review", "return", "approve", "reopen"] },
      } },
      body: { type: "object", additionalProperties: false, properties: { notes: { type: ["string", "null"], maxLength: 4000 },
        indicator_version_ids: { type: "array", items: uuid, minItems: 1, maxItems: 200 } } },
    } },
    async (request) => {
      const permissions = { submit: "submission.submit", "start-review": "submission.review", return: "submission.return", approve: "submission.approve", reopen: "submission.return" } as const;
      mutate(request, permissions[request.params.action]);
      if (request.params.action === "reopen" && request.body?.indicator_version_ids?.length) {
        return service(request).reopenIndicators(request.auth!, request.params.submission_id, request.body.indicator_version_ids,
          request.body.notes ?? null, requestAuditContext(request));
      }
      return service(request).transition(request.auth!, request.params.submission_id, request.params.action,
        request.body?.notes ?? null, requestAuditContext(request));
    },
  );

  app.get<{ Params: { submission_id: string } }>("/submissions/:submission_id/guidance", {
    schema: { params: { type: "object", additionalProperties: false, required: ["submission_id"], properties: { submission_id: uuid } } },
  }, async (request) => {
    requirePermission(request, "submission.view");
    return service(request).listGuidance(request.auth!, request.params.submission_id);
  });

  app.post<{ Params: { submission_id: string }; Body: { indicator_version_id?: string | null; guidance_type: "standard" | "metadata" | "methodology" | "consistency"; notes: string } }>("/submissions/:submission_id/guidance", {
    schema: {
      params: { type: "object", additionalProperties: false, required: ["submission_id"], properties: { submission_id: uuid } },
      body: { type: "object", additionalProperties: false, required: ["guidance_type", "notes"], properties: {
        indicator_version_id: { anyOf: [uuid, { type: "null" }] },
        guidance_type: { type: "string", enum: ["standard", "metadata", "methodology", "consistency"] },
        notes: { type: "string", minLength: 3, maxLength: 4000 },
      } },
    },
  }, async (request, reply) => {
    mutate(request, "statistical_guidance.comment");
    return reply.code(201).send(await service(request).addGuidance(request.auth!, request.params.submission_id, request.body, requestAuditContext(request)));
  });

  app.post<{ Params: { submission_id: string; guidance_id: string }; Body?: { notes?: string | null } }>("/submissions/:submission_id/guidance/:guidance_id/resolve", {
    schema: {
      params: { type: "object", additionalProperties: false, required: ["submission_id", "guidance_id"], properties: { submission_id: uuid, guidance_id: uuid } },
      body: { type: "object", additionalProperties: false, properties: { notes: { type: ["string", "null"], maxLength: 4000 } } },
    },
  }, async (request) => {
    mutate(request, "submission.update");
    return service(request).resolveGuidance(request.auth!, request.params.submission_id, request.params.guidance_id, request.body?.notes ?? null, requestAuditContext(request));
  });
}
