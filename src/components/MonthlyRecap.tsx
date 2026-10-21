import React, { useState, useMemo } from 'react';
import {
  Student,
  DailyAttendanceRecord,
  SchoolConfig,
} from '../types/attendance';
import {
  INDONESIAN_MONTHS,
  getDaysInMonth,
  getDayOfWeek,
  checkDateHoliday,
} from '../utils/date';
import { ExcelService } from '../utils/excel';
import { sortStudentsAlphabetically } from '../utils/storage';
import {
  Calendar,
  Search,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface MonthlyRecapProps {
  students: Student[];
  schoolConfig: SchoolConfig;
  allRecords: Record<string, DailyAttendanceRecord>;
  onOpenStudentDetail: (student: Student) => void;
  onPrintMonthly: (year: number, month: number, students: Student[]) => void;
}

export const MonthlyRecap: React.FC<MonthlyRecapProps> = ({
  students,
  schoolConfig,
  allRecords,
  onOpenStudentDetail,
  onPrintMonthly,
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12
  const [searchQuery, setSearchQuery] = useState<string>('');

  const daysCount = useMemo(() => {
    return getDaysInMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysCount }, (_, i) => i + 1);
  }, [daysCount]);

  const filteredStudents = useMemo(() => {
    const filtered = students.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nis.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return sortStudentsAlphabetically(filtered);
  }, [students, searchQuery]);

  // Aggregate monthly stats for the whole class
  const classMonthlySummary = useMemo(() => {
    let totalH = 0, totalT = 0, totalS = 0, totalI = 0, totalA = 0;

    filteredStudents.forEach((student) => {
      daysArray.forEach((day) => {
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const rec = allRecords[`${schoolConfig.currentClass}_${dateStr}`];
        const entry = rec?.entries[student.id];
        const status = entry?.status;
        if (status === 'hadir') totalH++;
        else if (status === 'sakit') totalS++;
        else if (status === 'izin') totalI++;
        else if (status === 'alpa') totalA++;

        if (entry?.isLate) totalT++;
      });
    });

    const totalDaysRecorded = totalH + totalS + totalI + totalA;
    const overallPct = totalDaysRecorded > 0 ? ((totalH / totalDaysRecorded) * 100).toFixed(1) : '0';

    return { totalH, totalT, totalS, totalI, totalA, overallPct };
  }, [filteredStudents, daysArray, selectedYear, selectedMonth, allRecords, schoolConfig.currentClass]);

  const handleStepMonth = (offset: number) => {
    let newM = selectedMonth + offset;
    let newY = selectedYear;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    } else if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    setSelectedMonth(newM);
    setSelectedYear(newY);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Month Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Rekap Kehadiran Bulanan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelas {schoolConfig.currentClass} · Bulan {INDONESIAN_MONTHS[selectedMonth - 1]} {selectedYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Stepper */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => handleStepMonth(-1)}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center px-2 gap-1.5">
              <select
                aria-label="Pilih Bulan"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                {INDONESIAN_MONTHS.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                aria-label="Pilih Tahun"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer border-l border-slate-200 pl-1.5"
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
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              ExcelService.exportMonthlyRecapExcel(
                students,
                allRecords,
                schoolConfig.currentClass,
                selectedYear,
                selectedMonth,
                schoolConfig
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Ekspor Excel
          </button>

          <button
            type="button"
            onClick={() => onPrintMonthly(selectedYear, selectedMonth, students)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5 text-blue-600" />
            Cetak Rekap
          </button>
        </div>
      </div>

      {/* Class Statistics Summary Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Hari Dalam Bulan</div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono-numbers">
            {daysCount} <span className="text-xs text-slate-400 font-normal">Hari</span>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5 shadow-2xs">
          <div className="text-xs font-semibold text-emerald-800">Total Hadir (H)</div>
          <div className="text-xl font-bold text-emerald-900 mt-1 font-mono-numbers">
            {classMonthlySummary.totalH}
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 shadow-2xs">
          <div className="text-xs font-semibold text-amber-800">Terlambat (T)</div>
          <div className="text-xl font-bold text-amber-900 mt-1 font-mono-numbers">
            {classMonthlySummary.totalT}
          </div>
        </div>
        <div className="rounded-xl border border-yellow-100 bg-yellow-50/70 p-3.5 shadow-2xs">
          <div className="text-xs font-semibold text-yellow-800">Total Sakit (S)</div>
          <div className="text-xl font-bold text-yellow-900 mt-1 font-mono-numbers">
            {classMonthlySummary.totalS}
          </div>
        </div>
        <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3.5 shadow-2xs">
          <div className="text-xs font-semibold text-sky-800">Total Izin (I)</div>
          <div className="text-xl font-bold text-sky-900 mt-1 font-mono-numbers">
            {classMonthlySummary.totalI}
          </div>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3.5 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-xs font-semibold text-rose-800">Total Alpa (A)</div>
          <div className="text-xl font-bold text-rose-900 mt-1 font-mono-numbers">
            {classMonthlySummary.totalA}
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari siswa dalam rekap bulanan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Full Monthly Matrix Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              <tr>
                <th scope="col" className="w-8 px-1.5 py-3 text-center sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                  No
                </th>
                <th scope="col" className="px-2.5 py-3 min-w-[170px] sticky left-8 bg-slate-50 z-10 border-r border-slate-200">
                  Nama Peserta Didik
                </th>
                <th scope="col" className="w-8 px-1 py-3 text-center border-r border-slate-200">
                  L/P
                </th>

                {/* Days 1 to 28/30/31 */}
                {daysArray.map((d) => {
                  const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const hInfo = checkDateHoliday(dateStr, schoolConfig.holidays);
                  const isOff = hInfo.isOff;

                  return (
                    <th
                      key={d}
                      scope="col"
                      className={`w-6 px-0.5 py-2 text-center border-r border-slate-100 ${
                        isOff ? 'bg-rose-100/90 text-rose-700 font-extrabold border-rose-200' : ''
                      }`}
                      title={hInfo.holidayName || `Tanggal ${d}`}
                    >
                      {d}
                    </th>
                  );
                })}

                {/* Summary Headers */}
                <th scope="col" className="w-8 px-1 py-3 text-center border-l-2 border-slate-200 text-emerald-700" title="Hadir">H</th>
                <th scope="col" className="w-8 px-1 py-3 text-center text-amber-700" title="Terlambat (Dihitung Terpisah)">T</th>
                <th scope="col" className="w-8 px-1 py-3 text-center text-yellow-700" title="Sakit">S</th>
                <th scope="col" className="w-8 px-1 py-3 text-center text-sky-700" title="Izin">I</th>
                <th scope="col" className="w-8 px-1 py-3 text-center text-rose-700" title="Alpa">A</th>
                <th scope="col" className="w-14 px-1.5 py-3 text-center border-l border-slate-200">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={daysCount + 9} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada siswa ditemukan.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => {
                  let sH = 0, sT = 0, sS = 0, sI = 0, sA = 0;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-1.5 py-2 text-center font-mono-numbers text-slate-400 sticky left-0 bg-white z-10 border-r border-slate-200">
                        {index + 1}
                      </td>
                      <td className="px-2.5 py-2 sticky left-8 bg-white z-10 border-r border-slate-200">
                        <button
                          type="button"
                          onClick={() => onOpenStudentDetail(student)}
                          className="font-semibold text-slate-900 hover:text-blue-600 hover:underline text-left block truncate max-w-[160px]"
                        >
                          {student.name}
                        </button>
                      </td>
                      <td className="px-1 py-2 text-center font-medium text-slate-500 border-r border-slate-200">
                        {student.gender}
                      </td>

                      {/* Day Cells */}
                      {daysArray.map((d) => {
                        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const hInfo = checkDateHoliday(dateStr, schoolConfig.holidays);
                        const isOff = hInfo.isOff;

                        const rec = allRecords[`${schoolConfig.currentClass}_${dateStr}`];
                        const entry = rec?.entries[student.id];
                        const status = entry?.status;
                        const isLate = !!entry?.isLate;

                        if (isLate) sT++;

                        let content = '';
                        let cellClass = '';

                        if (status === 'hadir') {
                          sH++;
                          if (isLate) {
                            content = 'T';
                            cellClass = 'bg-amber-100 font-bold text-amber-900 rounded-xs ring-1 ring-amber-300';
                          } else {
                            content = '•';
                            cellClass = 'text-emerald-700 font-extrabold text-sm';
                          }
                        } else if (status === 'sakit') {
                          sS++;
                          content = 'S';
                          cellClass = 'bg-yellow-100 font-bold text-yellow-900 rounded-xs';
                        } else if (status === 'izin') {
                          sI++;
                          content = 'I';
                          cellClass = 'bg-sky-100 font-bold text-sky-900 rounded-xs';
                        } else if (status === 'alpa') {
                          sA++;
                          content = 'A';
                          cellClass = 'bg-rose-100 font-bold text-rose-900 rounded-xs';
                        } else if (isOff) {
                          cellClass = 'bg-rose-50/70 text-rose-400 font-bold';
                          content = hInfo.isNationalHoliday ? 'L' : '·';
                        } else {
                          content = '';
                        }

                        return (
                          <td
                            key={d}
                            className={`px-0.5 py-1.5 text-center border-r border-slate-100 ${cellClass}`}
                            title={
                              isOff && (!status || status === 'unmarked')
                                ? `${hInfo.holidayName} (Libur)`
                                : status === 'hadir' && isLate
                                ? `HADIR TERLAMBAT (${entry?.lateMinutes ? entry.lateMinutes + ' mnt' : entry?.arrivalTime || 'Terlambat'})`
                                : status
                                ? `${status.toUpperCase()} (${d} ${INDONESIAN_MONTHS[selectedMonth - 1]})`
                                : `Belum Ada Catatan (${d} ${INDONESIAN_MONTHS[selectedMonth - 1]})`
                            }
                          >
                            {content}
                          </td>
                        );
                      })}

                      {/* Total metrics */}
                      <td className="px-1 py-2 text-center font-mono-numbers font-bold text-emerald-700 border-l-2 border-slate-200">
                        {sH}
                      </td>
                      <td className="px-1 py-2 text-center font-mono-numbers font-bold text-amber-700 bg-amber-50/40" title="Total Terlambat Bulan Ini">
                        {sT}
                      </td>
                      <td className="px-1 py-2 text-center font-mono-numbers font-bold text-yellow-700">
                        {sS}
                      </td>
                      <td className="px-1 py-2 text-center font-mono-numbers font-bold text-sky-700">
                        {sI}
                      </td>
                      <td className="px-1 py-2 text-center font-mono-numbers font-bold text-rose-700">
                        {sA}
                      </td>
                      <td className="px-1.5 py-2 text-center font-mono-numbers font-semibold text-slate-800 border-l border-slate-200">
                        {sH + sS + sI + sA > 0
                          ? ((sH / (sH + sS + sI + sA)) * 100).toFixed(0) + '%'
                          : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-emerald-700 text-sm">•</span> = Hadir
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded-xs text-[10px] ring-1 ring-amber-300">T</span> = Hadir Terlambat
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-yellow-100 text-yellow-900 font-bold px-1 rounded-xs text-[10px]">S</span> = Sakit
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-sky-100 text-sky-900 font-bold px-1 rounded-xs text-[10px]">I</span> = Izin
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-rose-100 text-rose-900 font-bold px-1 rounded-xs text-[10px]">A</span> = Alpa
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-rose-400 font-bold">·</span> = Hari Minggu / Libur
          </div>
        </div>
      </div>
    </div>
  );
};
