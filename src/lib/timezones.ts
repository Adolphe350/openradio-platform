export type StationTimezoneOption = {
  value: string;
  label: string;
  region: string;
};

export const STATION_TIMEZONES: StationTimezoneOption[] = [
  { value: "UTC", label: "UTC / Coordinated Universal Time", region: "Global" },

  { value: "Africa/Kigali", label: "Rwanda — Kigali", region: "Africa" },
  { value: "Africa/Nairobi", label: "East Africa — Nairobi / Kampala / Dar es Salaam", region: "Africa" },
  { value: "Africa/Lagos", label: "West Africa — Lagos", region: "Africa" },
  { value: "Africa/Accra", label: "Ghana — Accra", region: "Africa" },
  { value: "Africa/Johannesburg", label: "South Africa — Johannesburg", region: "Africa" },
  { value: "Africa/Cairo", label: "Egypt — Cairo", region: "Africa" },
  { value: "Africa/Casablanca", label: "Morocco — Casablanca", region: "Africa" },

  { value: "America/New_York", label: "US Eastern — New York", region: "Americas" },
  { value: "America/Chicago", label: "US Central — Chicago", region: "Americas" },
  { value: "America/Denver", label: "US Mountain — Denver", region: "Americas" },
  { value: "America/Los_Angeles", label: "US Pacific — Los Angeles", region: "Americas" },
  { value: "America/Toronto", label: "Canada Eastern — Toronto", region: "Americas" },
  { value: "America/Vancouver", label: "Canada Pacific — Vancouver", region: "Americas" },
  { value: "America/Mexico_City", label: "Mexico — Mexico City", region: "Americas" },
  { value: "America/Sao_Paulo", label: "Brazil — São Paulo", region: "Americas" },
  { value: "America/Bogota", label: "Colombia — Bogotá", region: "Americas" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina — Buenos Aires", region: "Americas" },

  { value: "Europe/London", label: "United Kingdom — London", region: "Europe" },
  { value: "Europe/Paris", label: "France — Paris", region: "Europe" },
  { value: "Europe/Berlin", label: "Germany — Berlin", region: "Europe" },
  { value: "Europe/Madrid", label: "Spain — Madrid", region: "Europe" },
  { value: "Europe/Rome", label: "Italy — Rome", region: "Europe" },
  { value: "Europe/Brussels", label: "Belgium — Brussels", region: "Europe" },
  { value: "Europe/Amsterdam", label: "Netherlands — Amsterdam", region: "Europe" },
  { value: "Europe/Istanbul", label: "Türkiye — Istanbul", region: "Europe" },

  { value: "Asia/Dubai", label: "UAE — Dubai", region: "Asia" },
  { value: "Asia/Kolkata", label: "India — Kolkata", region: "Asia" },
  { value: "Asia/Tokyo", label: "Japan — Tokyo", region: "Asia" },
  { value: "Asia/Shanghai", label: "China — Shanghai", region: "Asia" },
  { value: "Asia/Singapore", label: "Singapore", region: "Asia" },
  { value: "Asia/Seoul", label: "South Korea — Seoul", region: "Asia" },
  { value: "Asia/Jakarta", label: "Indonesia — Jakarta", region: "Asia" },

  { value: "Australia/Sydney", label: "Australia — Sydney", region: "Oceania" },
  { value: "Pacific/Auckland", label: "New Zealand — Auckland", region: "Oceania" },
];

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || timeZone.length > 80) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeStationTimeZone(timeZone: string | null | undefined, fallback = "UTC"): string {
  const candidate = timeZone?.trim() || fallback;
  return isValidTimeZone(candidate) ? candidate : fallback;
}

export function stationTimezoneLabel(timeZone: string | null | undefined): string {
  const normalized = normalizeStationTimeZone(timeZone);
  return STATION_TIMEZONES.find((tz) => tz.value === normalized)?.label ?? normalized;
}
