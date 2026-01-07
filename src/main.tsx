import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

try {
  const saved = localStorage.getItem("theme");
  const theme = saved === "light" || saved === "dark" ? saved : "dark";
  if (!saved) localStorage.setItem("theme", theme);
  if (theme === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
} catch {
}

createRoot(document.getElementById("root")!).render(<App />);
