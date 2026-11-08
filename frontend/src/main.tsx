import "./lib/pwa-install-prompt.ts";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Применяем темную тему сразу при загрузке
if (typeof document !== 'undefined') {
  document.documentElement.classList.add("dark");
  document.documentElement.classList.remove("light");
}

// PWA: Регистрация Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration);
      })
      .catch((error) => {
        console.log('⚠️ Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
