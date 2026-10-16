import React, { useState, useRef } from 'react';
import {
  SchoolConfig,
  SchoolLevel,
  Semester,
  FirebaseSyncConfig,
  KopConfig,
  Student,
  DailyAttendanceRecord,
  FollowUpCase,
  HolidayConfig,
  ClassTeacherConfig,
} from '../types/attendance';
import { StorageService, DEFAULT_KOP_CONFIG } from '../utils/storage';
import { FirebaseService } from '../utils/firebase';
import {
  DEFAULT_NATIONAL_HOLIDAYS_PRESET,
  formatIndonesianDate,
  INDONESIAN_DAYS,
  checkDateHoliday,
} from '../utils/date';
import { KopSuratView } from './KopSuratView';
import { KopConfigDrawer } from './KopConfigDrawer';
import {
  School,
  Database,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Check,
  ShieldAlert,
  Save,
  Plus,
  X,
  FileJson,
  Layers,
  FileText,
  CheckCircle2,
  AlertCircle,
  Server,
  Wifi,
  WifiOff,
  Zap,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Calendar,
  CalendarDays,
  Sparkles,
  Edit3,
  Search,
} from 'lucide-react';

interface SchoolSettingsProps {
  schoolConfig: SchoolConfig;
  onSaveSchoolConfig: (config: SchoolConfig) => void;
  onReloadAllData: () => void;
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  students?: Student[];
  allRecords?: Record<string, DailyAttendanceRecord>;
  followUpCases?: FollowUpCase[];
}

