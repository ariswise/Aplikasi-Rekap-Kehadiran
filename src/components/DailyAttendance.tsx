import React, { useState, useMemo } from 'react';
import {
  Student,
  DailyAttendanceRecord,
  AttendanceEntry,
  AttendanceStatus,
  SchoolConfig,
} from '../types/attendance';
import { formatIndonesianDateWithDay, getCurrentTimeString, getTodayDateString, checkDateHoliday } from '../utils/date';
import { ExcelService } from '../utils/excel';
import { sortStudentsAlphabetically } from '../utils/storage';
import {
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  FileSpreadsheet,
  RotateCcw,
  UserCheck,
  Check,
  Info,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertOctagon,
} from 'lucide-react';

interface DailyAttendanceProps {
  students: Student[];
  schoolConfig: SchoolConfig;
  allRecords: Record<string, DailyAttendanceRecord>;
  onSaveDailyAttendance: (record: DailyAttendanceRecord) => void;
  onOpenStudentDetail: (student: Student) => void;
  onPrintDaily: (record: DailyAttendanceRecord, students: Student[]) => void;
}

export const DailyAttendance: React.FC<DailyAttendanceProps> = ({
  students,
  schoolConfig,
  allRecords,
  onSaveDailyAttendance,
  onOpenStudentDetail,
  onPrintDaily,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus | 'terlambat'>('all');
  const [savedIndicator, setSavedIndicator] = useState<boolean>(false);

  // Status libur nasional / Sabtu / Minggu
  const holidayInfo = useMemo(() => {
    return checkDateHoliday(selectedDate, schoolConfig.holidays);
  }, [selectedDate, schoolConfig.holidays]);

  // Retrieve or initialize current record for active class and selected date
  const recordKey = `${schoolConfig.currentClass}_${selectedDate}`;
  const currentRecord = useMemo<DailyAttendanceRecord>(() => {
    if (allRecords[recordKey]) {
      return allRecords[recordKey];
    }
    // Return empty entries so missing ones are explicitly "unmarked" ("Belum Diisi")
    return {
      date: selectedDate,
      classRoom: schoolConfig.currentClass,
      entries: {},
    };
  }, [allRecords, recordKey, selectedDate, schoolConfig.currentClass]);

  // Handle entry update
  const handleUpdateEntry = (studentId: string, updates: Partial<AttendanceEntry>) => {
    const existing = currentRecord.entries[studentId] || {
      studentId,
      status: 'unmarked' as AttendanceStatus,
      updatedAt: new Date().toISOString(),
    };

    const newEntries = {
      ...currentRecord.entries,
      [studentId]: {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    };

    const updatedRecord: DailyAttendanceRecord = {
      ...currentRecord,
      entries: newEntries,
    };

    onSaveDailyAttendance(updatedRecord);
    triggerAutoSaveToast();
  };

  // Toggle keterlambatan mandiri (dapat diklik bersamaan dengan status Hadir)
  const handleToggleLate = (studentId: string) => {
    const existing = currentRecord.entries[studentId] || {
      studentId,
      status: 'unmarked' as AttendanceStatus,
      updatedAt: new Date().toISOString(),
    };

    const nextIsLate = !existing.isLate;
    const updates: Partial<AttendanceEntry> = {
      isLate: nextIsLate,
      // Jika siswa belum diisi statusnya lalu diklik terlambat, otomatis status dijadikan hadir
      status: existing.status === 'unmarked' ? 'hadir' : existing.status,
      arrivalTime: nextIsLate && !existing.arrivalTime ? getCurrentTimeString() : existing.arrivalTime,
      lateMinutes: nextIsLate ? (existing.lateMinutes || 15) : undefined,
    };

    handleUpdateEntry(studentId, updates);
  };

  const triggerAutoSaveToast = () => {
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 1500);
  };

  // Bulk actions
  const handleMarkAllPresent = () => {
    const currentTime = getCurrentTimeString();
    const newEntries: Record<string, AttendanceEntry> = { ...currentRecord.entries };

    students.forEach((s) => {
      newEntries[s.id] = {
        studentId: s.id,
        status: 'hadir',
        arrivalTime: newEntries[s.id]?.arrivalTime || currentTime,
        notes: newEntries[s.id]?.notes || '',
        updatedAt: new Date().toISOString(),
      };
    });

    onSaveDailyAttendance({
      ...currentRecord,
      entries: newEntries,
    });
    triggerAutoSaveToast();
  };

  const handleMarkUnmarkedPresent = () => {
    const currentTime = getCurrentTimeString();
    const newEntries: Record<string, AttendanceEntry> = { ...currentRecord.entries };

    students.forEach((s) => {
      const existing = newEntries[s.id];
      if (!existing || existing.status === 'unmarked') {
        newEntries[s.id] = {
          studentId: s.id,
          status: 'hadir',
          arrivalTime: currentTime,
          notes: existing?.notes || '',
          updatedAt: new Date().toISOString(),
        };
      }
    });

    onSaveDailyAttendance({
      ...currentRecord,
      entries: newEntries,
    });
    triggerAutoSaveToast();
  };

  const handleResetAll = () => {
    if (!window.confirm('Reset seluruh status kehadiran tanggal ini menjadi "Belum Diisi"?')) {
      return;
    }
    const newEntries: Record<string, AttendanceEntry> = {};
    students.forEach((s) => {
      newEntries[s.id] = {
        studentId: s.id,
        status: 'unmarked',
        arrivalTime: '',
        notes: '',
        updatedAt: new Date().toISOString(),
      };
    });

    onSaveDailyAttendance({
      ...currentRecord,
      entries: newEntries,
    });
    triggerAutoSaveToast();
  };

  // Date stepper
  const handleStepDate = (days: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${dayStr}`);
  };

  // Summary statistics for this date (Terlambat dihitung otomatis terpisah dari % Kehadiran)
  const stats = useMemo(() => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;
    let belumDiisi = 0;
    let terlambat = 0;

    students.forEach((s) => {
      const entry = currentRecord.entries[s.id];
      const st = entry?.status || 'unmarked';
      if (st === 'hadir') hadir++;
      else if (st === 'sakit') sakit++;
      else if (st === 'izin') izin++;
      else if (st === 'alpa') alpa++;
      else belumDiisi++;

      if (entry?.isLate) terlambat++;
    });

    const totalStudents = students.length;
    const totalFilled = hadir + sakit + izin + alpa;
    // Persentase kehadiran cukup hitung dari data hadir, sakit dan Alpa (keterlambatan terpisah)
    const percentPresent = totalStudents > 0 ? ((hadir / totalStudents) * 100).toFixed(1) : '0';
    const percentFilled = totalStudents > 0 ? ((totalFilled / totalStudents) * 100).toFixed(0) : '0';

    return {
      totalStudents,
      hadir,
      sakit,
      izin,
      alpa,
      belumDiisi,
      terlambat,
      percentPresent,
      percentFilled,
    };
  }, [students, currentRecord]);

  // Filtered students (strictly sorted A-Z)
  const filteredStudents = useMemo(() => {
    const filtered = students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nis.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nisn.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter !== 'all') {
        const entry = currentRecord.entries[s.id];
        if (statusFilter === 'terlambat') {
          if (!entry?.isLate) return false;
        } else {
          const currentStatus = entry?.status || 'unmarked';
          if (currentStatus !== statusFilter) return false;
        }
      }

      return true;
    });
    return sortStudentsAlphabetically(filtered);
  }, [students, searchQuery, statusFilter, currentRecord]);

  return (
    <div className="space-y-6">
      {/* Top Banner and Date Picker Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Absensi Kehadiran Harian
            </h2>
            {holidayInfo.isOff && (
              <span className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md">
                <AlertOctagon className="h-3.5 w-3.5 text-rose-600" />
                {holidayInfo.holidayName}
              </span>
            )}
            {savedIndicator && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                <Check className="h-3 w-3" /> Tersimpan
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelas {schoolConfig.currentClass} ·{' '}
            <span className={holidayInfo.isOff ? 'text-rose-600 font-bold' : ''}>
              {formatIndonesianDateWithDay(selectedDate)}
            </span>
          </p>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center rounded-lg border p-1 shadow-2xs transition-colors ${
            holidayInfo.isOff
              ? 'border-rose-300 bg-rose-50/60'
              : 'border-slate-200 bg-white'
          }`}>
            <button
              type="button"
              onClick={() => handleStepDate(-1)}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
              title="Hari Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="relative px-2 flex items-center">
              <Calendar className={`h-4 w-4 mr-2 shrink-0 ${holidayInfo.isOff ? 'text-rose-600' : 'text-blue-600'}`} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`text-xs sm:text-sm font-semibold focus:outline-none bg-transparent cursor-pointer ${
                  holidayInfo.isOff ? 'text-rose-700 font-bold' : 'text-slate-800'
                }`}
              />
            </div>
            <button
              type="button"
              onClick={() => handleStepDate(1)}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
              title="Hari Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(getTodayDateString())}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Hari Ini
          </button>
        </div>
      </div>

      {/* Holiday Alert Notification */}
      {holidayInfo.isOff && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertOctagon className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-900">
              Pemberitahuan Hari Libur: {holidayInfo.holidayName}
            </p>
            <p className="text-[11px] text-rose-700 mt-0.5">
              {holidayInfo.isNationalHoliday
                ? `Tanggal ${formatIndonesianDateWithDay(selectedDate)} merupakan Hari Libur Nasional (${holidayInfo.holidayName}). Presensi kegiatan belajar mengajar ditiadakan.`
                : `Hari ${holidayInfo.isSaturday ? 'Sabtu' : 'Minggu'} merupakan hari libur akhir pekan reguler sekolah.`}
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {/* Total Siswa */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Total Siswa</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono-numbers">
              {stats.totalStudents}
            </span>
            <span className="text-xs text-slate-400">Siswa</span>
          </div>
        </div>

        {/* Hadir */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-2xs">
          <div className="text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <span>Hadir (H)</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-emerald-900 font-mono-numbers">
              {stats.hadir}
            </span>
            <span className="text-xs font-semibold text-emerald-800 font-mono-numbers" title="Persentase Kehadiran">
              {stats.percentPresent}%
            </span>
          </div>
        </div>

        {/* Terlambat (Perhitungan Otomatis Terpisah) */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-2xs">
          <div className="text-xs font-semibold text-amber-800 flex items-center justify-between">
            <span>Terlambat (T)</span>
            <Clock className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-amber-900 font-mono-numbers">
              {stats.terlambat}
            </span>
            <span className="text-xs font-medium text-amber-700 font-mono-numbers">
              {stats.totalStudents > 0 ? ((stats.terlambat / stats.totalStudents) * 100).toFixed(0) : '0'}%
            </span>
          </div>
        </div>

        {/* Sakit */}
        <div className="rounded-xl border border-yellow-100 bg-yellow-50/60 p-4 shadow-2xs">
          <div className="text-xs font-semibold text-yellow-800 flex items-center justify-between">
            <span>Sakit (S)</span>
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
          </div>
          <div className="mt-1">
            <span className="text-2xl font-bold tracking-tight text-yellow-900 font-mono-numbers">
              {stats.sakit}
            </span>
          </div>
        </div>

        {/* Izin */}
        <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 shadow-2xs">
          <div className="text-xs font-semibold text-sky-800 flex items-center justify-between">
            <span>Izin (I)</span>
            <span className="h-2 w-2 rounded-full bg-sky-500" />
          </div>
          <div className="mt-1">
            <span className="text-2xl font-bold tracking-tight text-sky-900 font-mono-numbers">
              {stats.izin}
            </span>
          </div>
        </div>

        {/* Alpa */}
        <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 shadow-2xs">
          <div className="text-xs font-semibold text-rose-800 flex items-center justify-between">
            <span>Alpa (A)</span>
            <span className="h-2 w-2 rounded-full bg-rose-500" />
          </div>
          <div className="mt-1">
            <span className="text-2xl font-bold tracking-tight text-rose-900 font-mono-numbers">
              {stats.alpa}
            </span>
          </div>
        </div>

        {/* Belum Diisi */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-2xs">
          <div className="text-xs font-semibold text-slate-600 flex items-center justify-between">
            <span>Belum Diisi</span>
            <span className="h-2 w-2 rounded-full bg-slate-400" />
          </div>
          <div className="mt-1">
            <span className="text-2xl font-bold tracking-tight text-slate-700 font-mono-numbers">
              {stats.belumDiisi}
            </span>
          </div>
        </div>
      </div>

      {/* Action Bar & Quick Mass Tools */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        {/* Bulk Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Set Semua Hadir
          </button>

          {stats.belumDiisi > 0 && (
            <button
              type="button"
              onClick={handleMarkUnmarkedPresent}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              Tandai Belum Diisi Jadi Hadir ({stats.belumDiisi})
            </button>
          )}

          <button
            type="button"
            onClick={handleResetAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            Reset ke Belum Diisi
          </button>
        </div>

        {/* Export & Print Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => ExcelService.exportDailyAttendanceExcel(currentRecord, students, schoolConfig)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Ekspor Excel
          </button>

          <button
            type="button"
            onClick={() => onPrintDaily(currentRecord, students)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5 text-blue-600" />
            Cetak Rekap
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari siswa berdasarkan nama atau NIS/NISN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filter:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('hadir')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              statusFilter === 'hadir'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Hadir ({stats.hadir})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('terlambat')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              statusFilter === 'terlambat'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Terlambat ({stats.terlambat})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('sakit')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              statusFilter === 'sakit'
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100'
            }`}
          >
            Sakit ({stats.sakit})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('izin')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              statusFilter === 'izin'
                ? 'bg-sky-600 text-white'
                : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
            }`}
          >
            Izin ({stats.izin})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('alpa')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              statusFilter === 'alpa'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Alpa ({stats.alpa})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('unmarked')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              statusFilter === 'unmarked'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Belum ({stats.belumDiisi})
          </button>
        </div>
      </div>

      {/* Main Attendance Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              <tr>
                <th scope="col" className="w-10 px-3 py-3 text-center">No</th>
                <th scope="col" className="px-3 py-3 min-w-[160px]">Nama Siswa / Identitas</th>
                <th scope="col" className="w-10 px-2 py-3 text-center">L/P</th>
                <th scope="col" className="w-72 px-3 py-3 text-center">Status Kehadiran</th>
                <th scope="col" className="w-36 px-2 py-3 text-center">Terlambat (T)</th>
                <th scope="col" className="px-3 py-3">Keterangan / Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">Tidak ada data siswa ditemukan.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {students.length === 0
                        ? 'Daftar siswa untuk kelas ini belum ditambahkan.'
                        : 'Sesuaikan kata kunci pencarian atau filter status.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => {
                  const entry = currentRecord.entries[student.id];
                  const currentStatus: AttendanceStatus = entry?.status || 'unmarked';
                  const isLate = !!entry?.isLate;
                  const arrivalTime = entry?.arrivalTime || '';
                  const notes = entry?.notes || '';

                  return (
                    <tr
                      key={student.id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      {/* No */}
                      <td className="px-3 py-3 text-center font-mono-numbers text-slate-500 text-xs">
                        {index + 1}
                      </td>

                      {/* Nama & Identitas Siswa */}
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => onOpenStudentDetail(student)}
                          className="text-left font-semibold text-slate-900 hover:text-blue-600 hover:underline block leading-tight"
                        >
                          {student.name}
                        </button>
                        <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-0.5">
                          <span>NIS: {student.nis}</span>
                          <span>·</span>
                          <span>NISN: {student.nisn}</span>
                        </div>
                      </td>

                      {/* L / P */}
                      <td className="px-2 py-3 text-center">
                        <span
                          className={`font-semibold text-xs ${
                            student.gender === 'L' ? 'text-blue-600' : 'text-pink-600'
                          }`}
                        >
                          {student.gender}
                        </span>
                      </td>

                      {/* Status Input - Fast segmented buttons */}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1 p-1 bg-slate-100/90 rounded-lg">
                          {/* Hadir */}
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateEntry(student.id, {
                                status: 'hadir',
                                arrivalTime: arrivalTime || getCurrentTimeString(),
                              })
                            }
                            className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all ${
                              currentStatus === 'hadir'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50'
                            }`}
                            title="Hadir (Dapat aktif bersamaan dengan Terlambat)"
                          >
                            Hadir
                          </button>

                          {/* Sakit */}
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateEntry(student.id, {
                                status: 'sakit',
                                arrivalTime: '',
                              })
                            }
                            className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all ${
                              currentStatus === 'sakit'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50/50'
                            }`}
                            title="Sakit"
                          >
                            Sakit
                          </button>

                          {/* Izin */}
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateEntry(student.id, {
                                status: 'izin',
                                arrivalTime: '',
                              })
                            }
                            className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all ${
                              currentStatus === 'izin'
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/50'
                            }`}
                            title="Izin"
                          >
                            Izin
                          </button>

                          {/* Alpa */}
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateEntry(student.id, {
                                status: 'alpa',
                                arrivalTime: '',
                              })
                            }
                            className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all ${
                              currentStatus === 'alpa'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50/50'
                            }`}
                            title="Alpa / Tanpa Keterangan"
                          >
                            Alpa
                          </button>

                          {/* Belum Diisi / Reset */}
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateEntry(student.id, {
                                status: 'unmarked',
                                arrivalTime: '',
                                isLate: false,
                                lateMinutes: undefined,
                              })
                            }
                            className={`py-1.5 px-2 rounded-md text-[11px] font-medium transition-all ${
                              currentStatus === 'unmarked'
                                ? 'bg-slate-700 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                            }`}
                            title="Belum Diisi"
                          >
                            Belum
                          </button>
                        </div>
                      </td>

                      {/* Keterlambatan (Dapat aktif bersamaan dengan Hadir) */}
                      <td className="px-2 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleLate(student.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              isLate
                                ? 'bg-amber-500 text-white shadow-xs hover:bg-amber-600 ring-2 ring-amber-400/40'
                                : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-800'
                            }`}
                            title={isLate ? 'Siswa Terlambat (Klik untuk batalkan)' : 'Klik untuk menandai Terlambat'}
                          >
                            <Clock className={`h-3.5 w-3.5 ${isLate ? 'text-white' : 'text-slate-400'}`} />
                            <span>{isLate ? 'Terlambat' : 'Tepat'}</span>
                          </button>
                          {isLate && (
                            <div className="relative flex items-center" title="Menit Keterlambatan (opsional)">
                              <input
                                type="number"
                                min="1"
                                max="240"
                                placeholder="Mnt"
                                value={entry?.lateMinutes || ''}
                                onChange={(e) =>
                                  handleUpdateEntry(student.id, {
                                    lateMinutes: e.target.value ? parseInt(e.target.value, 10) : undefined,
                                  })
                                }
                                className="w-12 rounded-md border border-amber-300 bg-amber-50/70 px-1 py-1 text-xs text-center font-mono-numbers focus:border-amber-500 focus:outline-none"
                              />
                              <span className="text-[10px] text-amber-800 font-medium ml-1">m</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Catatan / Keterangan Tambahan */}
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          placeholder="Keterangan sakit / alasan izin / catatan..."
                          value={notes}
                          onChange={(e) =>
                            handleUpdateEntry(student.id, {
                              notes: e.target.value,
                            })
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer information */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 gap-2">
          <div>
            Menampilkan <span className="font-semibold text-slate-800 font-mono-numbers">{filteredStudents.length}</span> dari{' '}
            <span className="font-semibold text-slate-800 font-mono-numbers">{students.length}</span> siswa
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="text-emerald-700">H: {stats.hadir}</span>
            <span className="text-amber-700">S: {stats.sakit}</span>
            <span className="text-sky-700">I: {stats.izin}</span>
            <span className="text-rose-700">A: {stats.alpa}</span>
            <span className="text-slate-600">Belum Diisi: {stats.belumDiisi}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
