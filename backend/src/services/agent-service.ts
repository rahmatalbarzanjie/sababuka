import type { Database } from "../database.js";
import type { AppConfig } from "../config.js";
import { matchInsights, opdScoreboard, tokenize, type AssistantReply, type Visual } from "./assistant-intents.js";
import { InsightService, type Insight } from "./insight-service.js";
import { LlmService, ungroundedNumbers, type ToolDefinition } from "./llm-service.js";

export const AGENT_SYSTEM_PROMPT = `Anda adalah Sababuka, asisten data resmi untuk Bupati dan pimpinan Kabupaten Kapuas, Kalimantan Tengah.
Ruang lingkup: HANYA hal yang berkaitan dengan Kabupaten Kapuas (kondisi, data, tren, kecamatan, OPD, kebijakan daerah) yang dapat dijawab dari data yang tersimpan di Sababuka. Jika pertanyaan di luar itu (daerah lain, topik umum, pemrograman, hiburan, dan sejenisnya), tolak dengan sopan dalam satu kalimat dan tawarkan topik Kapuas yang bisa Anda bantu.
Cara kerja:
1. Selalu gunakan alat untuk mengambil data. Jangan menjawab angka dari ingatan atau perkiraan.
2. Cari indikator dengan beberapa kata kunci berbeda bila hasil pertama kurang pas. Untuk pertanyaan yang melibatkan beberapa indikator, panggil alat untuk masing-masing.
3. Gunakan angka persis seperti pada hasil alat. Jangan menghitung sendiri persentase, selisih, atau rata-rata yang tidak disediakan alat.
4. Jika data tidak ada atau tidak cukup, katakan terus terang apa yang tidak tersedia, jangan mengarang.
5. Jawab dalam bahasa Indonesia yang jelas dan ringkas (biasanya di bawah 180 kata): kesimpulan dulu, lalu angka kunci, OPD penanggung jawab, kecamatan yang menonjol, dan satu-dua tindak lanjut konkret untuk Bupati.
6. Bila jawaban bersandar pada data berstatus "Bank Data (belum diverifikasi)", sebutkan singkat bahwa data itu belum diverifikasi OPD/BAPPERIDA. Peringkat OPD hanyalah arah perubahan indikator, bukan penilaian kinerja resmi.
7. Jangan menyebut nama alat, "JSON", atau istilah teknis sistem. Jangan memakai tabel.`;

export const AGENT_TOOLS: ToolDefinition[] = [
  { name: "cari_indikator", description: "Mencari indikator di Bank Data Sababuka (RPJMD, BPS/Kapuas dalam Angka, Satu Data) berdasarkan kata kunci nama atau tema. Mengembalikan daftar indikator dengan id, nilai terbaru, dan OPD.", input_schema: { type: "object", properties: { kata_kunci: { type: "string", description: "mis. 'kemiskinan', 'produksi padi', 'melek huruf'" }, sumber: { type: "string", enum: ["rpjmd", "bps", "satudata"], description: "opsional: batasi sumber" }, batas: { type: "integer", minimum: 1, maximum: 10 } }, required: ["kata_kunci"] } },
  { name: "ambil_tren", description: "Mengambil riwayat tahunan satu indikator beserta analisis tren: perubahan tahun terakhir, laju rata-rata, arah (naik/turun/stabil), penilaian, anomali, OPD penanggung jawab, dan saran.", input_schema: { type: "object", properties: { indikator_id: { type: "string" } }, required: ["indikator_id"] } },
  { name: "ambil_kecamatan", description: "Mengambil nilai satu indikator per kecamatan pada tahun terbaru beserta perubahan dari tahun sebelumnya, tertinggi, terendah, dan kesenjangan.", input_schema: { type: "object", properties: { indikator_id: { type: "string" } }, required: ["indikator_id"] } },
  { name: "skor_opd", description: "Peringkat OPD berdasarkan arah perubahan indikator yang menjadi tanggung jawabnya (jumlah membaik dan memburuk). Bukan penilaian kinerja resmi.", input_schema: { type: "object", properties: {} } },
  { name: "indikator_opd", description: "Daftar indikator di bawah tanggung jawab satu OPD, diurutkan dari yang paling perlu perhatian.", input_schema: { type: "object", properties: { nama_opd: { type: "string", description: "sebagian nama OPD, mis. 'Pendidikan'" }, batas: { type: "integer", minimum: 1, maximum: 15 } }, required: ["nama_opd"] } },
  { name: "perubahan_terbesar", description: "Indikator dengan perubahan paling menonjol: yang memburuk, membaik, naik, turun, atau anomali.", input_schema: { type: "object", properties: { jenis: { type: "string", enum: ["memburuk", "membaik", "naik", "turun", "anomali"] }, sumber: { type: "string", enum: ["rpjmd", "bps", "satudata"] }, batas: { type: "integer", minimum: 1, maximum: 10 } }, required: ["jenis"] } },
  { name: "ringkasan_umum", description: "Gambaran umum: jumlah indikator yang dianalisis, berapa yang membaik/memburuk/anomali, dan indikator paling perlu perhatian.", input_schema: { type: "object", properties: {} } },
];

