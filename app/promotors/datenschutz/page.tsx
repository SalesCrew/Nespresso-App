"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, FileLock2, Send } from "lucide-react";

type PrivacyRequest = {
  id: string;
  request_type: string;
  details: string | null;
  status: string;
  submitted_at: string;
  due_at: string;
  identity_verified_at: string | null;
  decision_reason: string | null;
  completed_at: string | null;
};

const REQUEST_TYPES = [
  ["access", "Auskunft über meine Daten"],
  ["correction", "Berichtigung meiner Daten"],
  ["deletion", "Löschung meiner Daten"],
  ["restriction", "Einschränkung der Verarbeitung"],
  ["objection", "Widerspruch"],
  ["portability", "Datenübertragbarkeit"],
  ["other", "Anderes Datenschutzanliegen"],
] as const;

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

export default function PrivacyRequestsPage() {
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [requestType, setRequestType] = useState("access");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/me/privacy-requests", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError("Die Anfragen konnten nicht geladen werden.");
    else setRequests(body.requests || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function submitRequest(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/me/privacy-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType, details }),
    });
    if (!response.ok) {
      setError(response.status === 429
        ? "Es sind bereits mehrere Anfragen offen. Bitte warte auf die Bearbeitung."
        : "Die Anfrage konnte nicht gesendet werden.");
    } else {
      setDetails("");
      await loadRequests();
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-8 pb-8">
      <header className="border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          <FileLock2 className="h-6 w-6 text-blue-600" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Datenschutz &amp; meine Rechte</h1>
            <p className="mt-1 text-sm text-gray-600">Datenschutzanliegen sicher einreichen und den Stand verfolgen.</p>
          </div>
        </div>
      </header>

      <section aria-labelledby="new-request-title">
        <h2 id="new-request-title" className="text-base font-semibold text-gray-900">Neue Anfrage</h2>
        <form className="mt-4 space-y-4" onSubmit={submitRequest}>
          <label className="block text-sm font-medium text-gray-700" htmlFor="request-type">Art der Anfrage</label>
          <select
            id="request-type"
            value={requestType}
            onChange={(event) => setRequestType(event.target.value)}
            className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {REQUEST_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <label className="block text-sm font-medium text-gray-700" htmlFor="request-details">Was sollen wir prüfen?</label>
          <textarea
            id="request-details"
            value={details}
            onChange={(event) => setDetails(event.target.value.slice(0, 2000))}
            rows={5}
            placeholder="Beschreibe dein Anliegen so konkret wie möglich."
            className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-gray-500">{details.length}/2000 Zeichen</span>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {submitting ? "Wird gesendet" : "Anfrage senden"}
            </button>
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </form>
      </section>

      <section aria-labelledby="requests-title" className="border-t border-gray-200 pt-6">
        <h2 id="requests-title" className="text-base font-semibold text-gray-900">Meine Anfragen</h2>
        {loading ? <p className="mt-4 text-sm text-gray-500">Wird geladen...</p> : requests.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Noch keine Datenschutzanfrage vorhanden.</p>
        ) : (
          <div className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
            {requests.map((item) => {
              const typeLabel = REQUEST_TYPES.find(([value]) => value === item.request_type)?.[1] || item.request_type;
              const completed = item.status === "completed";
              return (
                <article key={item.id} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{typeLabel}</h3>
                      <p className="mt-1 text-xs text-gray-500">Eingegangen am {formatDate(item.submitted_at)}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${completed ? "text-green-700" : "text-amber-700"}`}>
                      {completed ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </div>
                  {item.details && <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{item.details}</p>}
                  <p className="mt-3 text-xs text-gray-500">Aktuelle Bearbeitungsfrist: {formatDate(item.due_at)}</p>
                  {item.decision_reason && <p className="mt-2 text-sm text-gray-700">Rückmeldung: {item.decision_reason}</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-xs leading-5 text-gray-500">
        Allgemeine Informationen stehen in der <a href="/datenschutz" className="text-blue-700 underline underline-offset-2">Datenschutzerklärung</a>.
        Für die Bearbeitung kann eine Identitätsprüfung erforderlich sein.
      </p>
    </div>
  );
}
