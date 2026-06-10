import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppRouter } from "@/router/index";
import { applyTheme, getInitialTheme } from "@/components/ThemeToggle";
import "./index.css";

applyTheme(getInitialTheme());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
