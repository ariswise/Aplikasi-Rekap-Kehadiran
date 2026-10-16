export const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const INDONESIAN_DAYS = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

export const INDONESIAN_DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function formatIndonesianDate(dateString: string): string {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthName = INDONESIAN_MONTHS[monthIdx] || '';
  return `${day} ${monthName} ${year}`;
}

export function formatIndonesianDateWithDay(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString + 'T00:00:00');
  const dayName = INDONESIAN_DAYS[date.getDay()];
  return `${dayName}, ${formatIndonesianDate(dateString)}`;
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getDaysInMonth(year: number, month1Indexed: number): number {
  return new Date(year, month1Indexed, 0).getDate();
}

export function getDayOfWeek(year: number, month1Indexed: number, day: number): number {
  return new Date(year, month1Indexed - 1, day).getDay(); // 0 = Sunday, 1 = Monday, etc.
}

export function getWeekDates(baseDateString: string): string[] {
  // Returns Monday to Saturday of the week containing baseDateString
  const current = new Date(baseDateString + 'T00:00:00');
  const day = current.getDay();
  // distance to Monday (if Sunday (0), distance is -6)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);

  const dates: string[] = [];
  // Senin sampai Minggu (7 hari kalender, Sabtu & Minggu libur berwarna merah)
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${dayStr}`);
  }
  return dates;
}

export function getSemesterMonths(semester: '1' | '2'): { month: number; name: string }[] {
  if (semester === '1') {
    // Ganjil: Juli - Desember (Month 7 to 12)
    return [
      { month: 7, name: 'Juli' },
      { month: 8, name: 'Agustus' },
      { month: 9, name: 'September' },
      { month: 10, name: 'Oktober' },
      { month: 11, name: 'November' },
      { month: 12, name: 'Desember' }
    ];
  } else {
    // Genap: Januari - Juni (Month 1 to 6)
    return [
      { month: 1, name: 'Januari' },
      { month: 2, name: 'Februari' },
      { month: 3, name: 'Maret' },
      { month: 4, name: 'April' },
      { month: 5, name: 'Mei' },
      { month: 6, name: 'Juni' }
    ];
  }
}

export interface HolidayInfo {
  isOff: boolean;
  isSaturday: boolean;
  isSunday: boolean;
  isWeekend: boolean;
  isNationalHoliday: boolean;
  holidayName?: string;
  badgeLabel?: string;
}

export function checkDateHoliday(dateString: string, holidays?: { date: string; name: string }[]): HolidayInfo {
  if (!dateString) {
    return {
      isOff: false,
      isSaturday: false,
      isSunday: false,
      isWeekend: false,
      isNationalHoliday: false,
    };
  }
  const d = new Date(dateString + 'T00:00:00');
  const day = d.getDay();
  const isSaturday = day === 6;
  const isSunday = day === 0;
  const isWeekend = isSaturday || isSunday;

  const found = holidays?.find((h) => h.date === dateString);
  const isNationalHoliday = !!found;
  const isOff = isWeekend || isNationalHoliday;

  let holidayName = found?.name;
  if (!holidayName) {
    if (isSunday) holidayName = 'Hari Minggu (Libur)';
    else if (isSaturday) holidayName = 'Hari Sabtu (Libur)';
  }

  let badgeLabel = '';
  if (isNationalHoliday) badgeLabel = found!.name;
  else if (isSunday) badgeLabel = 'Minggu (Libur)';
  else if (isSaturday) badgeLabel = 'Sabtu (Libur)';

  return {
    isOff,
    isSaturday,
    isSunday,
    isWeekend,
    isNationalHoliday,
    holidayName,
    badgeLabel,
  };
}

export const DEFAULT_NATIONAL_HOLIDAYS_PRESET: Array<{ date: string; name: string }> = [
  { date: '2024-08-17', name: 'Hari Kemerdekaan RI Ke-79' },
  { date: '2024-09-16', name: 'Maulid Nabi Muhammad SAW' },
  { date: '2024-12-25', name: 'Hari Raya Natal' },
  { date: '2025-01-01', name: 'Tahun Baru 2025 Masehi' },
  { date: '2025-01-27', name: 'Isra Mi\'raj Nabi Muhammad SAW' },
  { date: '2025-01-29', name: 'Tahun Baru Imlek 2576 Kongzili' },
  { date: '2025-03-29', name: 'Hari Suci Nyepi (Tahun Baru Saka 1947)' },
  { date: '2025-03-31', name: 'Hari Raya Idul Fitri 1446 H (Hari ke-1)' },
  { date: '2025-04-01', name: 'Hari Raya Idul Fitri 1446 H (Hari ke-2)' },
  { date: '2025-04-18', name: 'Wafat Yesus Kristus (Jumat Agung)' },
  { date: '2025-04-20', name: 'Hari Paskah' },
  { date: '2025-05-01', name: 'Hari Buruh Internasional' },
  { date: '2025-05-12', name: 'Hari Raya Waisak 2569 BE' },
  { date: '2025-05-29', name: 'Kenaikan Yesus Kristus' },
  { date: '2025-06-01', name: 'Hari Lahir Pancasila' },
  { date: '2025-06-07', name: 'Hari Raya Idul Adha 1446 H' },
  { date: '2025-06-27', name: 'Tahun Baru Islam 1447 H' },
  { date: '2025-08-17', name: 'Hari Kemerdekaan RI Ke-80' },
  { date: '2025-09-05', name: 'Maulid Nabi Muhammad SAW' },
  { date: '2025-12-25', name: 'Hari Raya Natal' },
];
