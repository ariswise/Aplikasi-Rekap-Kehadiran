import React, { useState, useMemo } from 'react';
import {
  Student,
  DailyAttendanceRecord,
  SchoolConfig,
} from '../types/attendance';
import { INDONESIAN_MONTHS } from '../utils/date';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Users,
  AlertTriangle,
  Award,
  Clock,
  Calendar,
  ChevronRight,
} from 'lucide-react';

interface AttendanceChartsProps {
  students: Student[];
  schoolConfig: SchoolConfig;
  allRecords: Record<string, DailyAttendanceRecord>;
  onOpenStudentDetail: (student: Student) => void;
}

export const AttendanceCharts: React.FC<AttendanceChartsProps> = ({
  students,
  schoolConfig,
  allRecords,
  onOpenStudentDetail,
}) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [activeChartTab, setActiveChartTab] = useState<'all' | 'kehadiran' | 'keterlambatan'>('all');

  // Calculate daily attendance trend for the selected month (termasuk Keterlambatan)
  const dailyTrends = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const data = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const rec = allRecords[`${schoolConfig.currentClass}_${dateStr}`];

      let hadir = 0;
      let sakit = 0;
      let izin = 0;
      let alpa = 0;
      let terlambat = 0;

      if (rec) {
        students.forEach((s) => {
          const entry = rec.entries[s.id];
          if (entry?.status === 'hadir') hadir++;
          else if (entry?.status === 'sakit') sakit++;
          else if (entry?.status === 'izin') izin++;
          else if (entry?.status === 'alpa') alpa++;

          if (entry?.isLate) terlambat++;
        });
      }

      const totalRecorded = hadir + sakit + izin + alpa;
      const rate = totalRecorded > 0 ? (hadir / totalRecorded) * 100 : null;

      data.push({
        day,
        dateStr,
        hadir,
        terlambat,
        sakit,
        izin,
        alpa,
        totalRecorded,
        rate,
      });
    }

    return data;
  }, [selectedYear, selectedMonth, allRecords, schoolConfig.currentClass, students]);

  // Overall counts for selected month
  const monthTotals = useMemo(() => {
    let hadir = 0;
    let terlambat = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    dailyTrends.forEach((d) => {
      hadir += d.hadir;
      terlambat += d.terlambat;
      sakit += d.sakit;
      izin += d.izin;
      alpa += d.alpa;
    });

    const total = hadir + sakit + izin + alpa;
    return {
      hadir,
      terlambat,
      sakit,
      izin,
      alpa,
      total,
      hadirPct: total > 0 ? ((hadir / total) * 100).toFixed(1) : '0',
      terlambatPct: hadir > 0 ? ((terlambat / hadir) * 100).toFixed(1) : '0',
      sakitPct: total > 0 ? ((sakit / total) * 100).toFixed(1) : '0',
      izinPct: total > 0 ? ((izin / total) * 100).toFixed(1) : '0',
      alpaPct: total > 0 ? ((alpa / total) * 100).toFixed(1) : '0',
    };
  }, [dailyTrends]);

  // Student ranking by highest absences (Alpa & total non-hadir)
  const studentAbsenceRanking = useMemo(() => {
    return students
      .map((s) => {
        let h = 0, sakit = 0, izin = 0, alpa = 0;

        dailyTrends.forEach((d) => {
          const rec = allRecords[`${schoolConfig.currentClass}_${d.dateStr}`];
          const st = rec?.entries[s.id]?.status;
          if (st === 'hadir') h++;
          else if (st === 'sakit') sakit++;
          else if (st === 'izin') izin++;
          else if (st === 'alpa') alpa++;
        });

        const totalAbsences = sakit + izin + alpa;
        const totalMeetings = h + totalAbsences;
        const rate = totalMeetings > 0 ? (h / totalMeetings) * 100 : 100;

        return {
          student: s,
          h,
          sakit,
          izin,
          alpa,
          totalAbsences,
          rate,
        };
      })
      .sort((a, b) => b.alpa - a.alpa || b.totalAbsences - a.totalAbsences)
      .slice(0, 5);
  }, [students, dailyTrends, allRecords, schoolConfig.currentClass]);

  // Gender comparison
  const genderStats = useMemo(() => {
    let malePresent = 0, maleTotal = 0;
    let femalePresent = 0, femaleTotal = 0;

    students.forEach((s) => {
      dailyTrends.forEach((d) => {
        const rec = allRecords[`${schoolConfig.currentClass}_${d.dateStr}`];
        const st = rec?.entries[s.id]?.status;
        if (!st || st === 'unmarked') return;

        if (s.gender === 'L') {
          maleTotal++;
          if (st === 'hadir') malePresent++;
        } else {
          femaleTotal++;
          if (st === 'hadir') femalePresent++;
        }
      });
    });

    const maleRate = maleTotal > 0 ? ((malePresent / maleTotal) * 100).toFixed(1) : '0';
    const femaleRate = femaleTotal > 0 ? ((femalePresent / femaleTotal) * 100).toFixed(1) : '0';

    return {
      maleRate,
      femaleRate,
      malePresent,
      maleTotal,
      femalePresent,
      femaleTotal,
    };
  }, [students, dailyTrends, allRecords, schoolConfig.currentClass]);

  // Ranking Keterlambatan Bulan Ini
  const studentLateRanking = useMemo(() => {
    return students
      .map((s) => {
        let lateCount = 0;
        let totalMinutes = 0;

        dailyTrends.forEach((d) => {
          const rec = allRecords[`${schoolConfig.currentClass}_${d.dateStr}`];
          const entry = rec?.entries[s.id];
          if (entry?.isLate) {
            lateCount++;
            totalMinutes += entry.lateMinutes || 15;
          }
        });

        return {
          student: s,
          lateCount,
          totalMinutes,
        };
      })
      .filter((item) => item.lateCount > 0)
      .sort((a, b) => b.lateCount - a.lateCount || b.totalMinutes - a.totalMinutes);
  }, [students, dailyTrends, allRecords, schoolConfig.currentClass]);

  // Akumulasi Keterlambatan Semester Ini untuk Aturan Peringatan Dini (>3x Peringatan, >4x Panggilan Ortu)
  const studentSemesterLateStats = useMemo(() => {
    return students
      .map((s) => {
        let semesterLateCount = 0;
        Object.values(allRecords).forEach((rec) => {
          if (rec.classRoom !== schoolConfig.currentClass) return;
          if (rec.entries[s.id]?.isLate) semesterLateCount++;
        });
        return {
          student: s,
          semesterLateCount,
        };
      })
      .filter((item) => item.semesterLateCount > 0)
      .sort((a, b) => b.semesterLateCount - a.semesterLateCount);
  }, [students, allRecords, schoolConfig.currentClass]);

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Grafik & Analisis Kehadiran
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelas {schoolConfig.currentClass} · Visualisasi Statistik Kehadiran & Keterlambatan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs focus:outline-none cursor-pointer"
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
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs focus:outline-none cursor-pointer"
          >
            {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Selector: Semua, Grafik Kehadiran, Grafik Keterlambatan */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveChartTab('all')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            activeChartTab === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Semua Grafik & Analisis
        </button>
        <button
          type="button"
          onClick={() => setActiveChartTab('kehadiran')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            activeChartTab === 'kehadiran'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Grafik Kehadiran
        </button>
        <button
          type="button"
          onClick={() => setActiveChartTab('keterlambatan')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            activeChartTab === 'keterlambatan'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white border border-amber-200 text-amber-900 bg-amber-50/50 hover:bg-amber-100'
          }`}
        >
          <Clock className="h-3.5 w-3.5 text-amber-600" />
          Grafik Keterlambatan Siswa ({monthTotals.terlambat} Kasus)
        </button>
      </div>

      {/* Grid of Key Visualizations */}
      {(activeChartTab === 'all' || activeChartTab === 'kehadiran') && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Daily Attendance Trend Line / Bar Chart (2 columns) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Tren Persentase Kehadiran Harian
              </h3>
              <p className="text-xs text-slate-500">
                Bulan {INDONESIAN_MONTHS[selectedMonth - 1]} {selectedYear}
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-emerald-700 font-mono-numbers">
                {monthTotals.hadirPct}%
              </span>
              <p className="text-[11px] text-slate-400">Rata-rata Bulan Ini</p>
            </div>
          </div>

          {/* SVG Bar / Trend Chart */}
          <div className="h-56 w-full flex items-end gap-1 sm:gap-1.5 pt-6 pb-2 border-b border-slate-200">
            {dailyTrends.map((d) => {
              const heightPct = d.rate !== null ? d.rate : 0;
              const hasData = d.totalRecorded > 0;

              return (
                <div
                  key={d.day}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative"
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                    <div className="rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] text-white shadow-md whitespace-nowrap">
                      <div className="font-bold">Tgl {d.day}: {hasData ? `${d.rate?.toFixed(0)}%` : 'Libur/Kosong'}</div>
                      {hasData && (
                        <div className="text-[10px] text-slate-300">
                          H: {d.hadir} · S: {d.sakit} · I: {d.izin} · A: {d.alpa}
                        </div>
                      )}
                    </div>
                    <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                  </div>

                  {/* Bar */}
                  <div
                    style={{ height: hasData ? `${Math.max(heightPct, 4)}%` : '3px' }}
                    className={`w-full rounded-t-xs transition-all duration-300 ${
                      !hasData
                        ? 'bg-slate-200'
                        : heightPct >= 90
                        ? 'bg-emerald-500 group-hover:bg-emerald-600'
                        : heightPct >= 75
                        ? 'bg-amber-400 group-hover:bg-amber-500'
                        : 'bg-rose-500 group-hover:bg-rose-600'
                    }`}
                  />
                  <span className="text-[9px] text-slate-400 mt-1.5 font-mono-numbers group-hover:text-slate-800">
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> &gt;= 90%
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> 75% - 89%
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> &lt; 75%
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Arahkan kursor ke grafik untuk detail</span>
          </div>
        </div>

        {/* Status Distribution Pie / Doughnut Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <PieIcon className="h-4 w-4 text-blue-600" />
            Distribusi Status Kehadiran
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Komposisi total absensi bulan {INDONESIAN_MONTHS[selectedMonth - 1]}
          </p>

          {/* Breakdown percentage bars */}
          <div className="space-y-4">
            {/* Hadir */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-800">Hadir (H)</span>
                <span className="font-mono-numbers text-emerald-900">{monthTotals.hadir} ({monthTotals.hadirPct}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${monthTotals.hadirPct}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>

            {/* Sakit */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-800">Sakit (S)</span>
                <span className="font-mono-numbers text-amber-900">{monthTotals.sakit} ({monthTotals.sakitPct}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${monthTotals.sakitPct}%` }}
                  className="h-full bg-amber-400 rounded-full"
                />
              </div>
            </div>

            {/* Izin */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-sky-800">Izin (I)</span>
                <span className="font-mono-numbers text-sky-900">{monthTotals.izin} ({monthTotals.izinPct}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${monthTotals.izinPct}%` }}
                  className="h-full bg-sky-500 rounded-full"
                />
              </div>
            </div>

            {/* Alpa */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-800">Alpa / Tanpa Keterangan (A)</span>
                <span className="font-mono-numbers text-rose-900">{monthTotals.alpa} ({monthTotals.alpaPct}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${monthTotals.alpaPct}%` }}
                  className="h-full bg-rose-500 rounded-full"
                />
              </div>
            </div>

            {/* Terlambat (Dihitung Terpisah) */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-800 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-600" /> Terlambat (T) - Terpisah
                </span>
                <span className="font-mono-numbers text-amber-900 font-bold">{monthTotals.terlambat} Kali ({monthTotals.terlambatPct}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min(parseFloat(monthTotals.terlambatPct), 100)}%` }}
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                *Keterlambatan dihitung otomatis terpisah dan tidak mengurangi persentase kehadiran
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Total Akumulasi Catatan:</span>
            <span className="font-bold text-slate-800 font-mono-numbers">{monthTotals.total} entri</span>
          </div>
        </div>
      </div>
      )}

      {/* --- GRAFIK KETERLAMBATAN SISWA (Dedicated Visuals) --- */}
      {(activeChartTab === 'all' || activeChartTab === 'keterlambatan') && (
        <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Grafik & Analisis Keterlambatan Siswa
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bulan {INDONESIAN_MONTHS[selectedMonth - 1]} {selectedYear} · Kelas {schoolConfig.currentClass}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-900">
                {monthTotals.terlambat} Total Keterlambatan
              </span>
              <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                {studentLateRanking.length} Siswa Terdata
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 p-3.5">
              <span className="text-xs font-semibold text-amber-800 block">Total Keterlambatan Bulan Ini</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-amber-950 font-mono-numbers">
                  {monthTotals.terlambat}
                </span>
                <span className="text-xs text-amber-700">Kejadian</span>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5">
              <span className="text-xs font-semibold text-slate-700 block">Siswa Sering Terlambat</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900 font-mono-numbers">
                  {studentLateRanking.filter((s) => s.lateCount >= 3).length}
                </span>
                <span className="text-xs text-slate-500">&gt;= 3 kali terlambat</span>
              </div>
            </div>

            <div className="rounded-lg bg-rose-50/60 border border-rose-200 p-3.5">
              <span className="text-xs font-semibold text-rose-800 block">Masuk Panggilan Ortu (Semester)</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-rose-950 font-mono-numbers">
                  {studentSemesterLateStats.filter((s) => s.semesterLateCount > 4).length}
                </span>
                <span className="text-xs text-rose-700 font-medium">&gt; 4x keterlambatan</span>
              </div>
            </div>
          </div>

          {/* SVG / Bar Chart: Frekuensi Keterlambatan Per Tanggal */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-amber-600" />
                Tren Frekuensi Keterlambatan Harian (Tanggal 1 - {dailyTrends.length})
              </h4>
              <span className="text-[11px] text-slate-400">
                Arahkan kursor pada batang untuk melihat jumlah siswa terlambat
              </span>
            </div>

            <div className="h-48 w-full flex items-end gap-1 sm:gap-1.5 pt-6 pb-2 border-b border-slate-200">
              {dailyTrends.map((d) => {
                const maxVal = Math.max(...dailyTrends.map((t) => t.terlambat), 4);
                const heightPct = d.terlambat > 0 ? (d.terlambat / maxVal) * 100 : 0;

                return (
                  <div
                    key={d.day}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative"
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                      <div className="rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] text-white shadow-md whitespace-nowrap">
                        <div className="font-bold text-amber-400">Tgl {d.day} {INDONESIAN_MONTHS[selectedMonth - 1]}:</div>
                        <div>{d.terlambat > 0 ? `${d.terlambat} Siswa Terlambat` : 'Nihil Keterlambatan'}</div>
                        <div className="text-[10px] text-slate-300">Total Hadir: {d.hadir} siswa</div>
                      </div>
                      <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                    </div>

                    {/* Count above bar if > 0 */}
                    {d.terlambat > 0 && (
                      <span className="text-[10px] font-bold text-amber-800 font-mono-numbers mb-1">
                        {d.terlambat}
                      </span>
                    )}

                    {/* Bar */}
                    <div
                      style={{ height: d.terlambat > 0 ? `${Math.max(heightPct, 10)}%` : '3px' }}
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        d.terlambat === 0
                          ? 'bg-slate-200/80'
                          : d.terlambat >= 4
                          ? 'bg-rose-500 group-hover:bg-rose-600'
                          : d.terlambat >= 2
                          ? 'bg-amber-500 group-hover:bg-amber-600'
                          : 'bg-amber-400 group-hover:bg-amber-500'
                      }`}
                    />
                    <span className="text-[9px] text-slate-400 mt-1.5 font-mono-numbers group-hover:text-slate-800">
                      {d.day}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> 1 Siswa
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> 2 - 3 Siswa
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> &gt;= 4 Siswa
                </span>
              </div>
              <span className="text-[11px] text-amber-800 font-medium">
                Aturan: Keterlambatan &gt; 3x (Peringatan), &gt; 4x (Surat Panggilan Ortu)
              </span>
            </div>
          </div>

          {/* Ranking Siswa Paling Sering Terlambat */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between mb-3">
              <span>Peringkat Siswa dengan Catatan Keterlambatan (Bulan Ini & Akumulasi Semester)</span>
              <span className="text-[11px] text-slate-400 font-normal">
                {studentLateRanking.length} Siswa Terdata
              </span>
            </h4>

            {studentLateRanking.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                Tidak ada catatan keterlambatan siswa pada bulan {INDONESIAN_MONTHS[selectedMonth - 1]} {selectedYear}.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {studentLateRanking.map((item) => {
                  const semesterLate = studentSemesterLateStats.find((s) => s.student.id === item.student.id)?.semesterLateCount || item.lateCount;
                  const isCallParent = semesterLate > 4;
                  const isWarning = semesterLate > 3 && !isCallParent;

                  return (
                    <div
                      key={item.student.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isCallParent
                          ? 'border-rose-300 bg-rose-50/40 shadow-2xs'
                          : isWarning
                          ? 'border-amber-300 bg-amber-50/40 shadow-2xs'
                          : 'border-slate-200 bg-white shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => onOpenStudentDetail(item.student)}
                            className="text-xs font-bold text-slate-900 hover:text-blue-600 block text-left truncate"
                          >
                            {item.student.name}
                          </button>
                          <span className="text-[10px] text-slate-500 font-mono-numbers">
                            NIS: {item.student.nis} · L/P: {item.student.gender}
                          </span>
                        </div>
                        {isCallParent ? (
                          <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 shrink-0 border border-rose-200">
                            Panggilan Ortu (&gt;4x)
                          </span>
                        ) : isWarning ? (
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 shrink-0 border border-amber-200">
                            Peringatan (&gt;3x)
                          </span>
                        ) : (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 shrink-0">
                            Terpantau
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-600 text-[11px]">
                          Bulan Ini: <strong>{item.lateCount}x</strong> (~{item.totalMinutes} mnt)
                        </span>
                        <span className="font-bold text-amber-900 font-mono-numbers text-[11px]">
                          Total Semester: {semesterLate}x
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Secondary Analytics Row: Gender Comparison & Top Absences Watchlist */}
      {activeChartTab !== 'keterlambatan' && (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gender Comparison */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-blue-600" />
            Analisis Kehadiran Berdasarkan Gender
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Perbandingan tingkat kehadiran siswa Laki-laki dan Perempuan
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Laki-laki */}
            <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700">Laki-laki (L)</span>
                <span className="text-xs font-mono-numbers text-slate-500">
                  {students.filter((s) => s.gender === 'L').length} Siswa
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 font-mono-numbers">
                {genderStats.maleRate}%
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {genderStats.malePresent} hadir dari {genderStats.maleTotal} sesi
              </p>
            </div>

            {/* Perempuan */}
            <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-700">Perempuan (P)</span>
                <span className="text-xs font-mono-numbers text-slate-500">
                  {students.filter((s) => s.gender === 'P').length} Siswa
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 font-mono-numbers">
                {genderStats.femaleRate}%
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {genderStats.femalePresent} hadir dari {genderStats.femaleTotal} sesi
              </p>
            </div>
          </div>
        </div>

        {/* Watchlist: Siswa dengan Ketidakhadiran Tertinggi */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Daftar Pantauan Ketidakhadiran Tertinggi
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Siswa yang memerlukan perhatian wali kelas & guru BK
          </p>

          <div className="divide-y divide-slate-100">
            {studentAbsenceRanking.length === 0 || studentAbsenceRanking.every((s) => s.totalAbsences === 0) ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Seluruh siswa memiliki tingkat kehadiran sempurna pada periode ini!
              </div>
            ) : (
              studentAbsenceRanking.map((item, idx) => (
                <div key={item.student.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-bold text-slate-400 font-mono-numbers">
                      #{idx + 1}
                    </span>
                    <div className="truncate">
                      <button
                        type="button"
                        onClick={() => onOpenStudentDetail(item.student)}
                        className="text-xs font-semibold text-slate-900 hover:text-blue-600 truncate block text-left"
                      >
                        {item.student.name}
                      </button>
                      <span className="text-[11px] text-slate-400">
                        NIS: {item.student.nis} · L/P: {item.student.gender}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.alpa > 0 && (
                      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
                        {item.alpa} Alpa
                      </span>
                    )}
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 font-mono-numbers">
                      {item.rate.toFixed(0)}% Hadir
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
