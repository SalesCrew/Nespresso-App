const NON_DIGITS = /\D/g;

export function digitsOnly(value: string | null | undefined): string {
  return String(value ?? '').replace(NON_DIGITS, '');
}

export function getBirthDateSvSuffix(birthDate: string | null | undefined): string | null {
  const value = String(birthDate ?? '').trim();
  let day: string;
  let month: string;
  let year: string;

  const germanDate = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const compactDate = value.match(/^(\d{2})(\d{2})(\d{4})$/);

  if (germanDate) {
    [, day, month, year] = germanDate;
  } else if (isoDate) {
    [, year, month, day] = isoDate;
  } else if (compactDate) {
    [, day, month, year] = compactDate;
  } else {
    return null;
  }

  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    parsed.getUTCFullYear() !== Number(year)
    || parsed.getUTCMonth() !== Number(month) - 1
    || parsed.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return `${day}${month}${year.slice(-2)}`;
}

export function normalizeSocialSecurityNumber(
  value: string | null | undefined,
  birthDate: string | null | undefined,
): string {
  const digits = digitsOnly(value);
  const birthSuffix = getBirthDateSvSuffix(birthDate);
  if (!digits || !birthSuffix) return digits;

  if (digits.length === 4) return `${digits}${birthSuffix}`;
  if (digits.length === 10 && digits.endsWith(birthSuffix)) return digits;
  if (digits.length === 10 && digits.startsWith(birthSuffix)) {
    return `${digits.slice(6)}${birthSuffix}`;
  }
  if (digits.length === 16 && digits.startsWith(birthSuffix) && digits.endsWith(birthSuffix)) {
    return `${digits.slice(6, 10)}${birthSuffix}`;
  }

  return digits;
}

export function getSocialSecuritySerial(
  value: string | null | undefined,
  birthDate: string | null | undefined,
): string {
  const digits = digitsOnly(value);
  const birthSuffix = getBirthDateSvSuffix(birthDate);
  if (!birthSuffix) return digits.slice(0, 4);

  const normalized = normalizeSocialSecurityNumber(digits, birthDate);
  if (normalized.length === 10 && normalized.endsWith(birthSuffix)) {
    return normalized.slice(0, 4);
  }
  if (digits.startsWith(birthSuffix)) return digits.slice(6, 10);
  return digits.slice(0, 4);
}

export function composeSocialSecurityNumber(
  serial: string | null | undefined,
  birthDate: string | null | undefined,
): string {
  const serialDigits = digitsOnly(serial).slice(0, 4);
  const birthSuffix = getBirthDateSvSuffix(birthDate);
  return birthSuffix ? `${serialDigits}${birthSuffix}` : serialDigits;
}

export function isValidSocialSecurityNumber(
  value: string | null | undefined,
  birthDate: string | null | undefined,
): boolean {
  const digits = digitsOnly(value);
  const birthSuffix = getBirthDateSvSuffix(birthDate);
  return digits.length === 10 && birthSuffix !== null && digits.endsWith(birthSuffix);
}
