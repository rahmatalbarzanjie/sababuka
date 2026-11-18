import { lazy, Suspense, useEffect } from "react";
import { AuthProvider, useAuth } from "./auth";
import { LoadingScreen, Notice, PageLoading } from "./components";
import { AdminLayout, NotFoundPage } from "./layout/AdminLayout";
import { usePageTitleOverride } from "./pageTitle";
import { navigate, usePathname } from "./router";

const RolesPage = lazy(() => import("./pages/AccessPages").then((module) => ({ default: module.RolesPage })));
const MenusPage = lazy(() => import("./pages/AccessPages").then((module) => ({ default: module.MenusPage })));
const InvitationPage = lazy(() => import("./pages/AuthPages").then((module) => ({ default: module.InvitationPage })));
const LoginPage = lazy(() => import("./pages/AuthPages").then((module) => ({ default: module.LoginPage })));
const PasswordSetupPage = lazy(() => import("./pages/AuthPages").then((module) => ({ default: module.PasswordSetupPage })));
const RegistrationPage = lazy(() => import("./pages/AuthPages").then((module) => ({ default: module.RegistrationPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const OrganizationsPage = lazy(() => import("./pages/OrganizationsPage").then((module) => ({ default: module.OrganizationsPage })));
const SecurityPage = lazy(() => import("./pages/SystemPage").then((module) => ({ default: module.SecurityPage })));
const SystemPage = lazy(() => import("./pages/SystemPage").then((module) => ({ default: module.SystemPage })));
const UsersPage = lazy(() => import("./pages/UsersPage").then((module) => ({ default: module.UsersPage })));
const CategoriesPage = lazy(() => import("./pages/GovernancePages").then((module) => ({ default: module.CategoriesPage })));
const IndicatorsPage = lazy(() => import("./pages/GovernancePages").then((module) => ({ default: module.IndicatorsPage })));
const SubmissionsPage = lazy(() => import("./pages/SubmissionPages").then((module) => ({ default: module.SubmissionsPage })));
const PublicationsPage = lazy(() => import("./pages/PublicationsPage").then((module) => ({ default: module.PublicationsPage })));
const AssistantPage = lazy(() => import("./pages/AssistantPage").then((module) => ({ default: module.AssistantPage })));
const AuditPage = lazy(() => import("./pages/MonitoringPages").then((module) => ({ default: module.AuditPage })));
const NotificationsPage = lazy(() => import("./pages/MonitoringPages").then((module) => ({ default: module.NotificationsPage })));
const OperationsPage = lazy(() => import("./pages/OperationsPage").then((module) => ({ default: module.OperationsPage })));
const ConsolidationPage = lazy(() => import("./pages/ConsolidationPage").then((module) => ({ default: module.ConsolidationPage })));
const ConnectorsPage = lazy(() => import("./pages/ConnectorsPage").then((module) => ({ default: module.ConnectorsPage })));
const DatasetPage = lazy(() => import("./pages/DatasetPage").then((module) => ({ default: module.DatasetPage })));
const AnalysisPage = lazy(() => import("./pages/DecisionPages").then((module) => ({ default: module.AnalysisPage })));
const BankDataPage = lazy(() => import("./pages/BankDataPage").then((module) => ({ default: module.BankDataPage })));
const IndicatorDetailPage = lazy(() => import("./pages/IndicatorDetailPage").then((module) => ({ default: module.IndicatorDetailPage })));
const BerandaPage = lazy(() => import("./pages/BerandaPage").then((module) => ({ default: module.BerandaPage })));
const OpdProfilePage = lazy(() => import("./pages/OpdProfilePage").then((module) => ({ default: module.OpdProfilePage })));
const OpdMonitoringPage = lazy(() => import("./pages/OpdMonitoringPage").then((module) => ({ default: module.OpdMonitoringPage })));

const pageMeta: Record<string, { title: string; subtitle: string; permission?: string }> = {
  "/admin": { title: "Dashboard Sistem", subtitle: "Kesehatan layanan dan pekerjaan administrasi yang perlu ditindaklanjuti.", permission: "system.configure" },
  "/dashboard": { title: "Dashboard Eksekutif", subtitle: "Kondisi, tren, dan sebaran wilayah Kabupaten Kapuas untuk pengambilan keputusan.", permission: "executive_dashboard.view" },
  "/dashboard/bank-data": { title: "Bank Data Kapuas", subtitle: "Seluruh seri BPS dan Satu Data yang tersimpan, dapat dicari, ditelusuri, dan diunduh.", permission: "executive_dashboard.view" },
  "/dashboard/indikator": { title: "Detail Indikator", subtitle: "Grafik, tabulasi data, analisis, tindak lanjut, dan sumber satu indikator.", permission: "executive_dashboard.view" },
  "/assistant": { title: "Tanya Sababuka", subtitle: "Tanyakan data, tren, dan tindak lanjut; jawaban dihitung dari data resmi.", permission: "assistant.use" },
  "/analysis": { title: "Analisis Indikator", subtitle: "Baca tren, konsistensi sumber, dan rekomendasi keputusan per indikator. Peta kecamatan ada di Dashboard Eksekutif.", permission: "executive_dashboard.view" },
  "/notifications": { title: "Notifikasi", subtitle: "Pembaruan kategori, indikator, verifikasi OPD, pengiriman, dan publikasi." },
  "/audit": { title: "Audit Aktivitas", subtitle: "Jejak perubahan permanen sesuai lingkup organisasi.", permission: "audit.view" },
  "/operations": { title: "Beranda Tugas", subtitle: "Lihat pekerjaan yang perlu diselesaikan sesuai peran dan kewenangan Anda.", permission: "submission.view" },
  "/admin/organizations": { title: "Organisasi dan OPD", subtitle: "Kelola struktur organisasi yang menjadi lingkup pengguna dan pemilik data.", permission: "organization.view" },
  "/admin/opd-monitoring": { title: "Kesiapan OPD", subtitle: "Pantau PIC, indikator, kelompok isu, fokus pembangunan, dan profil sumber setiap OPD.", permission: "organization.view" },
  "/admin/users": { title: "Pengguna", subtitle: "Verifikasi pendaftaran, pantau status akun, dan tetapkan peran sesuai tugas.", permission: "user.view" },
  "/admin/roles": { title: "Peran dan Hak Akses", subtitle: "Atur kewenangan setiap peran dengan prinsip akses minimum.", permission: "role.view" },
  "/admin/menus": { title: "Pengaturan Menu", subtitle: "Tentukan menu yang tampil untuk setiap peran.", permission: "menu.manage" },
  "/admin/system": { title: "Konfigurasi Sistem", subtitle: "Kelola kendali fitur dan parameter aplikasi yang tidak bersifat rahasia.", permission: "system.configure" },
  "/admin/profile": { title: "Pengguna", subtitle: "Kelola nama, data akun, dan kata sandi Anda." },
  "/governance/categories": { title: "Kategori", subtitle: "Kelompokkan indikator berdasarkan fokus pembangunan daerah.", permission: "category.view" },
  "/governance/indicators": { title: "Matriks Indikator", subtitle: "Finalisasi definisi, sumber, target tahunan, serta OPD penanggung jawab indikator pembangunan.", permission: "indicator.view" },
  "/governance/datasets": { title: "Dataset", subtitle: "Temukan dataset resmi, sumber, versi, dan keterkaitannya dengan indikator pembangunan.", permission: "dataset.view" },
  "/submissions": { title: "Pelaporan Realisasi", subtitle: "Isi, simpan, dan kirim realisasi indikator OPD untuk periode pelaporan.", permission: "submission.view" },
  "/reviews": { title: "Verifikasi Pelaporan OPD", subtitle: "Periksa, kembalikan, atau setujui pelaporan yang dikirim perangkat daerah.", permission: "submission.review" },
  "/guidance": { title: "Pembinaan Data Statistik", subtitle: "Telaah standar, metadata, metodologi, dan konsistensi tanpa mengubah data milik produsen.", permission: "statistical_guidance.view" },
  "/publications": { title: "Kurasi & Publikasi", subtitle: "Pilih capaian yang disetujui sebelum diterbitkan ke dashboard Bupati.", permission: "publication.view" },
  "/consolidation": { title: "Konsolidasi Sumber", subtitle: "Tentukan nilai yang valid bila sumber data melaporkan angka berbeda untuk indikator yang sama.", permission: "consolidation.view" },
  "/connectors": { title: "Pusat Sinkronisasi Data", subtitle: "Telusuri sumber, staging mentah, transformasi, indikator, dan capaian dalam satu pipeline.", permission: "connector.view" },
  "/opd-profile": { title: "Profil Data OPD", subtitle: "Konfirmasi PIC, sumber data, dokumen acuan, dan baseline OPD.", permission: "submission.view" },
};

function ProtectedApp() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const titleOverride = usePageTitleOverride();
  useEffect(() => {
    if (!loading && !user && !["/login", "/activate", "/register"].includes(pathname)) navigate("/login");
    if (!loading && user?.must_change_password && pathname !== "/security/setup") navigate("/security/setup");
    if (!loading && user && ["/", "/login", "/register", "/design-lab/fresh"].includes(pathname)) {
      const landing = user.roles.some((role) => role.code === "superadmin") ? "/admin"
        : user.roles.some((role) => role.code === "pimpinan") ? "/dashboard"
        : user.roles.some((role) => role.code === "kominfo") ? "/connectors"
        : user.roles.some((role) => role.code === "pembina_statistik") ? "/guidance"
        : user.permissions.includes("submission.view") ? "/operations" : "/dashboard";
      navigate(landing);
    }
    if (!loading && user && pathname === "/submissions" && user.roles.some((role) => role.code === "bapperida") && !user.roles.some((role) => role.code === "opd") && !user.roles.some((role) => role.code === "superadmin")) {
      navigate(`/reviews${window.location.search}`);
    }
  }, [loading, user, pathname]);

  if (pathname === "/activate") return <InvitationPage />;
  if (pathname === "/register") return <RegistrationPage />;
  if (pathname === "/security/setup") return user ? <PasswordSetupPage /> : <LoginPage />;
  if (loading) return <LoadingScreen />;
  if (!user || pathname === "/login") return <LoginPage />;
  const detailMatch = new RegExp("^/dashboard/indikator/([0-9a-fA-F-]{36})$", "u").exec(pathname);
  const baseMeta = pageMeta[detailMatch ? "/dashboard/indikator" : pathname] ?? { title: "Halaman tidak ditemukan", subtitle: "Alamat ini tidak tersedia atau sudah dihapus." };
  const meta = detailMatch && titleOverride ? { ...baseMeta, ...titleOverride }
    : pathname === "/publications" && user.roles.some((role) => role.code === "pimpinan")
    ? { ...baseMeta, title: "Rilis Data", subtitle: "Rilis resmi yang aktif dan masih layak ditampilkan untuk Bupati." }
    : baseMeta;
  const denied = meta.permission && !user.permissions.includes(meta.permission);
  let content;
  if (denied) content = <Notice tone="error">Anda tidak memiliki hak akses untuk membuka halaman ini.</Notice>;
  else if (pathname === "/admin") content = <DashboardPage />;
  else if (pathname === "/admin/organizations") content = <OrganizationsPage />;
  else if (pathname === "/admin/opd-monitoring") content = <OpdMonitoringPage />;
  else if (pathname === "/admin/users") content = <UsersPage />;
  else if (pathname === "/admin/roles") content = <RolesPage />;
  else if (pathname === "/admin/menus") content = <MenusPage />;
  else if (pathname === "/admin/system") content = <SystemPage />;
  else if (pathname === "/admin/profile") content = <SecurityPage />;
  else if (pathname === "/governance/categories") content = <CategoriesPage />;
  else if (pathname === "/governance/indicators") content = <IndicatorsPage />;
  else if (pathname === "/governance/datasets") content = <DatasetPage />;
  else if (pathname === "/submissions") content = <SubmissionsPage />;
  else if (pathname === "/reviews") content = <SubmissionsPage review />;
  else if (pathname === "/guidance") content = <SubmissionsPage guidance />;
  else if (pathname === "/dashboard/bank-data") content = <BankDataPage />;
  else if (detailMatch) content = <IndicatorDetailPage id={detailMatch[1]!} />;
  else if (pathname === "/dashboard") content = <BerandaPage />;
  else if (pathname === "/publications") content = <PublicationsPage />;
  else if (pathname === "/assistant") content = <AssistantPage />;
  else if (pathname === "/analysis") content = <AnalysisPage />;
  else if (pathname === "/notifications") content = <NotificationsPage />;
  else if (pathname === "/audit") content = <AuditPage />;
  else if (pathname === "/operations") content = <OperationsPage />;
  else if (pathname === "/connectors") content = <ConnectorsPage />;
  else if (pathname === "/consolidation") content = <ConsolidationPage />;
  else if (pathname === "/opd-profile") content = <OpdProfilePage />;
  else content = <NotFoundPage />;

  return (
    <AdminLayout pathname={pathname} title={meta.title} subtitle={meta.subtitle}>
      <Suspense fallback={<PageLoading />}>{content}</Suspense>
    </AdminLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingScreen />}>
        <ProtectedApp />
      </Suspense>
    </AuthProvider>
  );
}
