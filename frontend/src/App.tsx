import { lazy, Suspense, useEffect } from "react";
import { AuthProvider, useAuth } from "./auth";
import { LoadingScreen, Notice, PageLoading } from "./components";
import { AdminLayout, ComingSoon } from "./layout/AdminLayout";
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
const ExecutivePage = lazy(() => import("./pages/ExecutivePage").then((module) => ({ default: module.ExecutivePage })));
const PublicationsPage = lazy(() => import("./pages/PublicationsPage").then((module) => ({ default: module.PublicationsPage })));
const AssistantPage = lazy(() => import("./pages/AssistantPage").then((module) => ({ default: module.AssistantPage })));
const AuditPage = lazy(() => import("./pages/MonitoringPages").then((module) => ({ default: module.AuditPage })));
const NotificationsPage = lazy(() => import("./pages/MonitoringPages").then((module) => ({ default: module.NotificationsPage })));
const OperationsPage = lazy(() => import("./pages/OperationsPage").then((module) => ({ default: module.OperationsPage })));
const ConnectorsPage = lazy(() => import("./pages/ConnectorsPage").then((module) => ({ default: module.ConnectorsPage })));
const AnalysisPage = lazy(() => import("./pages/DecisionPages").then((module) => ({ default: module.AnalysisPage })));
const FinancePage = lazy(() => import("./pages/DecisionPages").then((module) => ({ default: module.FinancePage })));
const PublicServicesPage = lazy(() => import("./pages/DecisionPages").then((module) => ({ default: module.PublicServicesPage })));
const OpdProfilePage = lazy(() => import("./pages/OpdProfilePage").then((module) => ({ default: module.OpdProfilePage })));
const OpdMonitoringPage = lazy(() => import("./pages/OpdMonitoringPage").then((module) => ({ default: module.OpdMonitoringPage })));

