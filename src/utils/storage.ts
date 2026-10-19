import { Student, SchoolConfig, DailyAttendanceRecord, FollowUpCase, FirebaseSyncConfig, KopConfig, AuthUser, StoredAccount } from '../types/attendance';
import firebaseAppletConfig from '../../firebase-applet-config.json';

export const DEFAULT_LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="48" fill="%231E40AF" stroke="%23F59E0B" stroke-width="3"/><circle cx="50" cy="50" r="43" fill="%231D4ED8"/><path d="M50 18 L53 25 L60 25 L54 30 L56 37 L50 32 L44 37 L46 30 L40 25 L47 25 Z" fill="%23FBBF24"/><path d="M50 38 Q50 48 40 50 Q50 52 50 62 Q50 52 60 50 Q50 48 50 38 Z" fill="%23EF4444"/><path d="M30 68 C38 60 46 62 50 65 C54 62 62 60 70 68 L70 76 C62 68 54 70 50 73 C46 70 38 68 30 76 Z" fill="%23F8FAFC"/><path d="M50 65 L50 82" stroke="%23CBD5E1" stroke-width="2"/><text x="50" y="93" font-size="6.5" font-weight="bold" fill="%23FDE047" text-anchor="middle" font-family="sans-serif">TUT WURI HANDAYANI</text></svg>`;

export const DEFAULT_KOP_CONFIG: KopConfig = {
  showKop: true,
  parentAgency: 'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA\nDINAS PENDIDIKAN',
  subAgency: 'SUKU DINAS PENDIDIKAN WILAYAH I KOTA ADMINISTRASI JAKARTA SELATAN',
  schoolName: 'SMA NEGERI 1 NUSANTARA',
  subTitle: 'TERAKREDITASI A · NPSN: 20108976',
  address: 'Jl. Pendidikan Merdeka No. 45, Kompleks Pelajar, Jakarta Selatan',
  contactInfo: 'Telp: (021) 7891234 · Pos-el: info@sman1nusantara.sch.id · Laman: www.sman1nusantara.sch.id',
  postalCode: '12340',
  logoUrl: DEFAULT_LOGO_SVG,
  logoRightUrl: '',
  logoPosition: 'left',
  logoWidth: 70,
  lineStyle: 'double',
  paperSize: 'A4',
  orientation: 'portrait',
  fontSize: 'normal',
  signCity: 'Jakarta Selatan',
  signDate: '',
  showHeadmasterSign: true,
  showHomeroomSign: true,
  showCounselorSign: true,
};

const STORAGE_KEYS = {
  SCHOOL_CONFIG: 'rekap_kehadiran_school_config_v1',
  STUDENTS: 'rekap_kehadiran_students_v1',
  ATTENDANCE: 'rekap_kehadiran_daily_records_v1',
  FOLLOW_UPS: 'rekap_kehadiran_follow_ups_v1',
  FIREBASE_CONFIG: 'rekap_kehadiran_firebase_config_v1',
  ACTIVE_ROLE: 'rekap_kehadiran_active_role_v1',
  AUTH_USER: 'rekap_kehadiran_logged_in_user_v1',
  ACCOUNTS: 'rekap_kehadiran_accounts_v2',
  HAS_INITIALIZED: 'rekap_kehadiran_initialized_v1',
};

export const DEFAULT_ACCOUNTS: StoredAccount[] = [
  {
    id: 'acc-admin-01',
    username: 'admin',
    password: 'AdminGanteng93',
    name: 'Administrator Sekolah',
    role: 'admin',
    nip: '19790812 200312 1 004',
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_SCHOOL_CONFIG: SchoolConfig = {
  schoolName: 'SMA Negeri 1 Nusantara',
  schoolLevel: 'SMA',
  npsn: '20108976',
  address: 'Jl. Pendidikan Merdeka No. 45, Kompleks Pelajar',
  postalCode: '12340',
  academicYear: '2024/2025',
  semester: '1',
  currentClass: 'X-MIPA 1',
  availableClasses: ['X-MIPA 1', 'X-MIPA 2', 'XI-MIPA 1', 'XII-MIPA 1'],
  homeroomTeacher: 'Budi Santoso, S.Pd., M.Pd.',
  homeroomTeacherNip: '19820415 200801 1 008',
  counselorTeacher: 'Guru Bimbingan Konseling',
  counselorTeacherNip: '-',
  headmaster: 'Drs. H. Mulyadi, M.M.',
  headmasterNip: '19700312 199512 1 002',
  city: 'Jakarta Selatan',
  kopConfig: DEFAULT_KOP_CONFIG,
  classTeachers: {
    'X-MIPA 1': { homeroomTeacher: 'Budi Santoso, S.Pd., M.Pd.', homeroomTeacherNip: '19820415 200801 1 008' },
    'X-MIPA 2': { homeroomTeacher: 'Dewi Lestari, S.Pd.', homeroomTeacherNip: '19850322 201101 2 009' },
    'XI-MIPA 1': { homeroomTeacher: 'Drs. Hendro Wibowo', homeroomTeacherNip: '19760714 200212 1 003' },
    'XII-MIPA 1': { homeroomTeacher: 'Sri Wahyuni, M.Pd.', homeroomTeacherNip: '19801105 200604 2 012' },
  },
  holidays: [
    { date: '2024-08-17', name: 'Hari Kemerdekaan RI Ke-79' },
    { date: '2024-09-16', name: 'Maulid Nabi Muhammad SAW' },
    { date: '2024-12-25', name: 'Hari Raya Natal' },
    { date: '2025-01-01', name: 'Tahun Baru 2025 Masehi' },
    { date: '2025-01-27', name: 'Isra Mi\'raj Nabi Muhammad SAW' },
    { date: '2025-01-29', name: 'Tahun Baru Imlek 2576' },
    { date: '2025-03-29', name: 'Hari Suci Nyepi' },
    { date: '2025-03-31', name: 'Hari Raya Idul Fitri 1446 H' },
    { date: '2025-04-01', name: 'Hari Raya Idul Fitri 1446 H' },
    { date: '2025-05-01', name: 'Hari Buruh Internasional' },
    { date: '2025-05-12', name: 'Hari Raya Waisak 2569 BE' },
    { date: '2025-05-29', name: 'Kenaikan Yesus Kristus' },
    { date: '2025-06-01', name: 'Hari Lahir Pancasila' },
    { date: '2025-06-07', name: 'Hari Raya Idul Adha 1446 H' },
    { date: '2025-08-17', name: 'Hari Kemerdekaan RI Ke-80' },
  ],
};

export function getHomeroomTeacherForClass(config: SchoolConfig, classRoom?: string): { name: string; nip: string } {
  const targetClass = classRoom || config.currentClass;
  const perClass = config.classTeachers?.[targetClass];
  if (perClass && perClass.homeroomTeacher) {
    return {
      name: perClass.homeroomTeacher,
      nip: perClass.homeroomTeacherNip || '',
    };
  }
  return {
    name: config.homeroomTeacher || '',
    nip: config.homeroomTeacherNip || '',
  };
}

// Clear test sample students (disclosed as sample / uji coba)
export const SAMPLE_STUDENTS: Student[] = [
  {
    id: 'std-001',
    nis: '2401',
    nisn: '0071234561',
    name: 'Ahmad Faiz Pratama',
    gender: 'L',
    classRoom: 'X-MIPA 1',
    parentName: 'H. Bambang Pratama',
    parentPhone: '081234567890',
    address: 'Jl. Melati No. 12',
    notes: 'Ketua Kelas',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'std-002',
    nis: '2402',
    nisn: '0071234562',
    name: 'Anisa Putri Maharani',
    gender: 'P',
    classRoom: 'X-MIPA 1',
    parentName: 'Rudi Hartono',
    parentPhone: '081298765432',
    address: 'Jl. Kenanga Indah No. 5',
    notes: 'Wakil Ketua Kelas',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'std-003',
    nis: '2403',
    nisn: '0071234563',
    name: 'Bagas Aditya Nugraha',
    gender: 'L',
    classRoom: 'X-MIPA 1',
    parentName: 'Agus Nugraha',
    parentPhone: '081345678912',
    address: 'Jl. Dahlia Raya No. 19',
    notes: 'Anggota OSIS',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'std-004',
    nis: '2404',
    nisn: '0071234564',
    name: 'Cantika Dewi Lestari',
    gender: 'P',
    classRoom: 'X-MIPA 1',
    parentName: 'Suryadi Lestari',
    parentPhone: '081567891234',
    address: 'Jl. Cempaka Putih No. 8',
    notes: 'Sekretaris Kelas',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'std-005',
    nis: '2405',
    nisn: '0071234565',
    name: 'Dimas Arya Saputra',
    gender: 'L',
    classRoom: 'X-MIPA 1',
    parentName: 'Hendra Saputra',
    parentPhone: '081789123456',
    address: 'Jl. Flamboyan Blok B No. 3',
    notes: 'Perlu pantauan kehadiran',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'std-006',
    nis: '2406',
    nisn: '0071234566',
    name: 'Fadhilah Nur Aini',
    gender: 'P',
    classRoom: 'X-MIPA 1',
    parentName: 'Drs. Usman Ali',
    parentPhone: '081890123456',
    address: 'Jl. Anggrek No. 27',
    notes: '',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'std-007',
    nis: '2407',
    nisn: '0071234567',
    name: 'Gilang Ramadhan',
    gender: 'L',
    classRoom: 'X-MIPA 1',
    parentName: 'M. Yusuf',
    parentPhone: '081901234567',
    address: 'Jl. Mawar No. 4',
    notes: '',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'std-008',
    nis: '2408',
    nisn: '0071234568',
    name: 'Hafizah Azzahra',
    gender: 'P',
    classRoom: 'X-MIPA 1',
    parentName: 'Syamsul Bahri',
    parentPhone: '081234123412',
    address: 'Jl. Wijaya Kusuma No. 11',
    notes: 'Bendahara Kelas',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'std-009',
    nis: '2409',
    nisn: '0071234569',
    name: 'Irfan Maulana Akbar',
    gender: 'L',
    classRoom: 'X-MIPA 1',
    parentName: 'Kusuma Wardana',
    parentPhone: '081398761234',
    address: 'Jl. Teratai Mas No. 9',
    notes: '',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'std-010',
    nis: '2410',
    nisn: '0071234570',
    name: 'Jessica Novita Sari',
    gender: 'P',
    classRoom: 'X-MIPA 1',
    parentName: 'Toni Wijaya',
    parentPhone: '081456782345',
    address: 'Jl. Bougenville No. 15',
    notes: '',
    createdAt: new Date().toISOString(),
  },
];

// Helper to seed sample attendance records across several days for demonstration
export function generateSampleAttendance(students: Student[], classRoom: string): Record<string, DailyAttendanceRecord> {
  const records: Record<string, DailyAttendanceRecord> = {};
  const today = new Date();
  
  // Create records for the last 10 days
  for (let i = 9; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0) continue; // Skip Sunday

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${dayStr}`;

    const entries: DailyAttendanceRecord['entries'] = {};

    students.forEach((s, idx) => {
      // Simulate realistic attendance: mostly Hadir, some Sakit, Izin, Alpa, and Terlambat
      let status: 'hadir' | 'sakit' | 'izin' | 'alpa' | 'unmarked' = 'hadir';
      let isLate = false;
      let lateMinutes = 0;
      let arrivalTime = '06:50';
      let notes = '';

      if (s.name.includes('Dimas')) {
        // Dimas has some Alpa and Sakit for Early Warning alert demonstration
        if (i % 3 === 0) {
          status = 'alpa';
          arrivalTime = '';
          notes = 'Tanpa surat keterangan';
        } else if (i % 5 === 0) {
          status = 'sakit';
          arrivalTime = '';
          notes = 'Demam';
        }
      } else if (s.name.includes('Gilang')) {
        // Gilang frequently arrives late (triggers Keterlambatan warning & panggilan ortu > 4x)
        if (i % 2 === 0 || i === 1) {
          status = 'hadir';
          isLate = true;
          lateMinutes = 15 + (i * 3);
          arrivalTime = `07:${String(15 + (i * 2)).padStart(2, '0')}`;
          notes = 'Terlambat masuk gerbang';
        }
      } else if (s.name.includes('Bagas')) {
        // Bagas has 3-4 late entries (triggers Keterlambatan peringatan)
        if (i === 1 || i === 3 || i === 5 || i === 7) {
          status = 'hadir';
          isLate = true;
          lateMinutes = 20;
          arrivalTime = '07:20';
          notes = 'Kendala transportasi / macet';
        }
      } else if (idx === 2 && i === 1) {
        status = 'sakit';
        notes = 'Flu disertai batuk';
      } else if (idx === 6 && i === 3) {
        status = 'izin';
        notes = 'Acara keluarga di luar kota';
      } else if (i === 0 && idx >= 8) {
        // For today, leave 2 students as "Belum Diisi" to verify "Belum Diisi" requirement!
        status = 'unmarked';
        arrivalTime = '';
      }

      // Today's late student demo
      if (i === 0 && idx === 1) {
        status = 'hadir';
        isLate = true;
        lateMinutes = 15;
        arrivalTime = '07:15';
        notes = 'Ban sepeda bocor';
      }

      entries[s.id] = {
        studentId: s.id,
        status,
        isLate,
        lateMinutes: isLate ? lateMinutes : undefined,
        arrivalTime: status === 'hadir' ? arrivalTime : undefined,
        notes,
        updatedAt: new Date().toISOString(),
      };
    });

    records[`${classRoom}_${dateKey}`] = {
      date: dateKey,
      classRoom,
      entries,
    };
  }

  return records;
}

