"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, RefreshCw, ShieldCheck } from "lucide-react";

import AdminNavigation from "@/components/AdminNavigation";

type PrivacyRequest = {
  id: string;
  subject_user_id: string;
  subject_email: string | null;
  subject_name: string | null;
  request_type: string;
  details: string | null;
  status: string;
  submitted_at: string;
  due_at: string;
  identity_verified_at: string | null;
  decision_reason: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  access: "Auskunft",
  correction: "Berichtigung",
  deletion: "Löschung",
  restriction: "Einschränkung",
  objection: "Widerspruch",
  portability: "Datenübertragbarkeit",
  other: "Anderes Anliegen",
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Eingegangen",
  identity_check: "Identitätsprüfung",
  in_progress: "In Bearbeitung",
  waiting_for_subject: "Rückfrage offen",
  completed: "Abgeschlossen",
  rejected: "Abgelehnt",
  cancelled: "Storniert",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-AT", { dateStyle: "medium" }).format(new Date(value));
}

export default function AdminPrivacyPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/privacy-requests?status=${encodeURIComponent(statusFilter)}`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError("Datenschutzanfragen konnten nicht geladen werden.");
    else setRequests(body.requests || []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function updateRequest(item: PrivacyRequest, status: string, identityVerified = false) {
    setBusyId(item.id);
    setError(null);
    const response = await fetch("/api/admin/privacy-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        status,
        identityVerified,
        decisionReason: item.decision_reason || "",
      }),
    });
    if (!response.ok) setError("Die Anfrage konnte nicht aktualisiert werden.");
    else await loadRequests();
    setBusyId(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className={`min-h-screen transition-all duration-300 ${sidebarOpen ? "ml-56" : "ml-14"}`}>
        <div className="mx-auto max-w-7xl px-5 py-6">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-green-700" aria-hidden="true" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Datenschutzanfragen</h1>
                <p className="mt-1 text-sm text-gray-600">Fristen, Identitätsprüfung und Auskunftsexporte verwalten.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
                aria-label="Status filtern"
              >
                <option value="all">Alle Status</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <button
                type="button"
                onClick={() => void loadRequests()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                title="Aktualisieren"
                aria-label="Aktualisieren"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </header>

          {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
          {loading ? <p className="py-10 text-sm text-gray-500">Wird geladen...</p> : requests.length === 0 ? (
            <p className="py-10 text-sm text-gray-500">Keine Anfragen für diesen Filter.</p>
          ) : (
            <div className="mt-5 overflow-x-auto border-y border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Person</th>
                    <th className="px-4 py-3">Anliegen</th>
                    <th className="px-4 py-3">Frist</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {requests.map((item) => {
                    const overdue = !["completed", "rejected", "cancelled"].includes(item.status)
                      && new Date(item.due_at).getTime() < Date.now();
                    const busy = busyId === item.id;
                    return (
                      <tr key={item.id} className="align-top">
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-900">{item.subject_name || "Unbekannt"}</p>
                          <p className="mt-1 text-xs text-gray-500">{item.subject_email || item.subject_user_id}</p>
                        </td>
                        <td className="max-w-sm px-4 py-4">
                          <p className="font-medium text-gray-900">{TYPE_LABELS[item.request_type] || item.request_type}</p>
                          <p className="mt-1 line-clamp-3 text-xs leading-5 text-gray-600">{item.details || "Keine Zusatzangabe"}</p>
                          <p className="mt-2 text-xs text-gray-400">{formatDate(item.submitted_at)}</p>
                        </td>
                        <td className={`whitespace-nowrap px-4 py-4 ${overdue ? "font-medium text-red-700" : "text-gray-700"}`}>
                          {formatDate(item.due_at)}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-800">{STATUS_LABELS[item.status] || item.status}</span>
                          <p className={`mt-1 text-xs ${item.identity_verified_at ? "text-green-700" : "text-amber-700"}`}>
                            {item.identity_verified_at ? "Identität geprüft" : "Identität offen"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex min-w-56 justify-end gap-2">
                            {!item.identity_verified_at && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void updateRequest(item, "in_progress", true)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-green-700 px-3 text-xs font-medium text-green-800 hover:bg-green-50 disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-4 w-4" /> Prüfen
                              </button>
                            )}
                            {item.identity_verified_at && ["access", "portability"].includes(item.request_type) && (
                              <a
                                href={`/api/admin/privacy-requests/${item.id}/export`}
                                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-blue-700 px-3 text-xs font-medium text-blue-800 hover:bg-blue-50"
                              >
                                <Download className="h-4 w-4" /> Export
                              </a>
                            )}
                            {item.identity_verified_at && !["completed", "rejected", "cancelled"].includes(item.status) && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void updateRequest(item, "completed")}
                                className="h-9 rounded-md bg-gray-900 px-3 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                              >
                                Abschließen
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
