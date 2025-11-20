import { useState } from "react";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "";

export default function DownloadAll() {
  const [busy, setBusy] = useState(false);

  const downloadBackend = () => {
    window.open(`${BACKEND}/export/backend.zip`, "_blank");
  };

  return (
    <div className="fixed bottom-4 left-4">
      <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-lg p-3 flex items-center gap-2">
        <button
          disabled={busy}
          onClick={downloadBackend}
          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
        >
          تنزيل المشروع (الخادم)
        </button>
        <span className="text-xs opacity-70">اضبط VITE_BACKEND_URL ليعمل الرابط</span>
      </div>
    </div>
  );
}
