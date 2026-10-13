import { Building2, CheckCircle2, CircleAlert, FileText, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../api";
import { Badge, EmptyState, Notice, PageLoading, PageSizeControl, Pagination, SortableHeader, useAsync, type SortDirection } from "../components";

interface OpdReadiness {
  organization_id: string; organization_code: string; organization_name: string;
  id: string | null; response_json: { pic?: { name?: string; email?: string; whatsapp?: string }; website?: { has_website?: string }; integration?: { api_available?: string }; baseline_items?: unknown[] };
  technical_status: "draft" | "submitted" | "returned" | "verified";
  planning_status: "draft" | "submitted" | "returned" | "verified";
  document_count: number; active_account_count: number; indicator_count: number; issue_count: number;
  issue_names: string[]; focus_names: string[]; updated_at: string | null;
}

const statusLabel = (value: OpdReadiness["technical_status"]) => ({ draft: "Belum dikirim", submitted: "Diperiksa", returned: "Perlu perbaikan", verified: "Terverifikasi" }[value]);
const statusTone = (value: OpdReadiness["technical_status"]) => value === "verified" ? "success" : value === "returned" ? "danger" : value === "submitted" ? "warning" : "neutral";

export function OpdMonitoringPage() {
  const result = useAsync(() => api<{ data: OpdReadiness[] }>("/opd-profiles"), []);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortOrder, setSortOrder] = useState<SortDirection>("desc");
  const rows = useMemo(() => (result.data?.data ?? []).filter((row) => {
    const term = search.trim().toLocaleLowerCase("id");
    const matchesSearch = !term || [row.organization_name, row.organization_code, row.response_json.pic?.name, ...(row.issue_names ?? []), ...(row.focus_names ?? [])].some((value) => value?.toLocaleLowerCase("id").includes(term));
    const matchesFilter = filter === "all" || (filter === "no-account" && !row.active_account_count) || (filter === "no-indicator" && !row.indicator_count) || (filter === "incomplete" && (!row.id || row.technical_status !== "verified" || row.planning_status !== "verified"));
    return matchesSearch && matchesFilter;
  }).sort((left, right) => {
    const values: Record<string, [string | number, string | number]> = {
      organization: [left.organization_name, right.organization_name],
      account: [left.active_account_count, right.active_account_count],
      indicator: [left.indicator_count, right.indicator_count],
      issue: [left.issue_count, right.issue_count],
      status: [`${left.technical_status}-${left.planning_status}`, `${right.technical_status}-${right.planning_status}`],
      updated_at: [left.updated_at ? Date.parse(left.updated_at) : 0, right.updated_at ? Date.parse(right.updated_at) : 0],
    };
    const [leftValue, rightValue] = values[sortBy] ?? values.organization;
    const comparison = typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue), "id");
    return sortOrder === "asc" ? comparison : -comparison;
  }), [result.data, search, filter, sortBy, sortOrder]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const changeSort = (column: string, direction: SortDirection) => { setSortBy(column); setSortOrder(direction); setPage(1); };
  const summary = useMemo(() => {
    const data = result.data?.data ?? [];
    return { total: data.length, registered: data.filter((row) => row.active_account_count > 0).length, mapped: data.filter((row) => row.indicator_count > 0).length, complete: data.filter((row) => row.technical_status === "verified" && row.planning_status === "verified").length };
  }, [result.data]);

  if (result.loading) return <PageLoading label="Memuat kesiapan OPD" />;
  if (result.error || !result.data) return <Notice tone="error">{result.error?.message ?? "Data kesiapan OPD gagal dimuat."}</Notice>;
  return <div className="opd-monitoring-page">
    <section className="readiness-summary">
      <article><Building2 /><span><strong>{summary.total}</strong><small>OPD terdaftar</small></span></article>
      <article><Users /><span><strong>{summary.registered}</strong><small>PIC sudah aktif</small></span></article>
      <article><FileText /><span><strong>{summary.mapped}</strong><small>Memiliki indikator</small></span></article>
      <article><CheckCircle2 /><span><strong>{summary.complete}</strong><small>Profil terverifikasi</small></span></article>
    </section>
    <section className="panel monitoring-intro"><div><span className="eyebrow">Kendali Developer</span><h2>Kesiapan seluruh OPD</h2><p>Pantau akun PIC, pemetaan indikator, kelompok isu, fokus pembangunan, profil sumber, dan dokumen acuan dari satu halaman.</p></div></section>
    <div className="toolbar data-toolbar"><div className="table-filters"><label className="search-box"><Search /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cari OPD, PIC, isu, atau fokus" /></label><select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}><option value="all">Semua OPD</option><option value="no-account">PIC belum aktif</option><option value="no-indicator">Belum ada indikator</option><option value="incomplete">Profil belum lengkap</option></select><PageSizeControl value={pageSize} onChange={(size) => { setPageSize(size); setPage(1); }} /></div></div>
    <section className="panel table-panel">{!rows.length ? <EmptyState title="Tidak ada OPD yang sesuai">Ubah kata pencarian atau filter kesiapan.</EmptyState> : <div className="table-scroll"><table className="opd-monitoring-table"><thead><tr><SortableHeader label="OPD" column="organization" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /><SortableHeader label="PIC/Akun" column="account" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /><SortableHeader label="Relasi RPJMD" column="indicator" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /><SortableHeader label="Isu dan fokus" column="issue" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /><SortableHeader label="Profil sumber" column="updated_at" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.organization_id}><td><div className="identity-cell"><span className="table-icon"><Building2 /></span><span><strong>{row.organization_name}</strong><small>{row.organization_code}</small></span></div></td><td>{row.active_account_count ? <><Badge tone="success">{row.active_account_count} akun aktif</Badge><small className="cell-note">{row.response_json.pic?.name || "PIC profil belum diisi"}</small></> : <><Badge tone="danger">Belum terdaftar</Badge><small className="cell-note">Menunggu pendaftaran PIC</small></>}</td><td><strong>{row.indicator_count} indikator</strong><small className="cell-note">{row.issue_count} kelompok isu · {row.document_count ?? 0} dokumen</small></td><td><div className="topic-list">{(row.focus_names ?? []).slice(0, 2).map((name) => <span key={name}>{name}</span>)}{!(row.focus_names ?? []).length && <span className="empty-topic"><CircleAlert />Belum dipetakan</span>}</div><small className="cell-note">{(row.issue_names ?? []).slice(0, 3).join(" · ") || "Belum ada kelompok isu"}</small></td><td><div className="dual-status"><Badge tone={statusTone(row.technical_status)}>Teknis: {statusLabel(row.technical_status)}</Badge><Badge tone={statusTone(row.planning_status)}>Substansi: {statusLabel(row.planning_status)}</Badge></div><small className="cell-note">{row.updated_at ? `Diperbarui ${new Date(row.updated_at).toLocaleDateString("id-ID")}` : "Belum pernah diisi"}</small></td></tr>)}</tbody></table></div>}{rows.length > 0 && <Pagination page={Math.min(page, totalPages)} pageSize={pageSize} totalItems={rows.length} totalPages={totalPages} sortLabel={`${sortBy === "updated_at" ? "Terakhir diperbarui" : sortBy === "organization" ? "Nama OPD" : sortBy === "account" ? "Jumlah akun" : sortBy === "indicator" ? "Jumlah indikator" : sortBy === "issue" ? "Jumlah isu" : "Status profil"} ${sortBy === "updated_at" ? (sortOrder === "desc" ? "terbaru" : "terlama") : (sortOrder === "asc" ? "menaik" : "menurun")}`} onChange={setPage} showPageSize={false} />}</section>
  </div>;
}