const num = (value: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
const pct = (value: number | null) => value === null ? null : `${value > 0 ? "+" : ""}${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value)}%`;
const statusData = (insight: Insight) => insight.source_kind === "rpjmd" ? "RPJMD (indikator resmi)" : "Bank Data (belum diverifikasi)";

const brief = (insight: Insight) => ({
  indikator_id: insight.indicator_id, nama: insight.name, kategori: insight.category.replace(/^Bank Data · /u, ""), sumber: insight.source_label, status_data: statusData(insight),
  satuan: insight.unit, tahun_terbaru: insight.latest_year, nilai_terbaru: num(insight.latest_value), perubahan: pct(insight.change_pct), tren: insight.trend, penilaian: insight.assessment, opd: insight.opds,
});

export interface AgentRun { answer: string; visuals: Visual[]; sources: AssistantReply["sources"]; toolsUsed: string[]; model: string }

export class AgentService {
  constructor(private readonly db: Database, private readonly config?: AppConfig) {}

  execute(name: string, input: Record<string, unknown>, insights: Insight[]): { result: unknown; focus?: Insight; visual?: Visual } {
    const text = (key: string) => String(input[key] ?? "").trim();
    const limit = (fallback: number, max: number) => Math.min(max, Math.max(1, Number(input.batas) || fallback));
    const byId = (id: string) => insights.find((item) => item.indicator_id === id);
    switch (name) {
      case "cari_indikator": {
        const pool = input.sumber ? insights.filter((item) => item.source_kind === input.sumber) : insights;
        const query = text("kata_kunci");
        let found = matchInsights(tokenize(query), pool, limit(6, 10)).map((entry) => entry.insight);
        if (!found.length) found = pool.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())).slice(0, limit(6, 10));
        return { result: found.length ? { jumlah: found.length, indikator: found.map(brief) } : { jumlah: 0, catatan: "Tidak ada indikator yang cocok. Coba kata kunci lain." } };
      }
      case "ambil_tren": {
        const insight = byId(text("indikator_id"));
        if (!insight) return { result: { galat: "Indikator tidak ditemukan." } };
        return {
          focus: insight, visual: { kind: "trend", title: insight.name, unit: insight.unit, points: insight.series },
          result: { ...brief(insight), riwayat: insight.series.map((point) => ({ tahun: point.year, nilai: num(point.value) })), laju_rata_rata_per_tahun: pct(insight.analysis.cagr_pct), rangkaian: insight.analysis.streak.direction ? `${insight.analysis.streak.direction} ${insight.analysis.streak.length} tahun berturut-turut` : null, anomali: insight.analysis.anomaly?.is_anomaly ?? false, ringkasan: insight.headline, rincian: insight.detail, saran: insight.recommendation, arah_baik_diperkirakan: insight.direction_inferred },
        };
      }
      case "ambil_kecamatan": {
        const insight = byId(text("indikator_id"));
        if (!insight) return { result: { galat: "Indikator tidak ditemukan." } };
        if (!insight.district_latest) return { result: { galat: "Indikator ini tidak punya data per kecamatan.", ...brief(insight) } };
        const items = insight.district_latest.items.slice().sort((a, b) => b.value - a.value);
        return {
          focus: insight, visual: { kind: "districts", title: `${insight.name} per kecamatan (${insight.district_latest.year})`, unit: insight.unit, year: insight.district_latest.year, items: items.map((item) => ({ name: item.name, value: item.value })) },
          result: { indikator: insight.name, satuan: insight.unit, tahun: insight.district_latest.year, kecamatan: items.map((item) => ({ nama: item.name, nilai: num(item.value), perubahan: item.previous ? pct(((item.value - item.previous) / Math.abs(item.previous)) * 100) : null })), kesenjangan_tertinggi_terhadap_terendah: insight.districts?.spread_ratio ? `${insight.districts.spread_ratio}x` : null, opd: insight.opds },
        };
      }
      case "skor_opd": {
        const board = opdScoreboard(insights).filter((entry) => entry.assessable > 0).sort((a, b) => (b.score ?? -999) - (a.score ?? -999));
        return {
          visual: { kind: "districts", title: "Skor perbaikan indikator per OPD", unit: "", items: board.filter((entry) => entry.score !== null).slice(0, 8).map((entry) => ({ name: entry.name.replace(/^Dinas |^Badan /u, ""), value: entry.score! })) },
          result: { catatan: "Skor = (membaik - memburuk) / indikator yang arahnya jelas, dalam persen. Hanya OPD dengan minimal 3 indikator ber-arah yang diberi skor.", opd: board.slice(0, 20).map((entry) => ({ nama: entry.name, indikator_total: entry.total, membaik: entry.membaik, memburuk: entry.memburuk, skor: entry.score })) },
        };
      }
      case "indikator_opd": {
        const needle = text("nama_opd").toLowerCase();
        const list = insights.filter((item) => item.opds.some((opd) => opd.toLowerCase().includes(needle))).sort((a, b) => b.score - a.score).slice(0, limit(8, 15));
        return { result: list.length ? { jumlah: list.length, indikator: list.map(brief) } : { jumlah: 0, catatan: "Tidak ada OPD dengan nama itu." } };
      }
      case "perubahan_terbesar": {
        const kind = text("jenis");
        let pool = input.sumber ? insights.filter((item) => item.source_kind === input.sumber) : insights;
        pool = pool.filter((item) => kind === "anomali" ? item.analysis.anomaly?.is_anomaly : kind === "memburuk" || kind === "membaik" ? item.assessment === kind : item.trend === kind);
        return { result: { jenis: kind, jumlah_total: pool.length, indikator: pool.sort((a, b) => b.score - a.score).slice(0, limit(5, 10)).map(brief) } };
      }
      case "ringkasan_umum": {
        const attention = insights.filter((item) => item.assessment === "memburuk" || item.analysis.anomaly?.is_anomaly).sort((a, b) => b.score - a.score).slice(0, 5);
        return { result: { indikator_dianalisis: insights.length, membaik: insights.filter((item) => item.assessment === "membaik").length, memburuk: insights.filter((item) => item.assessment === "memburuk").length, anomali: insights.filter((item) => item.analysis.anomaly?.is_anomaly).length, paling_perlu_perhatian: attention.map(brief) } };
      }
      default: return { result: { galat: "Alat tidak dikenal." } };
    }
  }

  /** Jalankan percakapan beralat. Mengembalikan null bila model tidak tersedia atau jawaban tidak lolos pemeriksaan angka. */
  async run(question: string, history: Array<{ role: "user" | "assistant"; content: string }>): Promise<AgentRun | null> {
    const llm = new LlmService(this.db, this.config);
    if (!(await llm.available())) return null;
    const insights = await new InsightService(this.db).all();
    const messages: Array<{ role: "user" | "assistant"; content: unknown }> = [...history.slice(-6), { role: "user", content: question }];
    const evidence: string[] = [question];
    const visuals: Visual[] = []; const focus: Insight[] = []; const toolsUsed: string[] = [];
    let corrected = false;
    for (let step = 0; step < 7; step += 1) {
      const reply = await llm.converse(AGENT_SYSTEM_PROMPT, messages, AGENT_TOOLS, 900);
      if (reply.stop_reason === "tool_use") {
        const calls = reply.content.filter((block) => block.type === "tool_use");
        messages.push({ role: "assistant", content: reply.content });
        const results = calls.map((call) => {
          const outcome = this.execute(String(call.name), (call.input ?? {}) as Record<string, unknown>, insights);
          toolsUsed.push(String(call.name));
          if (outcome.visual && visuals.length < 3 && !visuals.some((visual) => visual.title === outcome.visual!.title)) visuals.push(outcome.visual);
          if (outcome.focus && !focus.includes(outcome.focus)) focus.push(outcome.focus);
          const json = JSON.stringify(outcome.result).slice(0, 9000);
          evidence.push(json);
          return { type: "tool_result", tool_use_id: call.id, content: json };
        });
        messages.push({ role: "user", content: results });
        continue;
      }
      const answer = reply.content.filter((block) => block.type === "text").map((block) => String(block.text ?? "")).join("").trim();
      if (!answer) return null;
      const bad = ungroundedNumbers(answer, evidence.join(" "));
      if (bad.length && !corrected) {
        corrected = true;
        messages.push({ role: "assistant", content: answer });
        messages.push({ role: "user", content: `Angka berikut tidak ada pada hasil data: ${bad.join(", ")}. Tulis ulang jawaban hanya dengan angka yang tertulis pada hasil data (tanpa menghitung sendiri). Jika angka itu memang diperlukan tetapi tidak tersedia, katakan datanya tidak ada.` });
        continue;
      }
      if (bad.length) return null;
      return { answer, visuals, toolsUsed, model: llm.modelName(), sources: focus.slice(0, 4).map((item) => ({ label: `${item.name} · ${item.latest_year}`, indicator: item.name, year: item.latest_year, source: item.source_label })) };
    }
    return null;
  }
}
