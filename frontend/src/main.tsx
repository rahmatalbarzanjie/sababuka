import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@fontsource/source-sans-3/latin-400.css";
import "@fontsource/source-sans-3/latin-600.css";
import "@fontsource/source-sans-3/latin-700.css";
import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-600.css";
import "@fontsource/poppins/latin-700.css";
import "./styles.css";
import "./ui-system.css";
import "./vitality.css";
import "./responsive.css";
import "./interactions.css";
import "./beranda.css";
import "./exec.css";
import "./portal.css";
import "./auth.css";
import "./chat.css";
import { initInteractions } from "./interactions";
import { initializeTheme } from "./theme";

initializeTheme();
// Pembungkus Android menambahkan penanda pada user agent; mode aplikasi memakai tata letak khusus ponsel.
if (/SABABUKA-Android/.test(navigator.userAgent) || new URLSearchParams(window.location.search).get("mode") === "app") document.documentElement.classList.add("app-mode");
initInteractions();
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
