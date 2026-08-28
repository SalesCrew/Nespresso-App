import { hasValidCoordinates, type Coordinates } from "@/lib/location/distance";

export type GeocodedMarketLocation = Coordinates & {
  formattedAddress: string;
};

export type MarketGeocodingErrorCode =
  | "MARKET_LOCATION_MISSING"
  | "MARKET_GEOCODING_UNAVAILABLE"
  | "MARKET_GEOCODING_FAILED";

export class MarketGeocodingError extends Error {
  constructor(public readonly code: MarketGeocodingErrorCode, message: string) {
    super(message);
    this.name = "MarketGeocodingError";
  }
}

export async function geocodeMarketAddress(address: string): Promise<GeocodedMarketLocation> {
  const normalizedAddress = String(address || "").trim();
  if (!normalizedAddress) {
    throw new MarketGeocodingError(
      "MARKET_LOCATION_MISSING",
      "Für diesen Markt ist keine prüfbare Adresse hinterlegt. Bitte wende dich an einen Admin."
    );
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new MarketGeocodingError(
      "MARKET_GEOCODING_UNAVAILABLE",
      "Die Standortprüfung ist derzeit nicht konfiguriert. Bitte wende dich an einen Admin."
    );
  }

  let response: Response;
  try {
    const params = new URLSearchParams({ address: normalizedAddress, region: "at", key: apiKey });
    response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`, {
      cache: "no-store",
    });
  } catch {
    throw new MarketGeocodingError(
      "MARKET_GEOCODING_UNAVAILABLE",
      "Die Marktadresse konnte gerade nicht geprüft werden. Bitte versuche es erneut."
    );
  }

  const payload = await response.json().catch(() => null) as any;
  if (!response.ok || payload?.status !== "OK") {
    const code = payload?.status === "ZERO_RESULTS"
      ? "MARKET_GEOCODING_FAILED"
      : "MARKET_GEOCODING_UNAVAILABLE";
    throw new MarketGeocodingError(
      code,
      code === "MARKET_GEOCODING_FAILED"
        ? "Die hinterlegte Marktadresse konnte nicht eindeutig gefunden werden. Bitte wende dich an einen Admin."
        : "Die Marktadresse konnte gerade nicht geprüft werden. Bitte versuche es erneut."
    );
  }

  const firstResult = payload.results?.[0];
  const coordinates = {
    latitude: Number(firstResult?.geometry?.location?.lat),
    longitude: Number(firstResult?.geometry?.location?.lng),
  };
  if (!hasValidCoordinates(coordinates)) {
    throw new MarketGeocodingError(
      "MARKET_GEOCODING_FAILED",
      "Die hinterlegte Marktadresse lieferte keine gültige Position. Bitte wende dich an einen Admin."
    );
  }

  return {
    ...coordinates,
    formattedAddress: String(firstResult?.formatted_address || normalizedAddress),
  };
}
