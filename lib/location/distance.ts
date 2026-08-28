export const ASSIGNMENT_LOCATION_RADIUS_METERS = 300;

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export function hasValidCoordinates(value: Partial<Coordinates> | null | undefined): value is Coordinates {
  return Boolean(
    value
      && Number.isFinite(value.latitude)
      && Number.isFinite(value.longitude)
      && Number(value.latitude) >= -90
      && Number(value.latitude) <= 90
      && Number(value.longitude) >= -180
      && Number(value.longitude) <= 180
  );
}

function toRadians(value: number): number {
  return value * Math.PI / 180;
}

export function calculateDistanceMeters(from: Coordinates, to: Coordinates): number {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusMeters * centralAngle;
}
