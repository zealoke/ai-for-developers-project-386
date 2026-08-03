// Небольшой резервный список на случай окружений без Intl.supportedValuesOf
// (некоторые версии Node/старые браузеры). В остальных случаях используется
// полный список IANA-имён из движка.
const FALLBACK_TIME_ZONES = [
  'UTC',
  'Europe/Moscow',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Yekaterinburg',
  'Asia/Novosibirsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Vladivostok',
  'Asia/Almaty',
  'Asia/Tashkent',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
];

export function getSupportedTimeZones(): string[] {
  if (typeof Intl.supportedValuesOf === 'function') {
    try {
      return Intl.supportedValuesOf('timeZone');
    } catch {
      // ignore и используем резервный список
    }
  }
  return FALLBACK_TIME_ZONES;
}
