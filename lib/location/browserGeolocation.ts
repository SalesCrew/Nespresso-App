import { hasValidCoordinates } from "@/lib/location/distance";

export type BrowserAssignmentLocation = {
  latitude: number;
  longitude: number;
  accuracy_meters: number;
};

export type BrowserLocationErrorCode =
  | "LOCATION_UNSUPPORTED"
  | "LOCATION_PERMISSION_DENIED"
  | "LOCATION_UNAVAILABLE"
  | "LOCATION_TIMEOUT"
  | "LOCATION_INVALID";

export class BrowserLocationError extends Error {
  constructor(public readonly code: BrowserLocationErrorCode, message: string) {
    super(message);
    this.name = "BrowserLocationError";
  }
}

export function requestCurrentAssignmentLocation(): Promise<BrowserAssignmentLocation> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(new BrowserLocationError(
      "LOCATION_UNSUPPORTED",
      "Dieses Gerät unterstützt keine Standortabfrage."
    ));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const accuracy = Number(position.coords.accuracy);

        if (!hasValidCoordinates(coordinates) || !Number.isFinite(accuracy) || accuracy < 0) {
          reject(new BrowserLocationError(
            "LOCATION_INVALID",
            "Der ermittelte Standort ist ungültig. Bitte versuche es erneut."
          ));
          return;
        }

        resolve({
          ...coordinates,
          accuracy_meters: accuracy,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new BrowserLocationError(
            "LOCATION_PERMISSION_DENIED",
            "Der Standortzugriff wurde verweigert. Erlaube den Zugriff in den Browser-Einstellungen und prüfe den Standort erneut."
          ));
          return;
        }
        if (error.code === error.TIMEOUT) {
          reject(new BrowserLocationError(
            "LOCATION_TIMEOUT",
            "Die Standortabfrage hat zu lange gedauert. Bitte prüfe Empfang und Ortungsdienste und versuche es erneut."
          ));
          return;
        }
        reject(new BrowserLocationError(
          "LOCATION_UNAVAILABLE",
          "Der aktuelle Standort ist nicht verfügbar. Bitte aktiviere die Ortungsdienste und versuche es erneut."
        ));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15_000,
      }
    );
  });
}
