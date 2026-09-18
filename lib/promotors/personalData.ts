export type PersonalDataForm = {
  phone: string;
  email: string;
  addressLine: string;
  postalCode: string;
  city: string;
  birthDate: string;
};

export type PersonalDataErrors = Partial<Record<keyof PersonalDataForm, string>>;

export function toDateInputValue(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const localMatch = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return localMatch ? `${localMatch[3]}-${localMatch[2]}-${localMatch[1]}` : '';
}

export function isValidDateInput(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidPhoneNumber(value: string): boolean {
  return /^[+0-9()\/.\s-]{6,30}$/.test(value.trim());
}

export function validatePersonalData(form: PersonalDataForm): PersonalDataErrors {
  const errors: PersonalDataErrors = {};
  if (form.phone.trim() && !isValidPhoneNumber(form.phone)) {
    errors.phone = 'Bitte eine gültige Telefonnummer eingeben.';
  }
  if (!form.email.trim()) {
    errors.email = 'Bitte eine E-Mail-Adresse eingeben.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Bitte eine gültige E-Mail-Adresse eingeben.';
  }
  if (form.postalCode.trim() && !/^\d{4}$/.test(form.postalCode.trim())) {
    errors.postalCode = 'Die österreichische PLZ muss aus vier Ziffern bestehen.';
  }
  if (form.birthDate && !isValidDateInput(form.birthDate)) {
    errors.birthDate = 'Bitte ein gültiges Geburtsdatum eingeben.';
  }
  return errors;
}

export function formatBirthDate(value: unknown): string {
  const normalized = toDateInputValue(value);
  if (!normalized || !isValidDateInput(normalized)) return String(value || '') || 'Keine Angabe';
  const [year, month, day] = normalized.split('-');
  return `${day}.${month}.${year}`;
}

export function formatAddress(addressLine: unknown, postalCode: unknown, city: unknown): string {
  const street = String(addressLine || '').trim();
  const locality = [String(postalCode || '').trim(), String(city || '').trim()].filter(Boolean).join(' ');
  return [street, locality].filter(Boolean).join(', ');
}
