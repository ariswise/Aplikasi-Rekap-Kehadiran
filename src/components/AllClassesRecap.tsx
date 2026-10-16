import React, { useState, useMemo } from 'react';
import {
  Student,
  DailyAttendanceRecord,
  SchoolConfig,
  Semester,
} from '../types/attendance';
import { INDONESIAN_MONTHS, getDaysInMonth, getSemesterMonths, formatIndonesianDate } from '../utils/date';
import { KopSuratView } from './KopSuratView';
import * as XLSX from 'xlsx';
import {
  LayoutGrid,
  Calendar,
  CalendarDays,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Award,
  TrendingUp,
  X,
} from 'lucide-react';

interface AllClassesRecapProps {
  students: Student[];
  schoolConfig: SchoolConfig;
  allRecords: Record<string, DailyAttendanceRecord>;
  onOpenStudentDetail: (student: Student) => void;
  onSwitchClass: (className: string) => void;
  onNavigateToTab: (tab: 'monthly' | 'semester', className: string) => void;
}

export const AllClassesRecap: React.FC<AllClassesRecapProps> = ({
  students,
  schoolConfig,
  allRecords,
  onOpenStudentDetail,
  onSwitchClass,
  onNavigateToTab,
}) => {
  const [activeMode, setActiveMode] = useState<'monthly' | 'semester'>('monthly');

  // Monthly state
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  // Semester state
  const [selectedSemester, setSelectedSemester] = useState<Semester>(schoolConfig.semester || '1');

  // Search & expanded class accordion
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Month navigation
  const handleStepMonth = (step: number) => {
    let nextMonth = selectedMonth + step;
    let nextYear = selectedYear;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    setSelectedMonth(nextMonth);
    setSelectedYear(nextYear);
  };

  // Group students by class
  const studentsByClass = useMemo(() => {
    const map: Record<string, Student[]> = {};
    schoolConfig.availableClasses.forEach((cls) => {
      map[cls] = [];
    });
    students.forEach((s) => {
      if (!map[s.classRoom]) {
        map[s.classRoom] = [];
      }
      map[s.classRoom].push(s);
    });
    return map;
  }, [students, schoolConfig.availableClasses]);

  // MONTHLY RECAP COMPUTATION (Realtime across all classes)
  const monthlyClassSummaries = useMemo(() => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

    return schoolConfig.availableClasses.map((cls) => {
      const classStudents = studentsByClass[cls] || [];
      const maleCount = classStudents.filter((s) => s.gender === 'L').length;
      const femaleCount = classStudents.filter((s) => s.gender === 'P').length;
      const totalStudents = classStudents.length;

      const teacherInfo = schoolConfig.classTeachers?.[cls];
      const homeroomTeacher = teacherInfo?.homeroomTeacher || (cls === schoolConfig.currentClass ? schoolConfig.homeroomTeacher : 'Belum Ditentukan');
      const homeroomTeacherNip = teacherInfo?.homeroomTeacherNip || (cls === schoolConfig.currentClass ? schoolConfig.homeroomTeacherNip : '-');

      let totalH = 0;
      let totalT = 0;
      let totalS = 0;
      let totalI = 0;
      let totalA = 0;

      // Student level statistics for expansion
      const studentStats = classStudents.map((student) => {
        let sH = 0;
        let sT = 0;
        let sS = 0;
        let sI = 0;
        let sA = 0;

        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const rec = allRecords[`${cls}_${dateStr}`];
          const entry = rec?.entries[student.id];
          const st = entry?.status;

          if (st === 'hadir') sH++;
          else if (st === 'sakit') sS++;
          else if (st === 'izin') sI++;
          else if (st === 'alpa') sA++;

          if (entry?.isLate) sT++;
        }

        totalH += sH;
        totalT += sT;
        totalS += sS;
        totalI += sI;
        totalA += sA;

        const totalMeetings = sH + sS + sI + sA;
        const pct = totalMeetings > 0 ? (sH / totalMeetings) * 100 : 0;

        return {
          student,
          h: sH,
          t: sT,
          s: sS,
          i: sI,
          a: sA,
          pct,
        };
      });

      const totalRecorded = totalH + totalS + totalI + totalA;
      const percentAttendance = totalRecorded > 0 ? (totalH / totalRecorded) * 100 : 0;

      let predikat = 'Sangat Baik';
      if (totalRecorded === 0) predikat = '-';
      else if (percentAttendance < 75) predikat = 'Kurang';
      else if (percentAttendance < 85) predikat = 'Cukup';
      else if (percentAttendance < 95) predikat = 'Baik';

      return {
        className: cls,
        homeroomTeacher,
        homeroomTeacherNip,
        totalStudents,
        maleCount,
        femaleCount,
        totalH,
        totalT,
        totalS,
        totalI,
        totalA,
        percentAttendance,
        predikat,
        studentStats,
      };
    });
  }, [schoolConfig, studentsByClass, allRecords, selectedYear, selectedMonth]);

  // SEMESTER RECAP COMPUTATION (Realtime across all classes)
  const semesterClassSummaries = useMemo(() => {
    const months = getSemesterMonths(selectedSemester);
    const yearParts = schoolConfig.academicYear.split('/');
    const isGanjil = selectedSemester === '1';
    const yearNumber = isGanjil
      ? parseInt(yearParts[0], 10) || selectedYear
      : parseInt(yearParts[1], 10) || selectedYear;

    return schoolConfig.availableClasses.map((cls) => {
      const classStudents = studentsByClass[cls] || [];
      const maleCount = classStudents.filter((s) => s.gender === 'L').length;
      const femaleCount = classStudents.filter((s) => s.gender === 'P').length;
      const totalStudents = classStudents.length;

      const teacherInfo = schoolConfig.classTeachers?.[cls];
      const homeroomTeacher = teacherInfo?.homeroomTeacher || (cls === schoolConfig.currentClass ? schoolConfig.homeroomTeacher : 'Belum Ditentukan');
      const homeroomTeacherNip = teacherInfo?.homeroomTeacherNip || (cls === schoolConfig.currentClass ? schoolConfig.homeroomTeacherNip : '-');

      let totalH = 0;
      let totalT = 0;
      let totalS = 0;
      let totalI = 0;
      let totalA = 0;

      const studentStats = classStudents.map((student) => {
        let sH = 0;
        let sT = 0;
        let sS = 0;
        let sI = 0;
        let sA = 0;

        months.forEach((m) => {
          const daysInM = getDaysInMonth(yearNumber, m.month);
          for (let d = 1; d <= daysInM; d++) {
            const dateStr = `${yearNumber}-${String(m.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const rec = allRecords[`${cls}_${dateStr}`];
            const entry = rec?.entries[student.id];
            const st = entry?.status;

            if (st === 'hadir') sH++;
            else if (st === 'sakit') sS++;
            else if (st === 'izin') sI++;
            else if (st === 'alpa') sA++;

            if (entry?.isLate) sT++;
          }
        });

        totalH += sH;
        totalT += sT;
        totalS += sS;
        totalI += sI;
        totalA += sA;

        const totalMeetings = sH + sS + sI + sA;
        const pct = totalMeetings > 0 ? (sH / totalMeetings) * 100 : 0;

        return {
          student,
          h: sH,
          t: sT,
          s: sS,
          i: sI,
          a: sA,
          pct,
        };
      });

      const totalRecorded = totalH + totalS + totalI + totalA;
      const percentAttendance = totalRecorded > 0 ? (totalH / totalRecorded) * 100 : 0;

      let predikat = 'Sangat Baik';
      if (totalRecorded === 0) predikat = '-';
      else if (percentAttendance < 75) predikat = 'Kurang';
      else if (percentAttendance < 85) predikat = 'Cukup';
      else if (percentAttendance < 95) predikat = 'Baik';

      return {
        className: cls,
        homeroomTeacher,
        homeroomTeacherNip,
        totalStudents,
        maleCount,
        femaleCount,
        totalH,
        totalT,
        totalS,
        totalI,
        totalA,
        percentAttendance,
        predikat,
        studentStats,
      };
    });
  }, [schoolConfig, studentsByClass, allRecords, selectedSemester, selectedYear]);

  // Active dataset based on mode
  const currentSummaries = activeMode === 'monthly' ? monthlyClassSummaries : semesterClassSummaries;

  // School-wide aggregates
  const schoolTotalStudents = students.length;
  const schoolTotalH = useMemo(() => currentSummaries.reduce((acc, c) => acc + c.totalH, 0), [currentSummaries]);
  const schoolTotalT = useMemo(() => currentSummaries.reduce((acc, c) => acc + c.totalT, 0), [currentSummaries]);
  const schoolTotalS = useMemo(() => currentSummaries.reduce((acc, c) => acc + c.totalS, 0), [currentSummaries]);
  const schoolTotalI = useMemo(() => currentSummaries.reduce((acc, c) => acc + c.totalI, 0), [currentSummaries]);
  const schoolTotalA = useMemo(() => currentSummaries.reduce((acc, c) => acc + c.totalA, 0), [currentSummaries]);
  const schoolOverallRecorded = schoolTotalH + schoolTotalS + schoolTotalI + schoolTotalA;
  const schoolOverallPct = schoolOverallRecorded > 0 ? ((schoolTotalH / schoolOverallRecorded) * 100).toFixed(1) : '0';

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return currentSummaries;
    const q = searchQuery.toLowerCase();
    return currentSummaries.filter(
      (c) =>
        c.className.toLowerCase().includes(q) ||
        c.homeroomTeacher.toLowerCase().includes(q)
    );
  }, [currentSummaries, searchQuery]);

  // Export to Excel
  const handleExportAllClassesExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryRows = currentSummaries.map((c, idx) => ({
      'No': idx + 1,
      'Rombel / Kelas': c.className,
      'Wali Kelas': c.homeroomTeacher,
      'NIP Wali Kelas': c.homeroomTeacherNip,
      'Siswa (L)': c.maleCount,
      'Siswa (P)': c.femaleCount,
      'Total Siswa': c.totalStudents,
      'Total Hadir (H)': c.totalH,
      'Total Terlambat (T)': c.totalT,
      'Total Sakit (S)': c.totalS,
      'Total Izin (I)': c.totalI,
      'Total Alpa (A)': c.totalA,
      '% Kehadiran': `${c.percentAttendance.toFixed(1)}%`,
      'Predikat': c.predikat,
    }));

    // Add total row
    summaryRows.push({
      'No': 999,
      'Rombel / Kelas': 'TOTAL KESELURUHAN SEKOLAH',
      'Wali Kelas': '-',
      'NIP Wali Kelas': '-',
      'Siswa (L)': currentSummaries.reduce((acc, c) => acc + c.maleCount, 0),
      'Siswa (P)': currentSummaries.reduce((acc, c) => acc + c.femaleCount, 0),
      'Total Siswa': schoolTotalStudents,
      'Total Hadir (H)': schoolTotalH,
      'Total Terlambat (T)': schoolTotalT,
      'Total Sakit (S)': schoolTotalS,
      'Total Izin (I)': schoolTotalI,
      'Total Alpa (A)': schoolTotalA,
      '% Kehadiran': `${schoolOverallPct}%`,
      'Predikat': parseFloat(schoolOverallPct) >= 95 ? 'Sangat Baik' : parseFloat(schoolOverallPct) >= 85 ? 'Baik' : 'Cukup',
    });

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan Semua Kelas');

    // Add Individual Class Sheets
    currentSummaries.forEach((c) => {
      if (c.studentStats.length === 0) return;
      const classRows = c.studentStats.map((st, i) => ({
        'No': i + 1,
        'NIS': st.student.nis,
        'Nama Siswa': st.student.name,
        'L/P': st.student.gender,
        'Hadir (H)': st.h,
        'Terlambat (T)': st.t,
        'Sakit (S)': st.s,
        'Izin (I)': st.i,
        'Alpa (A)': st.a,
        '% Kehadiran': `${st.pct.toFixed(1)}%`,
      }));
      const classSheet = XLSX.utils.json_to_sheet(classRows);
      const safeSheetName = c.className.replace(/[:\\/?*[\]]/g, '_').slice(0, 30);
      XLSX.utils.book_append_sheet(workbook, classSheet, safeSheetName);
    });

    const periodName =
      activeMode === 'monthly'
        ? `Bulanan_${INDONESIAN_MONTHS[selectedMonth - 1]}_${selectedYear}`
        : `Semester_${selectedSemester}_TP_${schoolConfig.academicYear.replace('/', '-')}`;

    XLSX.writeFile(workbook, `Rekap_Keseluruhan_Kelas_${schoolConfig.schoolName.replace(/\s+/g, '_')}_${periodName}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-600 p-2 text-white shadow-xs">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Rekap Keseluruhan Kelas (Realtime)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring komprehensif kehadiran seluruh rombel untuk Administrator Sekolah
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveMode('monthly')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeMode === 'monthly'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekap Bulanan
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('semester')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeMode === 'semester'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekap Semester
            </button>
          </div>

          {/* Export Excel */}
          <button
            type="button"
            onClick={handleExportAllClassesExcel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Ekspor seluruh data kelas ke Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>

          {/* Print Report */}
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Cetak format laporan resmi sekolah"
          >
            <Printer className="h-3.5 w-3.5 text-blue-600" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* Period Selection Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        {activeMode === 'monthly' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Periode Bulan:</span>
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => handleStepMonth(-1)}
                className="p-1 text-slate-600 hover:bg-slate-200 rounded"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center px-2 gap-1.5">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="bg-transparent text-xs sm:text-sm font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {INDONESIAN_MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="bg-transparent text-xs sm:text-sm font-bold text-slate-900 focus:outline-none cursor-pointer border-l border-slate-300 pl-1.5"
                >
                  {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => handleStepMonth(1)}
                className="p-1 text-slate-600 hover:bg-slate-200 rounded"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Pilihan Semester:</span>
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedSemester('1')}
                className={`px-3 py-1 rounded font-semibold transition-colors ${
                  selectedSemester === '1'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semester 1 (Ganjil)
              </button>
              <button
                type="button"
                onClick={() => setSelectedSemester('2')}
                className={`px-3 py-1 rounded font-semibold transition-colors ${
                  selectedSemester === '2'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semester 2 (Genap)
              </button>
            </div>
            <span className="text-xs text-slate-500 font-medium ml-2">
              TP {schoolConfig.academicYear}
            </span>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kelas atau wali kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* High-Level School KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total Students */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Total Siswa</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono-numbers">
              {schoolTotalStudents}
            </span>
            <span className="text-[10px] text-slate-400 ml-1">({schoolConfig.availableClasses.length} Kelas)</span>
          </div>
        </div>

        {/* Total Hadir */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-semibold">Total Hadir (H)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-900 font-mono-numbers">
              {schoolTotalH}
            </span>
          </div>
        </div>

        {/* Total Terlambat */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[11px] font-semibold">Terlambat (T)</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-amber-900 font-mono-numbers">
              {schoolTotalT}
            </span>
          </div>
        </div>

        {/* Total Sakit & Izin */}
        <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-sky-800">
            <span className="text-[11px] font-semibold">Sakit & Izin (S/I)</span>
            <span className="text-xs font-bold font-mono-numbers">{schoolTotalS + schoolTotalI}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xs font-semibold text-sky-700">S: {schoolTotalS}</span>
            <span className="text-xs font-semibold text-sky-700">I: {schoolTotalI}</span>
          </div>
        </div>

        {/* Total Alpa */}
        <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-[11px] font-semibold">Alpa (A)</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-rose-900 font-mono-numbers">
              {schoolTotalA}
            </span>
          </div>
        </div>

        {/* % Rata-rata Sekolah */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-800">
            <span className="text-[11px] font-semibold">Rata-rata % Hadir</span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-indigo-900 font-mono-numbers">
              {schoolOverallPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Class Comparison Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Matriks Perbandingan Kehadiran Per Rombel
            </h3>
            <p className="text-xs text-slate-500">
              {activeMode === 'monthly'
                ? `Rekap Bulan ${INDONESIAN_MONTHS[selectedMonth - 1]} ${selectedYear}`
                : `Rekap Semester ${selectedSemester === '1' ? '1 (Ganjil)' : '2 (Genap)'} TP ${schoolConfig.academicYear}`}
            </p>
          </div>
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md self-start sm:self-auto">
            Terhubung Realtime ke Basis Data
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              <tr>
                <th scope="col" className="w-10 px-3 py-3 text-center">No</th>
                <th scope="col" className="px-3 py-3 min-w-[140px]">Rombel / Kelas</th>
                <th scope="col" className="px-3 py-3 min-w-[160px]">Wali Kelas</th>
                <th scope="col" className="w-24 px-2 py-3 text-center">Siswa (L/P/Tot)</th>
                <th scope="col" className="w-16 px-2 py-3 text-center text-emerald-700" title="Total Hadir">Hadir (H)</th>
                <th scope="col" className="w-16 px-2 py-3 text-center text-amber-700 bg-amber-50/50" title="Total Terlambat">Terlambat (T)</th>
                <th scope="col" className="w-14 px-2 py-3 text-center text-yellow-700">Sakit (S)</th>
                <th scope="col" className="w-14 px-2 py-3 text-center text-sky-700">Izin (I)</th>
                <th scope="col" className="w-14 px-2 py-3 text-center text-rose-700">Alpa (A)</th>
                <th scope="col" className="w-24 px-2 py-3 text-center">% Hadir</th>
                <th scope="col" className="w-28 px-3 py-3 text-center">Predikat</th>
                <th scope="col" className="w-32 px-3 py-3 text-center">Aksi Rombel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada rombel yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((summary, idx) => {
                  const isExpanded = expandedClass === summary.className;
                  const isActiveInApp = summary.className === schoolConfig.currentClass;

                  return (
                    <React.Fragment key={summary.className}>
                      <tr className={`transition-colors hover:bg-slate-50/80 ${isExpanded ? 'bg-blue-50/20' : ''}`}>
                        {/* No */}
                        <td className="px-3 py-3 text-center font-mono-numbers text-slate-400 text-xs">
                          {idx + 1}
                        </td>

                        {/* Kelas */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{summary.className}</span>
                            {isActiveInApp && (
                              <span className="rounded bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.2">
                                Aktif
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Wali Kelas */}
                        <td className="px-3 py-3">
                          <div className="font-medium text-slate-800">{summary.homeroomTeacher}</div>
                          <div className="text-[11px] text-slate-400 font-mono-numbers">
                            NIP: {summary.homeroomTeacherNip}
                          </div>
                        </td>

                        {/* Siswa */}
                        <td className="px-2 py-3 text-center font-mono-numbers text-xs">
                          <span className="text-blue-600 font-semibold">{summary.maleCount}</span> /{' '}
                          <span className="text-pink-600 font-semibold">{summary.femaleCount}</span> /{' '}
                          <span className="font-bold text-slate-900">{summary.totalStudents}</span>
                        </td>

                        {/* Hadir */}
                        <td className="px-2 py-3 text-center font-mono-numbers font-bold text-emerald-700">
                          {summary.totalH}
                        </td>

                        {/* Terlambat */}
                        <td className="px-2 py-3 text-center font-mono-numbers font-bold text-amber-800 bg-amber-50/40">
                          {summary.totalT}
                        </td>

                        {/* Sakit */}
                        <td className="px-2 py-3 text-center font-mono-numbers text-yellow-700 font-semibold">
                          {summary.totalS}
                        </td>

                        {/* Izin */}
                        <td className="px-2 py-3 text-center font-mono-numbers text-sky-700 font-semibold">
                          {summary.totalI}
                        </td>

                        {/* Alpa */}
                        <td className="px-2 py-3 text-center font-mono-numbers text-rose-700 font-semibold">
                          {summary.totalA}
                        </td>

                        {/* % Hadir */}
                        <td className="px-2 py-3 text-center">
                          <div className="font-mono-numbers font-bold text-slate-900">
                            {summary.percentAttendance.toFixed(1)}%
                          </div>
                          <div className="w-16 bg-slate-100 h-1 rounded-full mx-auto mt-1 overflow-hidden">
                            <div
                              className={`h-full ${
                                summary.percentAttendance >= 90
                                  ? 'bg-emerald-500'
                                  : summary.percentAttendance >= 80
                                  ? 'bg-blue-500'
                                  : summary.percentAttendance >= 70
                                  ? 'bg-yellow-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(summary.percentAttendance, 100)}%` }}
                            />
                          </div>
                        </td>

                        {/* Predikat */}
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              summary.predikat === 'Sangat Baik'
                                ? 'bg-emerald-100 text-emerald-800'
                                : summary.predikat === 'Baik'
                                ? 'bg-blue-100 text-blue-800'
                                : summary.predikat === 'Cukup'
                                ? 'bg-yellow-100 text-yellow-800'
                                : summary.predikat === 'Kurang'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {summary.predikat}
                          </span>
                        </td>

                        {/* Aksi */}
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Toggle breakdown */}
                            <button
                              type="button"
                              onClick={() => setExpandedClass(isExpanded ? null : summary.className)}
                              className={`rounded p-1.5 text-xs font-semibold flex items-center gap-1 transition-colors ${
                                isExpanded
                                  ? 'bg-blue-600 text-white'
                                  : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                              title={isExpanded ? 'Tutup rincian siswa' : 'Buka rincian siswa kelas ini'}
                            >
                              <span>Siswa</span>
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>

                            {/* Direct to Tab */}
                            <button
                              type="button"
                              onClick={() => {
                                onSwitchClass(summary.className);
                                onNavigateToTab(activeMode, summary.className);
                              }}
                              className="rounded p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-200"
                              title={`Buka kelas ${summary.className} di menu ${activeMode === 'monthly' ? 'Rekap Bulanan' : 'Rekap Semester'}`}
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Class Student Breakdown */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={12} className="bg-slate-50/90 p-4 border-b border-slate-200">
                            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-2 gap-2">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900">
                                    Rincian Kehadiran Siswa Kelas {summary.className} ({summary.studentStats.length} Siswa)
                                  </h4>
                                  <p className="text-[11px] text-slate-500">
                                    Wali Kelas: {summary.homeroomTeacher} (NIP: {summary.homeroomTeacherNip})
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSwitchClass(summary.className);
                                    onNavigateToTab(activeMode, summary.className);
                                  }}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                                >
                                  Buka Tampilan Penuh Kelas Ini →
                                </button>
                              </div>

                              <div className="overflow-x-auto max-h-72">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                                    <tr>
                                      <th className="px-2 py-1.5 text-center w-8">No</th>
                                      <th className="px-2 py-1.5 w-20">NIS</th>
                                      <th className="px-3 py-1.5">Nama Siswa</th>
                                      <th className="px-2 py-1.5 text-center w-10">L/P</th>
                                      <th className="px-2 py-1.5 text-center text-emerald-700 w-12">H</th>
                                      <th className="px-2 py-1.5 text-center text-amber-700 w-12 bg-amber-50/50">T</th>
                                      <th className="px-2 py-1.5 text-center text-yellow-700 w-12">S</th>
                                      <th className="px-2 py-1.5 text-center text-sky-700 w-12">I</th>
                                      <th className="px-2 py-1.5 text-center text-rose-700 w-12">A</th>
                                      <th className="px-2 py-1.5 text-center w-16">% Hadir</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {summary.studentStats.length === 0 ? (
                                      <tr>
                                        <td colSpan={10} className="px-3 py-4 text-center text-slate-400">
                                          Belum ada siswa terdaftar pada kelas ini.
                                        </td>
                                      </tr>
                                    ) : (
                                      summary.studentStats.map((st, i) => (
                                        <tr key={st.student.id} className="hover:bg-slate-50">
                                          <td className="px-2 py-1.5 text-center font-mono-numbers text-slate-400">
                                            {i + 1}
                                          </td>
                                          <td className="px-2 py-1.5 font-mono-numbers text-slate-600">
                                            {st.student.nis}
                                          </td>
                                          <td className="px-3 py-1.5">
                                            <button
                                              type="button"
                                              onClick={() => onOpenStudentDetail(st.student)}
                                              className="font-medium text-slate-900 hover:text-blue-600 hover:underline text-left"
                                            >
                                              {st.student.name}
                                            </button>
                                          </td>
                                          <td className="px-2 py-1.5 text-center text-slate-500">
                                            {st.student.gender}
                                          </td>
                                          <td className="px-2 py-1.5 text-center font-mono-numbers font-bold text-emerald-700">
                                            {st.h}
                                          </td>
                                          <td className="px-2 py-1.5 text-center font-mono-numbers font-bold text-amber-800 bg-amber-50/50">
                                            {st.t}
                                          </td>
                                          <td className="px-2 py-1.5 text-center font-mono-numbers text-yellow-700">
                                            {st.s}
                                          </td>
                                          <td className="px-2 py-1.5 text-center font-mono-numbers text-sky-700">
                                            {st.i}
                                          </td>
                                          <td className="px-2 py-1.5 text-center font-mono-numbers text-rose-700">
                                            {st.a}
                                          </td>
                                          <td className="px-2 py-1.5 text-center font-mono-numbers font-bold text-slate-800">
                                            {st.pct.toFixed(0)}%
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            {/* Table Footer Totals */}
            <tfoot className="border-t-2 border-slate-300 bg-slate-100/90 font-bold text-slate-900">
              <tr>
                <td colSpan={3} className="px-3 py-2.5 text-right uppercase text-xs">
                  Total Seluruh Sekolah ({schoolConfig.availableClasses.length} Rombel)
                </td>
                <td className="px-2 py-2.5 text-center font-mono-numbers text-xs">
                  {schoolTotalStudents}
                </td>
                <td className="px-2 py-2.5 text-center font-mono-numbers text-emerald-800 text-xs font-bold">
                  {schoolTotalH}
                </td>
                <td className="px-2 py-2.5 text-center font-mono-numbers text-amber-800 bg-amber-100/40 text-xs font-bold">
                  {schoolTotalT}
                </td>
                <td className="px-2 py-2.5 text-center font-mono-numbers text-yellow-800 text-xs">
                  {schoolTotalS}
                </td>
                <td className="px-2 py-2.5 text-center font-mono-numbers text-sky-800 text-xs">
                  {schoolTotalI}
                </td>
                <td className="px-2 py-2.5 text-center font-mono-numbers text-rose-800 text-xs">
                  {schoolTotalA}
                </td>
                <td className="px-2 py-2.5 text-center font-mono-numbers text-indigo-900 text-xs font-bold">
                  {schoolOverallPct}%
                </td>
                <td className="px-3 py-2.5 text-center text-xs">
                  {parseFloat(schoolOverallPct) >= 95
                    ? 'Sangat Baik'
                    : parseFloat(schoolOverallPct) >= 85
                    ? 'Baik'
                    : 'Cukup'}
                </td>
                <td className="px-3 py-2.5 text-center text-xs text-slate-500">
                  -
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Print View Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
          <div className="relative w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto print:shadow-none print:max-h-none print:p-0">
            {/* Modal Controls (hidden on print) */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Printer className="h-5 w-5 text-blue-600" />
                Cetak Rekapitulasi Keseluruhan Kelas
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  <Printer className="h-4 w-4" />
                  Cetak Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div className="space-y-6 text-slate-900">
              {/* Official Kop Surat */}
              <KopSuratView schoolConfig={schoolConfig} customKop={schoolConfig.kopConfig} />

              {/* Document Title */}
              <div className="text-center space-y-1">
                <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide">
                  REKAPITULASI KEHADIRAN KESELURUHAN KELAS
                </h2>
                <p className="text-xs font-semibold text-slate-700">
                  {activeMode === 'monthly'
                    ? `Bulan: ${INDONESIAN_MONTHS[selectedMonth - 1]} ${selectedYear} · Tahun Pelajaran ${schoolConfig.academicYear}`
                    : `Semester: ${selectedSemester === '1' ? '1 (Ganjil)' : '2 (Genap)'} · Tahun Pelajaran ${schoolConfig.academicYear}`}
                </p>
              </div>

              {/* Print Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse border border-slate-400">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-900 text-center">
                      <th className="border border-slate-400 px-2 py-1.5 w-8">No</th>
                      <th className="border border-slate-400 px-3 py-1.5 text-left">Rombel / Kelas</th>
                      <th className="border border-slate-400 px-3 py-1.5 text-left">Nama Wali Kelas</th>
                      <th className="border border-slate-400 px-2 py-1.5 w-16">Jml Siswa</th>
                      <th className="border border-slate-400 px-2 py-1.5 w-12">H</th>
                      <th className="border border-slate-400 px-2 py-1.5 w-12 bg-amber-50">T</th>
                      <th className="border border-slate-400 px-2 py-1.5 w-12">S</th>
                      <th className="border border-slate-400 px-2 py-1.5 w-12">I</th>
                      <th className="border border-slate-400 px-2 py-1.5 w-12">A</th>
                      <th className="border border-slate-400 px-2 py-1.5 w-16">% Hadir</th>
                      <th className="border border-slate-400 px-2 py-1.5 w-24">Predikat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSummaries.map((s, idx) => (
                      <tr key={s.className}>
                        <td className="border border-slate-400 px-2 py-1 text-center">{idx + 1}</td>
                        <td className="border border-slate-400 px-3 py-1 font-bold">{s.className}</td>
                        <td className="border border-slate-400 px-3 py-1">{s.homeroomTeacher}</td>
                        <td className="border border-slate-400 px-2 py-1 text-center">{s.totalStudents}</td>
                        <td className="border border-slate-400 px-2 py-1 text-center font-bold">{s.totalH}</td>
                        <td className="border border-slate-400 px-2 py-1 text-center font-bold bg-amber-50 text-amber-900">{s.totalT}</td>
                        <td className="border border-slate-400 px-2 py-1 text-center">{s.totalS}</td>
                        <td className="border border-slate-400 px-2 py-1 text-center">{s.totalI}</td>
                        <td className="border border-slate-400 px-2 py-1 text-center">{s.totalA}</td>
                        <td className="border border-slate-400 px-2 py-1 text-center font-bold">
                          {s.percentAttendance.toFixed(1)}%
                        </td>
                        <td className="border border-slate-400 px-2 py-1 text-center font-semibold">
                          {s.predikat}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold">
                      <td colSpan={3} className="border border-slate-400 px-3 py-1.5 text-right uppercase">
                        TOTAL KESELURUHAN SEKOLAH
                      </td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center">{schoolTotalStudents}</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center">{schoolTotalH}</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center bg-amber-50">{schoolTotalT}</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center">{schoolTotalS}</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center">{schoolTotalI}</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center">{schoolTotalA}</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center">{schoolOverallPct}%</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center">
                        {parseFloat(schoolOverallPct) >= 95 ? 'Sangat Baik' : parseFloat(schoolOverallPct) >= 85 ? 'Baik' : 'Cukup'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-6 text-xs text-center">
                <div className="space-y-16">
                  <div>
                    <p className="text-slate-500">Mengetahui,</p>
                    <p className="font-semibold text-slate-800">Kepala Satuan Pendidikan</p>
                  </div>
                  <div>
                    <p className="font-bold underline text-slate-900">{schoolConfig.headmaster}</p>
                    <p className="text-[11px] text-slate-500 font-mono-numbers">NIP. {schoolConfig.headmasterNip}</p>
                  </div>
                </div>

                <div className="space-y-16">
                  <div>
                    <p className="text-slate-500">
                      {schoolConfig.city || 'Kota'}, {formatIndonesianDate(new Date().toISOString().slice(0, 10))}
                    </p>
                    <p className="font-semibold text-slate-800">Petugas / Administrator Sekolah</p>
                  </div>
                  <div>
                    <p className="font-bold underline text-slate-900">Administrator Sekolah</p>
                    <p className="text-[11px] text-slate-500 font-mono-numbers">Sistem Informasi Kehadiran</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
