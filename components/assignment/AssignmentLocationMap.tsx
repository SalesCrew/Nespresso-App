"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, MapPin, XCircle } from "lucide-react";

type LocationPoint = {
  latitude: number | string | null | undefined;
  longitude: number | string | null | undefined;
  capturedAt?: string | null;
  distanceMeters?: number | string | null;
  accuracyMeters?: number | string | null;
  status?: string | null;
};

export type AssignmentLocationMapProps = {
  market: LocationPoint & { address?: string | null; geocodedAt?: string | null };
  start: LocationPoint;
  end: LocationPoint;
};

let googleMapsPromise: Promise<any> | null = null;

async function loadGoogleMaps(): Promise<any> {
  const existingGoogle = (window as any).google;
  if (existingGoogle?.maps) return existingGoogle.maps;
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = (async () => {
    const response = await fetch("/api/admin/maps/config", { cache: "no-store" });
    const config = await response.json().catch(() => ({}));
    if (!response.ok || !config.apiKey) {
      throw new Error(config.error || "Google Maps konnte nicht geladen werden.");
    }

    await new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>("script[data-salescrew-google-maps]");
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Google Maps konnte nicht geladen werden.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(config.apiKey)}&v=weekly&language=de&region=AT`;
      script.async = true;
      script.defer = true;
      script.dataset.salescrewGoogleMaps = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Google Maps konnte nicht geladen werden."));
      document.head.appendChild(script);
    });

    const loadedGoogle = (window as any).google;
    if (!loadedGoogle?.maps) throw new Error("Google Maps wurde nicht initialisiert.");
    return loadedGoogle.maps;
  })().catch((error) => {
    googleMapsPromise = null;
    throw error;
  });

  return googleMapsPromise;
}

function parsePoint(point: LocationPoint): { lat: number; lng: number } | null {
  if (
    point.latitude === null
    || point.latitude === undefined
    || point.latitude === ""
    || point.longitude === null
    || point.longitude === undefined
    || point.longitude === ""
  ) {
    return null;
  }
  const lat = Number(point.latitude);
  const lng = Number(point.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { lat, lng };
}

function formatMeters(value: number | string | null | undefined): string {
  const meters = Number(value);
  return Number.isFinite(meters) ? `${Math.round(meters)} m` : "Fehlt";
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "Fehlt";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Fehlt";
  return parsed.toLocaleString("de-AT", {
    timeZone: "Europe/Vienna",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AssignmentLocationMap({ market, start, end }: AssignmentLocationMapProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const marketPoint = useMemo(() => parsePoint(market), [market.latitude, market.longitude]);
  const startPoint = useMemo(() => parsePoint(start), [start.latitude, start.longitude]);
  const endPoint = useMemo(() => parsePoint(end), [end.latitude, end.longitude]);

  useEffect(() => {
    let cancelled = false;
    if (!mapElementRef.current || !marketPoint) return;

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !mapElementRef.current) return;
        const map = new maps.Map(mapElementRef.current, {
          center: marketPoint,
          zoom: 16,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        });
        const bounds = new maps.LatLngBounds();
        const addMarker = (position: { lat: number; lng: number }, label: string, title: string) => {
          new maps.Marker({ map, position, label, title });
          bounds.extend(position);
        };

        addMarker(marketPoint, "M", "Markt");
        if (startPoint) addMarker(startPoint, "S", "Einsatzstart");
        if (endPoint) addMarker(endPoint, "E", "Einsatzende");
        new maps.Circle({
          map,
          center: marketPoint,
          radius: 300,
          strokeColor: "#2563eb",
          strokeOpacity: 0.7,
          strokeWeight: 1,
          fillColor: "#3b82f6",
          fillOpacity: 0.08,
        });
        if (startPoint || endPoint) map.fitBounds(bounds, 40);
        setMapError(null);
      })
      .catch((error) => {
        if (!cancelled) setMapError(error instanceof Error ? error.message : "Google Maps konnte nicht geladen werden.");
      });

    return () => {
      cancelled = true;
    };
  }, [marketPoint, startPoint, endPoint]);

  const rows = [
    { label: "Start", point: startPoint, data: start },
    { label: "Ende", point: endPoint, data: end },
  ];

  return (
    <section className="space-y-3" aria-label="Standortprüfung">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-medium text-gray-900">Standortprüfung</h4>
        <span className="text-xs text-gray-500">Radius 300 m</span>
      </div>

      {marketPoint ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          <div ref={mapElementRef} className="h-72 w-full" aria-label="Interaktive Google-Maps-Karte" />
          {mapError && <p className="border-t border-gray-200 p-3 text-sm text-red-700">{mapError}</p>}
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <p className="text-sm text-gray-600">Marktposition fehlt. Es wird keine scheinbar geprüfte Karte angezeigt.</p>
        </div>
      )}

      {market.address && (
        <p className="text-xs text-gray-500">Geocodierte Marktadresse: {market.address}</p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map(({ label, point, data }) => {
          const verified = point && data.status === "verified";
          return (
            <div key={label} className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">{label}</span>
                {verified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Geprüft
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <XCircle className="h-3.5 w-3.5" /> Fehlt
                  </span>
                )}
              </div>
              <dl className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between gap-3"><dt>Zeitpunkt</dt><dd className="text-right">{formatTimestamp(data.capturedAt)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Entfernung</dt><dd>{formatMeters(data.distanceMeters)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Genauigkeit</dt><dd>{formatMeters(data.accuracyMeters)}</dd></div>
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}