export const SchoolSettings: React.FC<SchoolSettingsProps> = ({
  schoolConfig,
  onSaveSchoolConfig,
  onReloadAllData,
  onShowToast,
  students = [],
  allRecords = {},
  followUpCases = [],
}) => {
  // Local form state
  const [config, setConfig] = useState<SchoolConfig>(schoolConfig);
  const [newClassName, setNewClassName] = useState<string>('');
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseSyncConfig>(
    StorageService.getFirebaseConfig()
  );
  const [activeSettingsTab, setActiveSettingsTab] = useState<'identitas' | 'libur' | 'kop' | 'kelas' | 'backup' | 'firebase'>('identitas');

  // Selected class for managing homeroom teacher
  const [selectedClassForTeacher, setSelectedClassForTeacher] = useState<string>(
    schoolConfig.currentClass || schoolConfig.availableClasses[0] || 'X-MIPA 1'
  );

  // Holiday management state
  const [holidayDate, setHolidayDate] = useState<string>('');
  const [holidayName, setHolidayName] = useState<string>('');
  const [holidaySearchQuery, setHolidaySearchQuery] = useState<string>('');
  const [editingHolidayDate, setEditingHolidayDate] = useState<string | null>(null);

  // Keep local config in sync if parent schoolConfig changes (e.g. class switched in header)
  React.useEffect(() => {
    setConfig(schoolConfig);
    if (schoolConfig.currentClass) {
      setSelectedClassForTeacher(schoolConfig.currentClass);
    }
  }, [schoolConfig]);

  // Firebase testing and sync states
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    details?: string;
  } | null>(null);
  const [syncingCloud, setSyncingCloud] = useState<'upload' | 'download' | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const fileRestoreRef = useRef<HTMLInputElement | null>(null);

  // Update Homeroom Teacher for a specific class
  const handleUpdateClassTeacher = (
    cls: string,
    homeroomTeacher: string,
    homeroomTeacherNip: string
  ) => {
    const updatedClassTeachers = {
      ...(config.classTeachers || {}),
      [cls]: {
        homeroomTeacher,
        homeroomTeacherNip,
      },
    };

    const isCurrent = cls === config.currentClass;
    const updated: SchoolConfig = {
      ...config,
      classTeachers: updatedClassTeachers,
      homeroomTeacher: isCurrent ? homeroomTeacher : config.homeroomTeacher,
      homeroomTeacherNip: isCurrent ? homeroomTeacherNip : config.homeroomTeacherNip,
    };

    setConfig(updated);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSchoolConfig(config);
    onShowToast('success', 'Tersimpan', 'Profil sekolah dan data pendidik berhasil diperbarui!');
  };

  // Holiday handlers
  const handleAddOrUpdateHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayName.trim()) {
      onShowToast('warning', 'Data Belum Lengkap', 'Pilih tanggal dan isi nama/keterangan hari libur.');
      return;
    }

    const currentHolidays = config.holidays ? [...config.holidays] : [];
    let updatedHolidays: HolidayConfig[];

    if (editingHolidayDate) {
      updatedHolidays = currentHolidays.map((h) =>
        h.date === editingHolidayDate ? { date: holidayDate, name: holidayName.trim() } : h
      );
      setEditingHolidayDate(null);
      onShowToast('success', 'Hari Libur Diperbarui', `Hari libur pada tanggal ${formatIndonesianDate(holidayDate)} berhasil disimpan.`);
    } else {
      if (currentHolidays.some((h) => h.date === holidayDate)) {
        onShowToast('warning', 'Tanggal Sudah Ada', `Tanggal ${formatIndonesianDate(holidayDate)} sudah terdaftar.`);
        return;
      }
      updatedHolidays = [...currentHolidays, { date: holidayDate, name: holidayName.trim() }];
      onShowToast('success', 'Hari Libur Ditambahkan', `${holidayName.trim()} (${formatIndonesianDate(holidayDate)}) berhasil ditambahkan.`);
    }

    // Sort ascending
    updatedHolidays.sort((a, b) => a.date.localeCompare(b.date));

    const updatedConfig = { ...config, holidays: updatedHolidays };
    setConfig(updatedConfig);
    onSaveSchoolConfig(updatedConfig);
    setHolidayDate('');
    setHolidayName('');
  };

  const handleDeleteHoliday = (dateToDelete: string) => {
    const currentHolidays = config.holidays || [];
    const target = currentHolidays.find((h) => h.date === dateToDelete);
    if (!target) return;

    if (window.confirm(`Hapus ${target.name} (${formatIndonesianDate(dateToDelete)}) dari daftar hari libur?`)) {
      const updatedHolidays = currentHolidays.filter((h) => h.date !== dateToDelete);
      const updatedConfig = { ...config, holidays: updatedHolidays };
      setConfig(updatedConfig);
      onSaveSchoolConfig(updatedConfig);
      onShowToast('info', 'Hari Libur Dihapus', `${target.name} dihapus dari daftar libur.`);
      if (editingHolidayDate === dateToDelete) {
        setEditingHolidayDate(null);
        setHolidayDate('');
        setHolidayName('');
      }
    }
  };

  const handleStartEditHoliday = (h: HolidayConfig) => {
    setEditingHolidayDate(h.date);
    setHolidayDate(h.date);
    setHolidayName(h.name);
  };

  const handleCancelEditHoliday = () => {
    setEditingHolidayDate(null);
    setHolidayDate('');
    setHolidayName('');
  };

  const handleLoadNationalHolidaysPreset = () => {
    const currentHolidays = config.holidays || [];
    const map = new Map<string, string>();
    currentHolidays.forEach((h) => map.set(h.date, h.name));

    DEFAULT_NATIONAL_HOLIDAYS_PRESET.forEach((p) => {
      if (!map.has(p.date)) {
        map.set(p.date, p.name);
      }
    });

    const mergedHolidays: HolidayConfig[] = Array.from(map.entries()).map(([date, name]) => ({
      date,
      name,
    }));
    mergedHolidays.sort((a, b) => a.date.localeCompare(b.date));

    const updatedConfig = { ...config, holidays: mergedHolidays };
    setConfig(updatedConfig);
    onSaveSchoolConfig(updatedConfig);
    onShowToast('success', 'Preset Libur Dimuat', 'Hari libur nasional resmi berhasil ditambahkan ke kalender.');
  };

  const handleAddClass = () => {
    const trimmed = newClassName.trim().toUpperCase();
    if (!trimmed) return;
    if (config.availableClasses.includes(trimmed)) {
      onShowToast('warning', 'Kelas Sudah Ada', `Kelas ${trimmed} sudah terdaftar.`);
      return;
    }
    const updated = {
      ...config,
      availableClasses: [...config.availableClasses, trimmed],
    };
    setConfig(updated);
    onSaveSchoolConfig(updated);
    setNewClassName('');
    onShowToast('success', 'Kelas Ditambahkan', `Kelas ${trimmed} berhasil ditambahkan.`);
  };

  const handleRemoveClass = (clsName: string) => {
    if (config.availableClasses.length <= 1) {
      onShowToast('error', 'Tidak Bisa Menghapus', 'Minimal harus ada 1 kelas terdaftar.');
      return;
    }
    if (window.confirm(`Hapus kelas ${clsName}? Siswa pada kelas ini tidak akan terhapus dari basis data namun kelas tidak muncul di daftar pilihan.`)) {
      const updatedClasses = config.availableClasses.filter((c) => c !== clsName);
      const updated = {
        ...config,
        availableClasses: updatedClasses,
        currentClass: config.currentClass === clsName ? updatedClasses[0] : config.currentClass,
      };
      setConfig(updated);
      onSaveSchoolConfig(updated);
      onShowToast('info', 'Kelas Dihapus', `Kelas ${clsName} dihapus dari daftar pilihan.`);
    }
  };

  // Export full JSON backup
  const handleDownloadBackup = () => {
    const jsonStr = StorageService.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cadangan_Rekap_Kehadiran_${config.schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast('success', 'Cadangan Diunduh', 'Seluruh data absensi dan siswa berhasil diunduh.');
  };

  // Restore JSON backup
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = StorageService.restoreFullBackup(content);
      if (res.success) {
        onReloadAllData();
        setConfig(StorageService.getSchoolConfig());
        onShowToast('success', 'Pemulihan Berhasil', res.message);
      } else {
        onShowToast('error', 'Gagal Pemulihan', res.message);
      }
    };
    reader.readAsText(file);
    if (fileRestoreRef.current) fileRestoreRef.current.value = '';
  };

  // Seed sample dummy data
  const handleSeedDummy = () => {
    if (window.confirm('Muat contoh data simulasi uji coba? (Perhatian: Data ini hanyalah contoh ilustrasi untuk menguji fitur aplikasi, bukan data siswa nyata).')) {
      StorageService.seedSampleData();
      onReloadAllData();
      setConfig(StorageService.getSchoolConfig());
      onShowToast('info', 'Data Uji Coba Dimuat', 'Data contoh simulasi telah dimuat untuk pengujian.');
    }
  };

  // Clear all data
  const handleClearAll = () => {
    if (window.confirm('PERINGATAN: Kosongkan seluruh data siswa dan riwayat kehadiran? Tindakan ini tidak dapat dibatalkan.')) {
      StorageService.clearAllData();
      onReloadAllData();
      setConfig(StorageService.getSchoolConfig());
      onShowToast('warning', 'Data Dikosongkan', 'Seluruh data telah dibersihkan menjadi kondisi baru.');
    }
  };

  // Test Firebase Live Connection
  const handleTestFirebase = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await FirebaseService.testConnection();
      setTestResult(res);
      if (res.success) {
        onShowToast('success', 'Koneksi Cloud Sukses', res.message);
      } else {
        onShowToast('warning', 'Koneksi Cloud Terkendala', res.message);
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e?.message || 'Gagal terhubung ke Firebase.',
      });
      onShowToast('error', 'Koneksi Gagal', 'Periksa koneksi internet atau konfigurasi server.');
    } finally {
      setTestingConnection(false);
    }
  };

  // Upload local dataset to Cloud
  const handleUploadAllToFirebase = async () => {
    setSyncingCloud('upload');
    try {
      const currentStudents = students.length > 0 ? students : StorageService.getStudents();
      const currentAttendance = Object.keys(allRecords).length > 0 ? allRecords : StorageService.getAllAttendanceRecords();
      const currentFollowUps = followUpCases.length > 0 ? followUpCases : StorageService.getFollowUpCases();
      const currentAccounts = StorageService.getAccounts();

      const res = await FirebaseService.uploadAllToCloud({
        schoolConfig: config,
        students: currentStudents,
        allRecords: currentAttendance,
        followUpCases: currentFollowUps,
        accounts: currentAccounts,
      });

      if (res.success) {
        const updatedConfig = { ...firebaseConfig, lastSyncTime: new Date().toISOString() };
        setFirebaseConfig(updatedConfig);
        StorageService.saveFirebaseConfig(updatedConfig);
        onShowToast('success', 'Sinkronisasi Berhasil', res.message);
      } else {
        onShowToast('error', 'Sinkronisasi Gagal', res.message);
      }
    } catch (e: any) {
      onShowToast('error', 'Error Unggah', e?.message || 'Gagal mengunggah data ke Cloud.');
    } finally {
      setSyncingCloud(null);
    }
  };

  // Pull / restore dataset from Cloud
  const handlePullAllFromFirebase = async () => {
    if (!window.confirm('Ambil dan sinkronkan data dari Cloud Firebase? Data absensi dan siswa pada peramban ini akan diperbarui dengan versi terbaru dari cloud.')) {
      return;
    }
    setSyncingCloud('download');
    try {
      const res = await FirebaseService.pullAllFromCloud();
      if (res.success && res.data) {
        if (res.data.schoolConfig) {
          StorageService.saveSchoolConfig(res.data.schoolConfig);
          setConfig(res.data.schoolConfig);
        }
        if (res.data.students && res.data.students.length > 0) {
          StorageService.saveStudents(res.data.students);
        }
        if (res.data.allRecords && Object.keys(res.data.allRecords).length > 0) {
          localStorage.setItem('rekap_kehadiran_daily_records_v1', JSON.stringify(res.data.allRecords));
        }
        if (res.data.followUpCases && res.data.followUpCases.length > 0) {
          StorageService.saveFollowUpCases(res.data.followUpCases);
        }
        if (res.data.accounts && res.data.accounts.length > 0) {
          StorageService.saveAccounts(res.data.accounts);
        }
        onReloadAllData();
        const updatedConfig = { ...firebaseConfig, lastSyncTime: new Date().toISOString() };
        setFirebaseConfig(updatedConfig);
        StorageService.saveFirebaseConfig(updatedConfig);
        onShowToast('success', 'Data Diperbarui dari Cloud', res.message);
      } else {
        onShowToast('warning', 'Data Belum Tersedia di Cloud', res.message || 'Belum ada data absensi di server Firebase.');
      }
    } catch (e: any) {
      onShowToast('error', 'Gagal Mengambil Data', e?.message || 'Terjadi kesalahan saat sinkronisasi cloud.');
    } finally {
      setSyncingCloud(null);
    }
  };

  // Save Firebase settings
  const handleSaveFirebase = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveFirebaseConfig(firebaseConfig);
    onShowToast('success', 'Konfigurasi Cloud Disimpan', 'Pengaturan koneksi Firebase berhasil disimpan.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Pengaturan Sekolah & Manajemen Basis Data
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Kelola identitas instansi, rombongan belajar, tahun ajaran, dan status penyimpanan data
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveSettingsTab('identitas')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeSettingsTab === 'identitas'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Identitas & Pejabat Sekolah
        </button>
        <button
          type="button"
          onClick={() => setActiveSettingsTab('libur')}
          className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeSettingsTab === 'libur'
              ? 'border-rose-600 text-rose-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="h-4 w-4 text-rose-600" />
          <span>Hari Libur & Kalender</span>
          {config.holidays && config.holidays.length > 0 && (
            <span className="rounded-full bg-rose-100 text-rose-800 px-1.5 py-0.5 text-[10px] font-bold">
              {config.holidays.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveSettingsTab('kop')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeSettingsTab === 'kop'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Kop Surat & Logo Sekolah
        </button>
        <button
          type="button"
          onClick={() => setActiveSettingsTab('kelas')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeSettingsTab === 'kelas'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Daftar Kelas (Rombel)
        </button>
        <button
          type="button"
          onClick={() => setActiveSettingsTab('backup')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeSettingsTab === 'backup'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Cadangan & Pemulihan (JSON)
        </button>
        <button
          type="button"
          onClick={() => setActiveSettingsTab('firebase')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeSettingsTab === 'firebase'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Koneksi Cloud (Firebase)
        </button>
      </div>

      {/* TAB 1: Identitas Sekolah */}
      {activeSettingsTab === 'identitas' && (
        <form onSubmit={handleSaveProfile} className="space-y-5 max-w-2xl">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Identitas Satuan Pendidikan
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nama Satuan Pendidikan / Sekolah *
                </label>
                <input
                  type="text"
                  required
                  value={config.schoolName}
                  onChange={(e) => setConfig({ ...config, schoolName: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Jenjang Sekolah
                </label>
                <select
                  value={config.schoolLevel}
                  onChange={(e) => setConfig({ ...config, schoolLevel: e.target.value as SchoolLevel })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="SD">SD (Sekolah Dasar)</option>
                  <option value="MI">MI (Madrasah Ibtidaiyah)</option>
                  <option value="SMP">SMP (Sekolah Menengah Pertama)</option>
                  <option value="MTs">MTs (Madrasah Tsanawiyah)</option>
                  <option value="SMA">SMA (Sekolah Menengah Atas)</option>
                  <option value="MA">MA (Madrasah Aliyah)</option>
                  <option value="SMK">SMK (Sekolah Menengah Kejuruan)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  NPSN (Nomor Pokok Sekolah Nasional)
                </label>
                <input
                  type="text"
                  value={config.npsn}
                  onChange={(e) => setConfig({ ...config, npsn: e.target.value })}
                  placeholder="20108976"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Kota / Kabupaten
                </label>
                <input
                  type="text"
                  value={config.city}
                  onChange={(e) => setConfig({ ...config, city: e.target.value })}
                  placeholder="Jakarta Selatan"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Kode Pos Sekolah
                </label>
                <input
                  type="text"
                  value={config.postalCode ?? config.kopConfig?.postalCode ?? ''}
                  onChange={(e) => {
                    const newPostal = e.target.value;
                    setConfig({
                      ...config,
                      postalCode: newPostal,
                      kopConfig: config.kopConfig
                        ? { ...config.kopConfig, postalCode: newPostal }
                        : undefined,
                    });
                  }}
                  placeholder="12340"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Alamat Lengkap Sekolah (Untuk Kop Surat Laporan)
                </label>
                <input
                  type="text"
                  value={config.address}
                  onChange={(e) => {
                    const newAddress = e.target.value;
                    setConfig({
                      ...config,
                      address: newAddress,
                      kopConfig: config.kopConfig
                        ? { ...config.kopConfig, address: newAddress }
                        : undefined,
                    });
                  }}
                  placeholder="Jl. Pendidikan No. 45"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Tahun Ajaran & Semester
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tahun Pelajaran (TP)
                </label>
                <input
                  type="text"
                  value={config.academicYear}
                  onChange={(e) => setConfig({ ...config, academicYear: e.target.value })}
                  placeholder="2024/2025"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Semester Berjalan
                </label>
                <select
                  value={config.semester}
                  onChange={(e) => setConfig({ ...config, semester: e.target.value as Semester })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="1">Semester 1 (Ganjil - Juli s.d. Desember)</option>
                  <option value="2">Semester 2 (Genap - Januari s.d. Juni)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Data Pendidik & Penandatangan
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Data Wali Kelas otomatis berubah dan menyesuaikan data kelas yang dipilih atau ditampilkan
                </p>
              </div>

              {/* Class Selector for Teacher Data */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                <span className="text-xs font-semibold text-slate-600">Pilih Kelas:</span>
                <select
                  value={selectedClassForTeacher}
                  onChange={(e) => setSelectedClassForTeacher(e.target.value)}
                  className="bg-transparent text-xs font-bold text-blue-700 focus:outline-none cursor-pointer"
                >
                  {config.availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls} {cls === config.currentClass ? '(Kelas Aktif Laporan)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Informational banner */}
            <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                <span>
                  Mengatur Wali Kelas untuk <strong>Kelas {selectedClassForTeacher}</strong>
                </span>
              </div>
              {selectedClassForTeacher === config.currentClass ? (
                <span className="inline-block rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white self-start sm:self-auto">
                  ✓ Kelas Aktif Absensi Saat Ini
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const teacher = config.classTeachers?.[selectedClassForTeacher]?.homeroomTeacher || config.homeroomTeacher;
                    const nip = config.classTeachers?.[selectedClassForTeacher]?.homeroomTeacherNip || config.homeroomTeacherNip;
                    const updated = {
                      ...config,
                      currentClass: selectedClassForTeacher,
                      homeroomTeacher: teacher,
                      homeroomTeacherNip: nip,
                    };
                    setConfig(updated);
                    onSaveSchoolConfig(updated);
                    onShowToast('info', 'Kelas Aktif Diubah', `Kelas ${selectedClassForTeacher} kini aktif di laporan.`);
                  }}
                  className="text-[11px] font-semibold text-blue-700 hover:underline hover:text-blue-900"
                >
                  Jadikan Kelas Aktif di Menu Utama →
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nama Wali Kelas ({selectedClassForTeacher}) *
                </label>
                <input
                  type="text"
                  required
                  value={
                    config.classTeachers?.[selectedClassForTeacher]?.homeroomTeacher ??
                    (selectedClassForTeacher === config.currentClass ? config.homeroomTeacher : '')
                  }
                  onChange={(e) => {
                    const currentNip =
                      config.classTeachers?.[selectedClassForTeacher]?.homeroomTeacherNip ??
                      (selectedClassForTeacher === config.currentClass ? config.homeroomTeacherNip : '');
                    handleUpdateClassTeacher(selectedClassForTeacher, e.target.value, currentNip);
                  }}
                  placeholder={`Contoh: Budi Santoso, S.Pd., M.Pd.`}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  NIP Wali Kelas ({selectedClassForTeacher})
                </label>
                <input
                  type="text"
                  value={
                    config.classTeachers?.[selectedClassForTeacher]?.homeroomTeacherNip ??
                    (selectedClassForTeacher === config.currentClass ? config.homeroomTeacherNip : '')
                  }
                  onChange={(e) => {
                    const currentTeacher =
                      config.classTeachers?.[selectedClassForTeacher]?.homeroomTeacher ??
                      (selectedClassForTeacher === config.currentClass ? config.homeroomTeacher : '');
                    handleUpdateClassTeacher(selectedClassForTeacher, currentTeacher, e.target.value);
                  }}
                  placeholder="19820415 200801 1 008"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nama Guru BK / Konselor
                </label>
                <input
                  type="text"
                  value={config.counselorTeacher}
                  onChange={(e) => setConfig({ ...config, counselorTeacher: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  NIP Guru BK
                </label>
                <input
                  type="text"
                  value={config.counselorTeacherNip}
                  onChange={(e) => setConfig({ ...config, counselorTeacherNip: e.target.value })}
                  placeholder="19860920 201001 2 015"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nama Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={config.headmaster}
                  onChange={(e) => setConfig({ ...config, headmaster: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={config.headmasterNip}
                  onChange={(e) => setConfig({ ...config, headmasterNip: e.target.value })}
                  placeholder="19700312 199512 1 002"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Overview Table of All Classes and Their Teachers */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Daftar Seluruh Wali Kelas Berdasarkan Rombongan Belajar:
              </span>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 w-28">Kelas</th>
                      <th className="px-3 py-2">Nama Wali Kelas</th>
                      <th className="px-3 py-2">NIP Wali Kelas</th>
                      <th className="px-3 py-2 text-center w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {config.availableClasses.map((cls) => {
                      const tInfo = config.classTeachers?.[cls];
                      const isSelected = cls === selectedClassForTeacher;
                      const teacherName =
                        tInfo?.homeroomTeacher || (cls === config.currentClass ? config.homeroomTeacher : '-');
                      const teacherNip =
                        tInfo?.homeroomTeacherNip || (cls === config.currentClass ? config.homeroomTeacherNip : '-');

                      return (
                        <tr key={cls} className={isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}>
                          <td className="px-3 py-2 font-bold text-slate-900">
                            {cls}
                            {cls === config.currentClass && (
                              <span className="ml-1.5 text-[10px] text-blue-600 font-semibold">(Aktif)</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-800">{teacherName}</td>
                          <td className="px-3 py-2 font-mono-numbers text-slate-500">{teacherNip}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedClassForTeacher(cls)}
                              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {isSelected ? 'Sedang Dipilih' : 'Pilih & Ubah'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-2xs"
          >
            <Save className="h-4 w-4" />
            Simpan Perubahan Identitas
          </button>
        </form>
      )}

      {/* TAB 2: HARI LIBUR NASIONAL & KALENDER SEKOLAH */}
      {activeSettingsTab === 'libur' && (
        <div className="space-y-6 max-w-4xl">
          {/* Rules & Info Banner */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-rose-600 p-2 text-white shadow-xs shrink-0 mt-0.5">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-rose-900">
                  Pengaturan Hari Libur Nasional & Akhir Pekan (Sabtu - Minggu)
                </h3>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Sesuai ketentuan, <strong>hari Sabtu dan Minggu secara otomatis ditetapkan sebagai hari libur</strong> dan ditandai dengan <strong>warna merah</strong> di seluruh sistem presensi harian, rekap mingguan, bulanan, semester, dan cetakan.
                </p>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Gunakan menu di bawah ini untuk <strong>menambah atau mengatur Hari Libur Nasional dan Cuti Bersama</strong>. Pada tanggal-tanggal yang terdaftar, sistem akan otomatis menganggapnya sebagai libur (berwarna merah), meniadakan presensi alpa, dan menampilkan keterangan hari libur tersebut.
                </p>
              </div>
            </div>
          </div>

          {/* Form Tambah / Edit Hari Libur */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-600" />
                {editingHolidayDate ? 'Ubah Keterangan Hari Libur' : 'Tambah Hari Libur Nasional / Sekolah'}
              </h3>
              <button
                type="button"
                onClick={handleLoadNationalHolidaysPreset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs"
                title="Muat daftar hari libur nasional resmi Indonesia"
              >
                <Sparkles className="h-3.5 w-3.5 text-rose-600" />
                Muat Preset Hari Libur Nasional Resmi
              </button>
            </div>

            <form onSubmit={handleAddOrUpdateHoliday} className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tanggal Libur *
                </label>
                <input
                  type="date"
                  required
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nama Hari Libur / Keterangan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Hari Kemerdekaan RI Ke-79"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-2xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  {editingHolidayDate ? 'Simpan Perubahan' : 'Tambah Libur'}
                </button>
                {editingHolidayDate && (
                  <button
                    type="button"
                    onClick={handleCancelEditHoliday}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Table of Registered Holidays */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Daftar Hari Libur Nasional & Sekolah Terdaftar
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total {config.holidays?.length || 0} tanggal libur yang telah diatur
                </p>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari hari libur atau tanggal..."
                  value={holidaySearchQuery}
                  onChange={(e) => setHolidaySearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 w-12 text-center">No</th>
                    <th className="px-3 py-2.5 w-40">Tanggal</th>
                    <th className="px-3 py-2.5 w-24 text-center">Hari</th>
                    <th className="px-3 py-2.5">Keterangan Hari Libur</th>
                    <th className="px-3 py-2.5 w-32 text-center">Kategori</th>
                    <th className="px-3 py-2.5 w-28 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const holidaysList = config.holidays || [];
                    const filtered = holidaysList.filter((h) => {
                      if (!holidaySearchQuery) return true;
                      const q = holidaySearchQuery.toLowerCase();
                      return (
                        h.date.toLowerCase().includes(q) ||
                        h.name.toLowerCase().includes(q) ||
                        formatIndonesianDate(h.date).toLowerCase().includes(q)
                      );
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                            {holidaysList.length === 0
                              ? 'Belum ada hari libur nasional yang ditambahkan. Klik "Muat Preset Hari Libur Nasional Resmi" di atas untuk memuat kalender resmi.'
                              : 'Tidak ada hari libur yang cocok dengan pencarian.'}
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((h, idx) => {
                      const dObj = new Date(h.date + 'T00:00:00');
                      const dayName = INDONESIAN_DAYS[dObj.getDay()];
                      const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;

                      return (
                        <tr key={h.date} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5 text-center font-mono-numbers text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2.5 font-mono-numbers font-semibold text-slate-900">
                            {formatIndonesianDate(h.date)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                isWeekend
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {dayName}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-medium text-slate-800">
                            {h.name}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Libur Terjadwal
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditHoliday(h)}
                                className="rounded p-1 text-blue-600 hover:bg-blue-50"
                                title="Edit hari libur"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteHoliday(h.date)}
                                className="rounded p-1 text-rose-600 hover:bg-rose-50"
                                title="Hapus hari libur"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB KOP: Kop Surat & Logo Sekolah */}
      {activeSettingsTab === 'kop' && (
        <div className="space-y-6 max-w-4xl">
          <KopConfigDrawer
            currentKop={config.kopConfig || DEFAULT_KOP_CONFIG}
            schoolConfig={config}
            onUpdateKop={(updated) => {
              const updatedConfig = { ...config, kopConfig: updated };
              setConfig(updatedConfig);
            }}
            onSaveAsDefault={(updated) => {
              const updatedConfig = { ...config, kopConfig: updated };
              setConfig(updatedConfig);
              onSaveSchoolConfig(updatedConfig);
              onShowToast('success', 'Kop Surat Disimpan', 'Format Kop dan logo sekolah berhasil disimpan sebagai bawaan resmi.');
            }}
            onClose={() => {}}
          />

          {/* Live Preview Paper Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-5 shadow-inner">
            <div className="flex items-center justify-between mb-3 text-xs font-bold text-slate-700">
              <span>Pratinjau Kop Surat Pada Dokumen Resmi:</span>
              <span className="text-[11px] text-slate-500 font-normal">
                Ukuran: {config.kopConfig?.paperSize || 'A4'} · Orientasi: {config.kopConfig?.orientation || 'Potret'}
              </span>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md border border-slate-300">
              <KopSuratView schoolConfig={config} customKop={config.kopConfig} />
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                [ Isi Tabel Kehadiran / Rekapitulasi / Surat Panggilan Siswa akan tercetak di bawah Kop ini ]
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Daftar Kelas */}
      {activeSettingsTab === 'kelas' && (
        <div className="space-y-4 max-w-xl">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Daftar Rombongan Belajar (Kelas)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Tambah atau sesuaikan nama kelas sesuai jenjang sekolah (misal: VII A, X-MIPA 1, XI-TKJ 2).
            </p>

            {/* Input tambah kelas */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                placeholder="Nama kelas baru, misal: X-MIPA 3"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddClass}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah
              </button>
            </div>

            {/* List of classes */}
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {config.availableClasses.map((cls) => {
                const isCurrent = config.currentClass === cls;
                return (
                  <div key={cls} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-800">{cls}</span>
                      {isCurrent && (
                        <span className="bg-blue-100 text-blue-800 font-bold text-[10px] px-2 py-0.5 rounded-full">
                          Kelas Aktif Saat Ini
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveClass(cls)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                      title="Hapus Kelas"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Cadangan & Pemulihan (JSON) */}
      {activeSettingsTab === 'backup' && (
        <div className="space-y-6 max-w-2xl">
          {/* Local Storage Privacy Notice */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900">
                <p className="font-bold text-sm text-blue-950 mb-1">
                  Status Penyimpanan Lokal Browser
                </p>
                <p className="leading-relaxed">
                  Data peserta didik dan riwayat absensi tersimpan secara aman di <strong>Penyimpanan Lokal (LocalStorage)</strong> peramban perangkat ini. Data tidak akan hilang saat halaman dimuat ulang (refresh) atau ditutup.
                </p>
                <p className="mt-1.5 text-blue-800">
                  Untuk mengamankan data atau memindahkan ke komputer lain, gunakan tombol <strong>Unduh Berkas Cadangan (JSON)</strong> di bawah ini secara berkala.
                </p>
              </div>
            </div>
          </div>

          {/* Backup & Restore Controls */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Cadangan & Pemulihan Lengkap
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Download */}
              <div className="rounded-lg border border-slate-200 p-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">Ekspor Cadangan (.JSON)</h4>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Simpan seluruh data absensi, data profil sekolah, dan daftar siswa ke dalam berkas JSON mandiri.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs"
                >
                  <Download className="h-4 w-4" />
                  Unduh Berkas Cadangan
                </button>
              </div>

              {/* Restore */}
              <div className="rounded-lg border border-slate-200 p-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">Pulihkan Dari Cadangan (.JSON)</h4>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Pulihkan seluruh data absensi dari berkas cadangan JSON yang telah diunduh sebelumnya.
                  </p>
                </div>
                <div>
                  <input
                    ref={fileRestoreRef}
                    type="file"
                    accept=".json"
                    onChange={handleRestoreBackup}
                    className="hidden"
                    id="restore-file-input"
                  />
                  <label
                    htmlFor="restore-file-input"
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 shadow-2xs"
                  >
                    <Upload className="h-4 w-4 text-blue-600" />
                    Pilih Berkas JSON Cadangan
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Reset / Sample Data Actions */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Pengujian & Pembersihan Data
            </h3>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-semibold text-slate-800">Muat Data Simulasi Uji Coba (Dummy)</h4>
                <p className="text-[11px] text-slate-500">
                  Untuk menguji seluruh fitur laporan & peringatan tanpa memasukkan data siswa asli satu per satu.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSeedDummy}
                className="shrink-0 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Muat Data Uji Coba
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-semibold text-rose-700">Kosongkan Seluruh Data Aplikasi</h4>
                <p className="text-[11px] text-slate-500">
                  Bersihkan seluruh data siswa dan riwayat absensi untuk memulai tahun ajaran baru secara bersih.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearAll}
                className="shrink-0 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                Kosongkan Semua Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Firebase / Cloud Sync & Diagnostics */}
      {activeSettingsTab === 'firebase' && (
        <div className="space-y-6 max-w-3xl">
          {/* Cloud Status Card */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-blue-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
                  <Cloud className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Penyimpanan Cloud Firebase Firestore
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Aktif & Terhubung
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Basis data tersinkronisasi otomatis untuk akses bersama banyak guru & lintas perangkat
                  </p>
                </div>
              </div>

              {/* Ping Test Button */}
              <button
                type="button"
                onClick={handleTestFirebase}
                disabled={testingConnection}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-98 transition-all disabled:opacity-60 cursor-pointer"
              >
                {testingConnection ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Menguji Server...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" />
                    <span>Uji Koneksi Server (Ping)</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Test Result Banner */}
            {testResult && (
              <div
                className={`mt-4 rounded-xl p-3.5 text-xs border flex items-start gap-3 ${
                  testResult.success
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold">{testResult.message}</p>
                    {testResult.latencyMs !== undefined && (
                      <span className="font-mono text-[11px] font-semibold bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded-md">
                        Latensi: {testResult.latencyMs} ms
                      </span>
                    )}
                  </div>
                  {testResult.details && (
                    <p className="text-[11px] mt-1 opacity-90 font-mono">
                      {testResult.details}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Cloud Configuration Specs */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Project ID Firebase
                </span>
                <span className="font-mono font-semibold text-slate-800">
                  {FirebaseService.getProjectInfo().projectId || 'optimistic-destiny-6v4kj'}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Firestore Database ID
                </span>
                <span className="font-mono font-semibold text-slate-800 truncate block">
                  {FirebaseService.getProjectInfo().firestoreDatabaseId || '(default)'}
                </span>
              </div>
            </div>
          </div>

          {/* Sync Operations Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Aksi Sinkronisasi Data Cloud
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Upload Card */}
              <div className="rounded-xl border border-slate-200 p-4 flex flex-col justify-between hover:border-blue-300 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <ArrowUpFromLine className="h-4 w-4 text-blue-600" />
                    <h5 className="text-xs font-bold text-slate-900">
                      Unggah Seluruh Data Lokal ke Cloud
                    </h5>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                    Kirim seluruh data siswa, profil sekolah, dan riwayat absensi dari browser ini ke Firebase Cloud agar dapat diakses oleh guru lain.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUploadAllToFirebase}
                  disabled={syncingCloud !== null}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs disabled:opacity-60 cursor-pointer"
                >
                  {syncingCloud === 'upload' ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Mengunggah Data...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="h-3.5 w-3.5" />
                      <span>Unggah ke Cloud Sekarang</span>
                    </>
                  )}
                </button>
              </div>

              {/* Download / Pull Card */}
              <div className="rounded-xl border border-slate-200 p-4 flex flex-col justify-between hover:border-emerald-300 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
                    <h5 className="text-xs font-bold text-slate-900">
                      Tarik / Sinkronkan Data dari Cloud
                    </h5>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                    Ambil data absensi dan siswa terbaru yang disimpan di Firebase ke browser perangkat ini (sangat berguna jika baru membuka aplikasi di laptop/HP baru).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePullAllFromFirebase}
                  disabled={syncingCloud !== null}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs disabled:opacity-60 cursor-pointer"
                >
                  {syncingCloud === 'download' ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                      <span>Menarik Data...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Tarik Data dari Cloud</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Auto-Sync Toggle */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <label htmlFor="auto-sync-check" className="text-xs font-bold text-slate-800 cursor-pointer block">
                  Sinkronisasi Otomatis Real-Time (Auto-Sync)
                </label>
                <p className="text-[11px] text-slate-500">
                  Saat aktif, setiap pengisian absensi atau pembaruan siswa otomatis tersimpan ke Cloud di latar belakang.
                </p>
              </div>
              <input
                type="checkbox"
                id="auto-sync-check"
                checked={firebaseConfig.enabled}
                onChange={(e) => {
                  const updated = { ...firebaseConfig, enabled: e.target.checked };
                  setFirebaseConfig(updated);
                  StorageService.saveFirebaseConfig(updated);
                  onShowToast('info', 'Pengaturan Disimpan', `Mode Auto-Sync ${e.target.checked ? 'Diaktifkan' : 'Dinonaktifkan'}.`);
                }}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Solutions & Troubleshooting Guide Accordion */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <HelpCircle className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Solusi & Panduan Masalah Koneksi Firebase
              </h4>
            </div>

            <div className="space-y-3 text-xs">
              {/* Question 1 */}
              <div className="rounded-xl border border-slate-200/90 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === 1 ? null : 1)}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-100/60 font-semibold text-slate-800 text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">1</span>
                    Mengapa sebelumnya muncul kendala koneksi Firebase?
                  </span>
                  <span className="text-slate-400 font-bold">{openFaq === 1 ? '−' : '+'}</span>
                </button>
                {openFaq === 1 && (
                  <div className="p-4 bg-white text-slate-600 leading-relaxed border-t border-slate-200 space-y-2">
                    <p>
                      Sebelumnya, database cloud Firestore memerlukan otorisasi (Terms of Service) dan provisi resmi dari Google Cloud.
                    </p>
                    <p>
                      Saat ini, database <strong>ai-studio-aplikasirekapkeh-633e1581-ff9d-4f41-b3c4-991bc4215e32</strong> telah berhasil diprovisi secara resmi dan aturan keamanan (Firestore Security Rules) telah terpasang aktif, sehingga pengiriman data dari aplikasi kini berjalan lancar.
                    </p>
                  </div>
                )}
              </div>

              {/* Question 2 */}
              <div className="rounded-xl border border-slate-200/90 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === 2 ? null : 2)}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-100/60 font-semibold text-slate-800 text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">2</span>
                    Bagaimana jika internet sekolah sedang lambat atau mati? (Offline First)
                  </span>
                  <span className="text-slate-400 font-bold">{openFaq === 2 ? '−' : '+'}</span>
                </button>
                {openFaq === 2 && (
                  <div className="p-4 bg-white text-slate-600 leading-relaxed border-t border-slate-200 space-y-2">
                    <p>
                      Aplikasi ini dirancang dengan arsitektur <strong>Offline First</strong>:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700">
                      <li>Setiap absensi harian dan perubahan data siswa pertama kali disimpan langsung di memori lokal peramban (LocalStorage) tanpa jeda loading.</li>
                      <li>Ketika ada internet, data otomatis disinkronkan ke Firebase. Jika internet terputus, guru tetap bisa mengabsen secara penuh tanpa kendala.</li>
                      <li>Anda juga dapat mengunduh berkas cadangan mandiri (.JSON) di tab Cadangan & Pemulihan kapan pun.</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Question 3 */}
              <div className="rounded-xl border border-slate-200/90 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === 3 ? null : 3)}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-100/60 font-semibold text-slate-800 text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">3</span>
                    Bagaimana cara guru lain di laptop atau HP berbeda melihat data yang sama?
                  </span>
                  <span className="text-slate-400 font-bold">{openFaq === 3 ? '−' : '+'}</span>
                </button>
                {openFaq === 3 && (
                  <div className="p-4 bg-white text-slate-600 leading-relaxed border-t border-slate-200 space-y-2">
                    <ol className="list-decimal pl-5 space-y-1 text-slate-700">
                      <li>Buka tautan (URL) aplikasi ini di perangkat guru yang lain.</li>
                      <li>Masuk dengan akun yang telah didaftarkan (Admin atau Guru BK).</li>
                      <li>Buka menu <strong>Pengaturan</strong> &gt; pilih tab <strong>Koneksi Cloud (Firebase)</strong>.</li>
                      <li>Klik tombol <strong>Tarik Data dari Cloud</strong>. Seluruh daftar siswa, kelas, dan riwayat absensi akan seketika tersinkronisasi ke perangkat tersebut!</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
