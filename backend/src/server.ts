import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDatabase } from "./database.js";
import { ConnectorService } from "./services/connector-service.js";
import { BankDataSyncService } from "./services/bank-data-sync-service.js";
import { installExtraCaCertificates } from "./security/extra-ca.js";

installExtraCaCertificates();
const config = loadConfig();
const db = createDatabase(config.databaseUrl);
const app = await buildApp({ config, db });
const connectorService = new ConnectorService(db, config);
const bankDataSync = new BankDataSyncService(db, config, config.bankDataSyncHours);
let scheduler: NodeJS.Timeout | undefined;
let bankScheduler: NodeJS.Timeout | undefined;

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, "Shutting down");
  if (scheduler) clearInterval(scheduler);
  if (bankScheduler) clearInterval(bankScheduler);
  await app.close();
  await db.end();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host: config.host, port: config.port });
  const runSchedules = async () => {
    try {
      const result = await connectorService.runDueSchedules();
      if (result.profiles) app.log.info(result, "Scheduled connector profiles processed");
    } catch (error) { app.log.error({ error }, "Scheduled connector check failed"); }
  };
  scheduler = setInterval(() => void runSchedules(), 60_000);
  scheduler.unref();
  setTimeout(() => void runSchedules(), 5_000).unref();
  const runBankDataSync = async () => { try { await bankDataSync.tick(); } catch (error) { app.log.error({ error }, "Bank Data sync check failed"); } };
  if (config.bankDataSyncHours > 0) {
    bankScheduler = setInterval(() => void runBankDataSync(), 10 * 60_000);
    bankScheduler.unref();
    setTimeout(() => void runBankDataSync(), 60_000).unref();
  }
} catch (error) {
  app.log.error(error);
  await db.end();
  process.exit(1);
}