const pageMeta: Record<string, { title: string; subtitle: string; permission?: string }> = {
  "/admin": { title: "Beranda Administrasi", subtitle: "Ringkasan konfigurasi, akses pengguna, dan kesiapan sistem.", permission: "system.configure" },
  "/dashboard": { title: "Beranda SABABUKA", subtitle: "Ringkasan data yang aman untuk pembacaan pimpinan.", permission: "executive_dashboard.view" },
  "/executive": { title: "Ringkasan Pimpinan", subtitle: "Capaian terkurasi dari data yang telah disetujui dan dipublikasikan.", permission: "executive_dashboard.view" },
  "/assistant": { title: "Asisten Data", subtitle: "Asisten pimpinan berbasis data SABABUKA yang telah dipublikasikan.", permission: "assistant.use" },
  "/analysis": { title: "Analisis dan Peta", subtitle: "Baca tren, kesenjangan wilayah, konsistensi sumber, dan rekomendasi keputusan.", permission: "executive_dashboard.view" },
  "/finance": { title: "Keuangan Daerah", subtitle: "Analisis indikator pendapatan, belanja, fiskal, dan akuntabilitas keuangan.", permission: "executive_dashboard.view" },
  "/public-services": { title: "Layanan Publik", subtitle: "Analisis cakupan, mutu, kepuasan, SLA, dan pengaduan layanan.", permission: "executive_dashboard.view" },
  "/notifications": { title: "Notifikasi", subtitle: "Pembaruan kategori, indikator, verifikasi OPD, pengiriman, dan publikasi." },
  "/audit": { title: "Audit Aktivitas", subtitle: "Jejak perubahan permanen sesuai lingkup organisasi.", permission: "audit.view" },
  "/operations": { title: "Beranda Tugas", subtitle: "Lihat pekerjaan yang perlu diselesaikan sesuai peran dan kewenangan Anda.", permission: "submission.view" },
  "/admin/organizations": { title: "Organisasi dan OPD", subtitle: "Kelola struktur organisasi yang menjadi lingkup pengguna dan pemilik data.", permission: "organization.view" },
  "/admin/opd-monitoring": { title: "Kesiapan OPD", subtitle: "Pantau PIC, indikator, kelompok isu, fokus pembangunan, dan profil sumber setiap OPD.", permission: "organization.view" },
  "/admin/users": { title: "Pengguna", subtitle: "Verifikasi pendaftaran, pantau status akun, dan tetapkan peran sesuai tugas.", permission: "user.view" },
  "/admin/roles": { title: "Peran dan Hak Akses", subtitle: "Atur kewenangan setiap peran dengan prinsip akses minimum.", permission: "role.view" },
  "/admin/menus": { title: "Pengaturan Menu", subtitle: "Tentukan menu yang tampil untuk setiap peran.", permission: "menu.manage" },
  "/admin/system": { title: "Konfigurasi Sistem", subtitle: "Kelola kendali fitur dan parameter aplikasi yang tidak bersifat rahasia.", permission: "system.configure" },
  "/admin/profile": { title: "Keamanan Akun", subtitle: "Kelola Authenticator dan perlindungan akun Anda." },
  "/governance/categories": { title: "Kelompok Isu", subtitle: "Kelompokkan indikator berdasarkan fokus pembangunan daerah.", permission: "category.view" },
  "/governance/indicators": { title: "Matriks Indikator", subtitle: "Finalisasi definisi, sumber, target tahunan, serta OPD penanggung jawab indikator pembangunan.", permission: "indicator.view" },
  "/submissions": { title: "Pelaporan Realisasi", subtitle: "Isi, simpan, dan kirim realisasi indikator OPD untuk periode pelaporan.", permission: "submission.view" },
  "/reviews": { title: "Verifikasi Pelaporan OPD", subtitle: "Periksa, kembalikan, atau setujui pelaporan yang dikirim perangkat daerah.", permission: "submission.review" },
  "/guidance": { title: "Pembinaan Data Statistik", subtitle: "Telaah standar, metadata, metodologi, dan konsistensi tanpa mengubah data milik produsen.", permission: "statistical_guidance.view" },
  "/publications": { title: "Kurasi dan Publikasi", subtitle: "Pilih capaian yang disetujui sebelum diterbitkan ke dashboard pimpinan.", permission: "publication.view" },
  "/connectors": { title: "Ruang Walidata", subtitle: "Kelola kualitas teknis, metadata, interoperabilitas, dan kesehatan aliran data daerah.", permission: "connector.view" },
  "/opd-profile": { title: "Profil Data OPD", subtitle: "Konfirmasi PIC, sumber data, dokumen acuan, dan baseline OPD.", permission: "submission.view" },
};

function ProtectedApp() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  useEffect(() => {
    if (!loading && !user && !["/login", "/activate", "/register"].includes(pathname)) navigate("/login");
    if (!loading && user?.must_change_password && pathname !== "/security/setup") navigate("/security/setup");
    if (!loading && user && (pathname === "/" || pathname === "/login" || pathname === "/register")) {
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
  const baseMeta = pageMeta[pathname] ?? { title: "Modul SABABUKA", subtitle: "Modul sedang disiapkan." };
  const meta = pathname === "/publications" && user.roles.some((role) => role.code === "pimpinan")
    ? { ...baseMeta, title: "Rilis Data", subtitle: "Rilis resmi yang aktif dan masih layak ditampilkan untuk pimpinan." }
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
  else if (pathname === "/submissions") content = <SubmissionsPage />;
  else if (pathname === "/reviews") content = <SubmissionsPage review />;
  else if (pathname === "/guidance") content = <SubmissionsPage guidance />;
  else if (pathname === "/dashboard" || pathname === "/executive") content = <ExecutivePage />;
  else if (pathname === "/publications") content = <PublicationsPage />;
  else if (pathname === "/assistant") content = <AssistantPage />;
  else if (pathname === "/analysis") content = <AnalysisPage />;
  else if (pathname === "/finance") content = <FinancePage />;
  else if (pathname === "/public-services") content = <PublicServicesPage />;
  else if (pathname === "/notifications") content = <NotificationsPage />;
  else if (pathname === "/audit") content = <AuditPage />;
  else if (pathname === "/operations") content = <OperationsPage />;
  else if (pathname === "/connectors") content = <ConnectorsPage />;
  else if (pathname === "/opd-profile") content = <OpdProfilePage />;
  else content = <ComingSoon title={meta.title} />;

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
