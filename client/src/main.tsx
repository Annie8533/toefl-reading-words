import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

/**
 * GitHub Pages 會以靜態檔提供網站；此檢查會略過快取讀取 release.json。
 * 偵測到新的部署版本時，自動重新載入，讓學生不必前往 GitHub 或手動尋找新版。
 */
const RELEASE_KEY = "toefl-word-lab.active-release";
const RELEASE_URL = `${import.meta.env.BASE_URL}release.json`;

async function checkForReleaseUpdate() {
  try {
    const response = await fetch(`${RELEASE_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;
    const { release } = (await response.json()) as { release?: string };
    if (!release) return;

    const activeRelease = window.sessionStorage.getItem(RELEASE_KEY);
    if (activeRelease && activeRelease !== release) {
      window.sessionStorage.setItem(RELEASE_KEY, release);
      window.location.reload();
      return;
    }
    window.sessionStorage.setItem(RELEASE_KEY, release);
  } catch {
    // 離線或短暫網路中斷時維持目前可用版本。
  }
}

void checkForReleaseUpdate();
window.setInterval(() => void checkForReleaseUpdate(), 60_000);

createRoot(document.getElementById("root")!).render(<App />);
