import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireCsrf, requirePermission } from "../plugins/authentication.js";
import { requestAuditContext } from "../request-context.js";
import { BankDataGuidanceService, type GuidanceType } from "../services/bank-data-guidance-service.js";

const uuid = { type: "string", format: "uuid" } as const;
const service = (request: FastifyRequest) => new BankDataGuidanceService(request.server.db);

export async function bankDataGuidanceRoutes(app: FastifyInstance) {
  app.get<{ Params: { indicator_id: string } }>("/bank-data/:indicator_id/guidance", { schema: { params: { type: "object", additionalProperties: false, required: ["indicator_id"], properties: { indicator_id: uuid } } } }, async (request) => { requirePermission(request, "bank_data.view"); return service(request).list(request.params.indicator_id); });
  app.post<{ Params: { indicator_id: string }; Body: { guidance_type: GuidanceType; notes: string } }>(
    "/bank-data/:indicator_id/guidance",
    {
      schema: {
        params: { type: "object", additionalProperties: false, required: ["indicator_id"], properties: { indicator_id: uuid } },
        body: {
          type: "object", additionalProperties: false, required: ["guidance_type", "notes"],
          properties: { guidance_type: { type: "string", enum: ["standar", "metadata", "metodologi", "konsistensi"] }, notes: { type: "string", minLength: 10, maxLength: 4000 } },
        },
      },
    },
    async (request, reply) => {
      requireCsrf(request); requirePermission(request, "bank_data.note");
      return reply.code(201).send(await service(request).create(request.auth!, request.params.indicator_id, request.body, requestAuditContext(request)));
    },
  );
  app.post<{ Params: { note_id: string }; Body: { resolution_notes: string } }>(
    "/bank-data/guidance/:note_id/resolve",
    {
      schema: {
        params: { type: "object", additionalProperties: false, required: ["note_id"], properties: { note_id: uuid } },
        body: { type: "object", additionalProperties: false, required: ["resolution_notes"], properties: { resolution_notes: { type: "string", minLength: 10, maxLength: 4000 } } },
      },
    },
    async (request) => {
      requireCsrf(request); requirePermission(request, "bank_data.resolve_note");
      return service(request).resolve(request.auth!, request.params.note_id, request.body.resolution_notes, requestAuditContext(request));
    },
  );
}
