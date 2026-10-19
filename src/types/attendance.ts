export type AttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpa' | 'unmarked';

export type Gender = 'L' | 'P';

export type SchoolLevel = 'SD' | 'MI' | 'SMP' | 'MTs' | 'SMA' | 'MA' | 'SMK';

export type Semester = '1' | '2'; // 1 = Ganjil, 2 = Genap

export type UserRole = 'wali_kelas' | 'guru_bk' | 'admin' | 'kepala_sekolah';

export interface Student {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  gender: Gender;
  classRoom: string;
  parentPhone?: string;
  parentName?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  isLate?: boolean; // Indikator Keterlambatan (bisa aktif bersamaan dengan status Hadir)
  lateMinutes?: number; // Menit keterlambatan (opsional, misal: 15)
  arrivalTime?: string; // e.g. "06:45"
  notes?: string;
  updatedAt: string;
}

export interface DailyAttendanceRecord {
  date: string; // YYYY-MM-DD
  classRoom: string;
  entries: Record<string, AttendanceEntry>; // studentId -> AttendanceEntry
}

export interface KopConfig {
  showKop: boolean;
  parentAgency: string; // e.g. "PEMERINTAH PROVINSI ... DINAS PENDIDIKAN"
  subAgency?: string;   // e.g. "CABANG DINAS WILAYAH I"
  schoolName: string;
  subTitle: string;     // e.g. "TERAKREDITASI A · NPSN: 20108976"
  address: string;
  contactInfo: string;  // Telp, email, web
  postalCode: string;
  logoUrl?: string;     // Base64 data or SVG string
  logoRightUrl?: string; // Secondary logo (e.g. Pemda/Yayasan)
  logoPosition: 'left' | 'left_right' | 'center' | 'none';
  logoWidth: number;    // Width in px (default 65-80)
  lineStyle: 'double' | 'single' | 'bold' | 'none';
  paperSize: 'A4' | 'F4' | 'Legal';
  orientation: 'portrait' | 'landscape';
  fontSize: 'compact' | 'normal' | 'spacious';
  signCity: string;
  signDate: string;
  showHeadmasterSign: boolean;
  showHomeroomSign: boolean;
  showCounselorSign: boolean;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  nip?: string;
  allowedClasses?: string[]; // Hak akses spesifik rombel/kelas (hanya rombel tertentu yang dapat diakses)
}

export interface StoredAccount {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  nip?: string;
  allowedClasses?: string[]; // Hak akses spesifik rombel/kelas
  createdAt: string;
}

export interface HolidayConfig {
  date: string; // YYYY-MM-DD
  name: string; // e.g. "Tahun Baru Masehi", "Hari Raya Idul Fitri"
}

export interface ClassTeacherConfig {
  homeroomTeacher: string;
  homeroomTeacherNip: string;
}

export interface SchoolConfig {
  schoolName: string;
  schoolLevel: SchoolLevel;
  npsn: string;
  address: string;
  postalCode?: string; // e.g., "12340"
  academicYear: string; // e.g., "2024/2025"
  semester: Semester;
  currentClass: string; // Active class e.g., "X-RPL 1" or "VII A"
  availableClasses: string[];
  homeroomTeacher: string; // Nama Wali Kelas aktif/default
  homeroomTeacherNip: string;
  counselorTeacher: string; // Guru BK
  counselorTeacherNip: string;
  headmaster: string; // Kepala Sekolah
  headmasterNip: string;
  city: string; // e.g., "Jakarta" or "Surabaya"
  kopConfig?: KopConfig;
  classTeachers?: Record<string, ClassTeacherConfig>; // Wali kelas per rombel
  holidays?: HolidayConfig[]; // Daftar hari libur nasional & sekolah
}

export type FollowUpStatus = 'belum' | 'konseling_wali' | 'bimbingan_bk' | 'surat_terbit' | 'home_visit' | 'selesai';

export interface FollowUpCase {
  id: string;
  studentId: string;
  studentName: string;
  classRoom: string;
  alpaCount: number;
  sakitCount: number;
  izinCount: number;
  lateCount?: number; // Jumlah keterlambatan dalam semester
  totalAbsences: number;
  severityLevel: 'rendah' | 'sedang' | 'tinggi' | 'kritis';
  caseType?: 'alpa' | 'keterlambatan' | 'kombinasi';
  status: FollowUpStatus;
  actionNotes: string;
  lastUpdated: string;
  letterIssuedDate?: string;
  letterNumber?: string;
}

export interface FirebaseSyncConfig {
  enabled: boolean;
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  lastSyncTime?: string;
}

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
}