export const StorageService = {
  getSchoolConfig(): SchoolConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCHOOL_CONFIG);
      if (data) {
        const parsed = JSON.parse(data);
        if (!parsed.kopConfig) {
          parsed.kopConfig = DEFAULT_KOP_CONFIG;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to read school config', e);
    }
    return DEFAULT_SCHOOL_CONFIG;
  },

  saveSchoolConfig(config: SchoolConfig): void {
    if (!config.kopConfig) {
      config.kopConfig = DEFAULT_KOP_CONFIG;
    }
    localStorage.setItem(STORAGE_KEYS.SCHOOL_CONFIG, JSON.stringify(config));
  },

  getKopConfig(): KopConfig {
    const config = this.getSchoolConfig();
    return config.kopConfig || DEFAULT_KOP_CONFIG;
  },

  saveKopConfig(kop: KopConfig): void {
    const config = this.getSchoolConfig();
    config.kopConfig = kop;
    this.saveSchoolConfig(config);
  },

  getLoggedInUser(): AuthUser | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read logged in user', e);
    }
    return null;
  },

  setLoggedInUser(user: AuthUser | null): void {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }
  },

  getAccounts(): StoredAccount[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      if (data) {
        const parsed: StoredAccount[] = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter(
            (a) => a.id !== 'acc-bk-01' && a.username !== 'gurubk' && !a.name.includes('Siti Rahmawati')
          );
          if (cleaned.length !== parsed.length) {
            this.saveAccounts(cleaned);
          }
          return cleaned.length > 0 ? cleaned : DEFAULT_ACCOUNTS;
        }
      }
    } catch (e) {
      console.error('Failed to read accounts', e);
    }
    // Default fallback
    this.saveAccounts(DEFAULT_ACCOUNTS);
    return DEFAULT_ACCOUNTS;
  },

  saveAccounts(accounts: StoredAccount[]): void {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  },

  authenticateUser(usernameInput: string, passwordInput: string): AuthUser | null {
    const accounts = this.getAccounts();
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    const matched = accounts.find(
      (acc) => acc.username.toLowerCase() === cleanUser && acc.password === cleanPass
    );

    if (matched) {
      return {
        id: matched.id,
        username: matched.username,
        name: matched.name,
        role: matched.role,
        nip: matched.nip,
        allowedClasses: matched.allowedClasses,
      };
    }

    return null;
  },

  getStudents(classRoom?: string): Student[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (data) {
        const list: Student[] = JSON.parse(data);
        if (classRoom) {
          return list.filter((s) => s.classRoom === classRoom);
        }
        return list;
      }
    } catch (e) {
      console.error('Failed to read students', e);
    }
    return [];
  },

  saveStudents(students: Student[]): void {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  },

  getAllAttendanceRecords(): Record<string, DailyAttendanceRecord> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read attendance records', e);
    }
    return {};
  },

  saveDailyAttendance(record: DailyAttendanceRecord): void {
    const all = this.getAllAttendanceRecords();
    const key = `${record.classRoom}_${record.date}`;
    all[key] = record;
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(all));
  },

  getDailyAttendance(classRoom: string, date: string): DailyAttendanceRecord | null {
    const all = this.getAllAttendanceRecords();
    return all[`${classRoom}_${date}`] || null;
  },

  getFollowUpCases(): FollowUpCase[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FOLLOW_UPS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read follow up cases', e);
    }
    return [];
  },

  saveFollowUpCases(cases: FollowUpCase[]): void {
    localStorage.setItem(STORAGE_KEYS.FOLLOW_UPS, JSON.stringify(cases));
  },

  getFirebaseConfig(): FirebaseSyncConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...parsed,
          projectId: parsed.projectId || firebaseAppletConfig.projectId || '',
          apiKey: parsed.apiKey || firebaseAppletConfig.apiKey || '',
          authDomain: parsed.authDomain || firebaseAppletConfig.authDomain || '',
          storageBucket: parsed.storageBucket || firebaseAppletConfig.storageBucket || '',
          appId: parsed.appId || firebaseAppletConfig.appId || '',
        };
      }
    } catch (e) {
      console.error('Failed to read firebase config', e);
    }
    return {
      enabled: true,
      apiKey: firebaseAppletConfig.apiKey || '',
      authDomain: firebaseAppletConfig.authDomain || '',
      projectId: firebaseAppletConfig.projectId || '',
      storageBucket: firebaseAppletConfig.storageBucket || '',
      messagingSenderId: firebaseAppletConfig.messagingSenderId || '',
      appId: firebaseAppletConfig.appId || '',
    };
  },

  saveFirebaseConfig(config: FirebaseSyncConfig): void {
    localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(config));
  },

  // Export all application state to JSON
  exportFullBackup(): string {
    const backup = {
      exportedAt: new Date().toISOString(),
      app: 'APLIKASI REKAP KEHADIRAN',
      version: '1.0',
      schoolConfig: this.getSchoolConfig(),
      students: this.getStudents(),
      attendanceRecords: this.getAllAttendanceRecords(),
      followUps: this.getFollowUpCases(),
      accounts: this.getAccounts(),
    };
    return JSON.stringify(backup, null, 2);
  },

  // Restore application state from JSON
  restoreFullBackup(jsonContent: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed.students && !parsed.schoolConfig) {
        return { success: false, message: 'Format berkas JSON cadangan tidak valid.' };
      }
      if (parsed.schoolConfig) this.saveSchoolConfig(parsed.schoolConfig);
      if (parsed.students) this.saveStudents(parsed.students);
      if (parsed.attendanceRecords) {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(parsed.attendanceRecords));
      }
      if (parsed.followUps) this.saveFollowUpCases(parsed.followUps);
      if (parsed.accounts && Array.isArray(parsed.accounts)) {
        this.saveAccounts(parsed.accounts);
      }
      return { success: true, message: 'Data cadangan berhasil dipulihkan secara lengkap!' };
    } catch (err) {
      return { success: false, message: 'Gagal memproses berkas JSON: ' + (err instanceof Error ? err.message : 'Error') };
    }
  },

  // Initialize or Seed with test sample dataset
  seedSampleData(): void {
    this.saveSchoolConfig(DEFAULT_SCHOOL_CONFIG);
    this.saveStudents(SAMPLE_STUDENTS);
    const sampleRecords = generateSampleAttendance(SAMPLE_STUDENTS, DEFAULT_SCHOOL_CONFIG.currentClass);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(sampleRecords));
    localStorage.setItem(STORAGE_KEYS.HAS_INITIALIZED, 'true');
  },

  // Clear all data to pristine clean state
  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.STUDENTS);
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    localStorage.removeItem(STORAGE_KEYS.FOLLOW_UPS);
    localStorage.setItem(STORAGE_KEYS.SCHOOL_CONFIG, JSON.stringify(DEFAULT_SCHOOL_CONFIG));
    localStorage.setItem(STORAGE_KEYS.HAS_INITIALIZED, 'true');
  },

  isInitialized(): boolean {
    return localStorage.getItem(STORAGE_KEYS.HAS_INITIALIZED) === 'true';
  }
};
