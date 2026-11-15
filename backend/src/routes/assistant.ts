import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireCsrf, requirePermission, requireSuperadmin } from "../plugins/authentication.js";
import { LlmService } from "../services/llm-service.js";
import { requestAuditContext } from "../request-context.js";
import { AssistantService } from "../services/assistant-service.js";
const uuid = { type: "string", format: "uuid" } as const;
const service = (request: FastifyRequest) => new AssistantService(request.server.db, request.server.config);
const llm = (request: FastifyRequest) => new LlmService(request.server.db, request.server.config);
export async function assistantRoutes(app: FastifyInstance) {
  app.post<{ Body?: { title?: string } }>("/assistant/sessions", { schema: { body: { type: "object", additionalProperties: false, properties: { title: { type: "string", maxLength: 255 } } } } }, async (request, reply) => { requireCsrf(request); requirePermission(request, "assistant.use"); return reply.code(201).send(await service(request).createSession(request.auth!, request.body?.title?.trim() || null, requestAuditContext(request))); });
  app.post<{ Params: { session_id: string }; Body: { message: string } }>("/assistant/sessions/:session_id/messages", { schema: { params: { type: "object", additionalProperties: false, required: ["session_id"], properties: { session_id: uuid } }, body: { type: "object", additionalProperties: false, required: ["message"], properties: { message: { type: "string", minLength: 2, maxLength: 4000 } } } } }, async (request) => { requireCsrf(request); requirePermission(request, "assistant.use"); return service(request).ask(request.auth!, request.params.session_id, request.body.message.trim(), requestAuditContext(request)); });
  app.get("/assistant/llm", async (request) => { requireSuperadmin(request); return llm(request).status(); });
  app.put<{ Body: { api_key: string } }>("/assistant/llm", { schema: { body: { type: "object", additionalProperties: false, required: ["api_key"], properties: { api_key: { type: "string", minLength: 20, maxLength: 400 } } } } }, async (request) => { requireCsrf(request); requireSuperadmin(request); return llm(request).save(request.auth!, request.body.api_key, requestAuditContext(request)); });
  app.delete("/assistant/llm", async (request) => { requireCsrf(request); requireSuperadmin(request); return llm(request).clear(requestAuditContext(request)); });
}
