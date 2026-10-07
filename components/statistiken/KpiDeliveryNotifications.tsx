"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BarChart2, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { KpiFeedbackRecord } from "@/lib/statistics/kpiFeedback";

const formatMetric = (value: number) => Number(value).toLocaleString("de-AT", { maximumFractionDigits: 1 });

export default function KpiDeliveryNotifications() {
  const [deliveries, setDeliveries] = useState<KpiFeedbackRecord[]>([]);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState(false);
  const dismissed = useRef(new Set<string>());
  const pending = useRef(new Set<string>());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mounted = useRef(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/me/kpi-feedback", { cache: "no-store" });
      if (!response.ok) throw new Error("Load failed");
      const data = await response.json();
      if (!mounted.current) return;
      setDeliveries(previous => {
        const unread: KpiFeedbackRecord[] = (data.kpis || []).filter((item: KpiFeedbackRecord) => !dismissed.current.has(item.id));
        // Preserve the brief read confirmation even when a concurrent reload returns no row.
        return [...previous.filter(item => dismissed.current.has(item.id)), ...unread];
      });
      setLoadError(false);
    } catch {
      if (mounted.current) setLoadError(true);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    const onFocus = () => { if (document.visibilityState === "visible") void load(); };
    const interval = setInterval(onFocus, 30_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("kpi-feedback-updated", onFocus);
    return () => {
      mounted.current = false;
      clearInterval(interval);
      timers.current.forEach(clearTimeout);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("kpi-feedback-updated", onFocus);
    };
  }, [load]);

  const markRead = async (id: string) => {
    if (pending.current.has(id)) return;
    pending.current.add(id);
    setBusy(previous => ({ ...previous, [id]: true }));
    setErrors(previous => ({ ...previous, [id]: "" }));
    try {
      const response = await fetch("/api/me/kpi-feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback_id: id }),
      });
      if (!response.ok) throw new Error("Read failed");
      if (!mounted.current) return;
      dismissed.current.add(id);
      setConfirmed(previous => ({ ...previous, [id]: true }));
      window.dispatchEvent(new Event("kpi-feedback-updated"));
      timers.current.push(setTimeout(() => {
        setDeliveries(previous => previous.filter(item => item.id !== id));
      }, 5_000));
    } catch {
      if (mounted.current) setErrors(previous => ({ ...previous, [id]: "Lesestatus konnte nicht gespeichert werden. Bitte versuche es erneut." }));
    } finally {
      pending.current.delete(id);
      if (mounted.current) setBusy(previous => ({ ...previous, [id]: false }));
    }
  };

  return <>
    {loadError && <div className="w-full max-w-md mx-auto mb-6 rounded-lg border border-gray-200 p-4 text-sm" role="alert">
      <p>Neue KPIs konnten nicht geladen werden.</p>
      <button onClick={() => void load()} className="mt-2 underline">Erneut versuchen</button>
    </div>}
    {deliveries.map(delivery => <div key={delivery.id} className="w-full max-w-md mx-auto mb-6" role="region" aria-label="Neue KPIs">
      {confirmed[delivery.id] ? <Card className="bg-green-50 border-green-200">
        <CardContent className="py-4 px-6 flex items-center justify-center gap-2 text-green-700" role="status">
          <Check className="h-5 w-5" /><span>Danke fürs Lesen!</span>
        </CardContent>
      </Card> : <div className="relative">
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-lg blur-sm opacity-75 motion-safe:animate-pulse" />
        <Card className="relative bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 border-0 shadow-xl overflow-hidden">
          <div className="py-4 px-6 text-center text-white">
            <BarChart2 className="h-6 w-6 mx-auto mb-2" />
            <h3 className="font-bold text-lg">Neue KPIs verfügbar!</h3>
            <p className="text-sm text-white/90 mt-1">Deine neuen CA KPIs sind da.</p>
            <p className="text-xs text-white/80 mt-1">{new Date(delivery.created_at).toLocaleDateString("de-AT")}</p>
          </div>
          <CardContent className="p-4 pt-0 text-center">
            <dl className="grid grid-cols-3 gap-2 rounded-lg bg-black/20 p-4 mb-4 text-white border border-white/20">
              <div><dt className="text-xs">MC/ET</dt><dd className="text-lg font-semibold">{formatMetric(delivery.mc_et)}</dd></div>
              <div><dt className="text-xs">TMA</dt><dd className="text-lg font-semibold">{formatMetric(delivery.tma)}%</dd></div>
              <div><dt className="text-xs">VL Share</dt><dd className="text-lg font-semibold">{formatMetric(delivery.vl_value)}%</dd></div>
            </dl>
            {errors[delivery.id] && <p role="alert" className="text-white text-sm mb-3">{errors[delivery.id]}</p>}
            <button disabled={busy[delivery.id]} onClick={() => void markRead(delivery.id)} className="bg-white text-orange-600 font-medium py-2.5 px-5 rounded-lg shadow-md hover:bg-gray-50 disabled:opacity-60 disabled:cursor-wait">
              {busy[delivery.id] ? "Wird gespeichert…" : "✓ Gelesen"}
            </button>
          </CardContent>
        </Card>
      </div>}
    </div>)}
  </>;
}
