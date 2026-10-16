import React, { useState, useMemo } from 'react';
import {
  Student,
  DailyAttendanceRecord,
  SchoolConfig,
} from '../types/attendance';
import {
  getWeekDates,
  formatIndonesianDate,
  INDONESIAN_DAYS,
  getTodayDateString,
  checkDateHoliday,
} from '../utils/date';
import * as XLSX from 'xlsx';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileSpreadsheet,
  Search,
} from 'lucide-react';

interface WeeklyRecapProps {
  students: Student[];
  schoolConfig: SchoolConfig;
  allRecords: Record<string, DailyAttendanceRecord>;
  onOpenStudentDetail: (student: Student) => void;
  onPrintWeekly: (weekDates: string[], students: Student[]) => void;
}

export const WeeklyRecap: React.FC<WeeklyRecapProps> = ({
  students,
  schoolConfig,
  allRecords,
  onOpenStudentDetail,
  onPrintWeekly,
}) => {
  const [baseDate, setBaseDate] = useState<string>(getTodayDateString());
  const [searchQuery, setSearchQuery] = useState<string>('');

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);

  // Navigate to previous or next week
  const handleStepWeek = (daysOffset: number) => {
    const d = new Date(baseDate + 'T00:00:00');
    d.setDate(d.getDate() + daysOffset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    setBaseDate(`${y}-${m}-${dayStr}`);
  };

  const filteredStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nis.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  // Daily class aggregates across the 6 week days
  const dailyClassStats = useMemo(() => {
    return weekDates.map((dateStr) => {
      const rec = allRecords[`${schoolConfig.currentClass}_${dateStr}`];
      let h = 0, s = 0, i = 0, a = 0, t = 0, unmarked = 0;

      students.forEach((student) => {
        const entry = rec?.entries[student.id];
        const status = entry?.status || 'unmarked';
        if (status === 'hadir') h++;
        else if (status === 'sakit') s++;
        else if (status === 'izin') i++;
        else if (status === 'alpa') a++;
        else unmarked++;

        if (entry?.isLate) t++;
      });

      return { dateStr, h, s, i, a, t, unmarked };
    });
  }, [weekDates, allRecords, schoolConfig.currentClass, students]);

  // Export Weekly to Excel
  const handleExportExcel = () => {
    const dataRows = students.map((s, idx) => {
      const row: Record<string, unknown> = {
        'No': idx + 1,
        'NIS': s.nis,
        'Nama Siswa': s.name,
        'L/P': s.gender,
      };

      let hCount = 0;
      let tCount = 0;
      let sCount = 0;
      let iCount = 0;
      let aCount = 0;

      weekDates.forEach((dateStr) => {
        const dObj = new Date(dateStr + 'T00:00:00');
        const dayLabel = `${INDONESIAN_DAYS[dObj.getDay()]} (${dateStr.split('-')[2]})`;
        const rec = allRecords[`${schoolConfig.currentClass}_${dateStr}`];
        const entry = rec?.entries[s.id];
        const status = entry?.status || 'unmarked';
        const isLate = !!entry?.isLate;

        if (isLate) tCount++;

        if (status === 'hadir') {
          row[dayLabel] = isLate ? 'H (T)' : 'H';
          hCount++;
        } else if (status === 'sakit') {
          row[dayLabel] = 'S';
          sCount++;
        } else if (status === 'izin') {
          row[dayLabel] = 'I';
          iCount++;
        } else if (status === 'alpa') {
          row[dayLabel] = 'A';
          aCount++;
        } else {
          row[dayLabel] = '-';
        }
      });

      const totalRecorded = hCount + sCount + iCount + aCount;
      const pct = totalRecorded > 0 ? ((hCount / totalRecorded) * 100).toFixed(1) + '%' : '0%';

      row['Hadir (H)'] = hCount;
      row['Terlambat (T)'] = tCount;
      row['Sakit (S)'] = sCount;
      row['Izin (I)'] = iCount;
      row['Alpa (A)'] = aCount;
      row['% Kehadiran'] = pct;

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Mingguan');
    XLSX.writeFile(
      workbook,
      `Rekap_Mingguan_${schoolConfig.currentClass}_${weekDates[0]}_sd_${weekDates[5]}.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Week Range Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Rekap Kehadiran Mingguan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelas {schoolConfig.currentClass} · Rentang:{' '}
            <span className="font-semibold text-slate-700">
              {formatIndonesianDate(weekDates[0])} s.d. {formatIndonesianDate(weekDates[5])}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Week Stepper */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => handleStepWeek(-7)}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
              title="Minggu Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="px-2.5 text-xs sm:text-sm font-semibold text-slate-800">
              Minggu Ini
            </div>
            <button
              type="button"
              onClick={() => handleStepWeek(7)}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
              title="Minggu Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Ekspor Excel
          </button>

          <button
            type="button"
            onClick={() => onPrintWeekly(weekDates, students)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5 text-blue-600" />
            Cetak Rekap
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari siswa dalam rekap mingguan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Weekly Matrix Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              <tr>
                <th scope="col" className="w-10 px-2 py-3 text-center">No</th>
                <th scope="col" className="px-3 py-3 min-w-[180px]">Nama Siswa</th>
                <th scope="col" className="w-10 px-2 py-3 text-center">L/P</th>
                {weekDates.map((dStr) => {
                  const dObj = new Date(dStr + 'T00:00:00');
                  const dayName = INDONESIAN_DAYS[dObj.getDay()];
                  const dayNum = dStr.split('-')[2];
                  const hInfo = checkDateHoliday(dStr, schoolConfig.holidays);
                  const isOff = hInfo.isOff;

                  return (
                    <th
                      key={dStr}
                      scope="col"
                      className={`w-16 px-1 py-2 text-center border-l border-slate-200 transition-colors ${
                        isOff ? 'bg-rose-50/80 text-rose-700 font-bold border-rose-200' : ''
                      }`}
                      title={hInfo.holidayName}
                    >
                      <div className={isOff ? 'text-rose-700 font-extrabold' : ''}>{dayName}</div>
                      <div
                        className={`text-[10px] font-mono-numbers ${
                          isOff ? 'text-rose-600 font-bold' : 'text-slate-400 font-normal'
                        }`}
                      >
                        {dayNum}
                        {isOff ? ' • Libur' : ''}
                      </div>
                    </th>
                  );
                })}
                <th scope="col" className="w-9 px-1 py-3 text-center border-l border-slate-200 text-emerald-700" title="Hadir (H)">H</th>
                <th scope="col" className="w-9 px-1 py-3 text-center text-amber-700" title="Terlambat (T) - Dihitung terpisah">T</th>
                <th scope="col" className="w-9 px-1 py-3 text-center text-yellow-700" title="Sakit (S)">S</th>
                <th scope="col" className="w-9 px-1 py-3 text-center text-sky-700" title="Izin (I)">I</th>
                <th scope="col" className="w-9 px-1 py-3 text-center text-rose-700" title="Alpa (A)">A</th>
                <th scope="col" className="w-16 px-2 py-3 text-center border-l border-slate-200">% Hadir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada siswa ditemukan.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => {
                  let studentH = 0;
                  let studentT = 0;
                  let studentS = 0;
                  let studentI = 0;
                  let studentA = 0;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-2 py-2.5 text-center font-mono-numbers text-slate-400 text-xs">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => onOpenStudentDetail(student)}
                          className="font-semibold text-slate-900 hover:text-blue-600 hover:underline text-left block truncate"
                        >
                          {student.name}
                        </button>
                        <span className="text-[11px] text-slate-400 font-mono-numbers">
                          NIS: {student.nis}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center text-xs font-semibold text-slate-600">
                        {student.gender}
                      </td>

                      {/* 6 Day cells */}
                      {weekDates.map((dateStr) => {
                        const rec = allRecords[`${schoolConfig.currentClass}_${dateStr}`];
                        const entry = rec?.entries[student.id];
                        const st = entry?.status || 'unmarked';
                        const isLate = !!entry?.isLate;
                        const hInfo = checkDateHoliday(dateStr, schoolConfig.holidays);
                        const isOff = hInfo.isOff;

                        if (isLate) studentT++;

                        let badgeColor = isOff ? 'text-rose-400 font-bold' : 'text-slate-300 font-normal';
                        let label = isOff && st === 'unmarked' ? '·' : '-';

                        if (st === 'hadir') {
                          studentH++;
                          badgeColor = 'bg-emerald-100 text-emerald-800 font-bold';
                          label = 'H';
                        } else if (st === 'sakit') {
                          studentS++;
                          badgeColor = 'bg-yellow-100 text-yellow-800 font-bold';
                          label = 'S';
                        } else if (st === 'izin') {
                          studentI++;
                          badgeColor = 'bg-sky-100 text-sky-800 font-bold';
                          label = 'I';
                        } else if (st === 'alpa') {
                          studentA++;
                          badgeColor = 'bg-rose-100 text-rose-800 font-bold';
                          label = 'A';
                        }

                        return (
                          <td
                            key={dateStr}
                            className={`px-1 py-2 text-center border-l border-slate-100 ${
                              isOff ? 'bg-rose-50/40' : ''
                            }`}
                          >
                            <div className="relative inline-flex items-center justify-center">
                              <span
                                className={`inline-block w-6 h-6 rounded-md text-xs leading-6 text-center ${badgeColor}`}
                                title={
                                  entry?.notes
                                    ? `${label}: ${entry.notes}`
                                    : entry?.arrivalTime
                                    ? `${label} (${entry.arrivalTime})`
                                    : isOff && st === 'unmarked'
                                    ? hInfo.holidayName
                                    : label
                                }
                              >
                                {label}
                              </span>
                              {isLate && (
                                <span
                                  className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white shadow-xs"
                                  title={`Terlambat: ${entry?.lateMinutes ? entry.lateMinutes + ' menit' : entry?.arrivalTime || 'Masuk Terlambat'}`}
                                >
                                  T
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Summary per student: H, T, S, I, A, % Hadir */}
                      <td className="px-1 py-2 text-center font-mono-numbers font-bold text-emerald-700 border-l border-slate-200">
                        {studentH}
                      </td>
                      <td className="px-1 py-2 text-center font-mono-numbers font-bold text-amber-700 bg-amber-50/40" title="Total Terlambat">
                        {studentT}
                      </td>
                      <td className="px-1 py-2 text-center font-mono-numbers font-bold text-yellow-700">
                        {studentS}
                      </td>
                      <td className="px-1 py-2 text-center font-mono-numbers font-bold text-sky-700">
                        {studentI}
                      </td>
                      <td className="px-1 py-2 text-center font-mono-numbers font-bold text-rose-700">
                        {studentA}
                      </td>
                      <td className="px-2 py-2 text-center font-mono-numbers font-semibold text-slate-800 border-l border-slate-200">
                        {studentH + studentS + studentI + studentA > 0
                          ? ((studentH / (studentH + studentS + studentI + studentA)) * 100).toFixed(0) + '%'
                          : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Bottom Total Row for Class */}
            <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-xs text-slate-700">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-right text-emerald-800">
                  Total Hadir Per Hari:
                </td>
                {dailyClassStats.map((st) => (
                  <td key={st.dateStr} className="px-1 py-2 text-center border-l border-slate-200 font-mono-numbers text-emerald-700">
                    {st.h}
                  </td>
                ))}
                <td colSpan={6} className="px-2 py-2 border-l border-slate-200 text-center text-slate-500 font-normal">
                  Rekap Kehadiran
                </td>
              </tr>
              <tr className="bg-amber-50/40 border-t border-slate-200">
                <td colSpan={3} className="px-3 py-2 text-right text-amber-800">
                  Total Terlambat (T) Per Hari:
                </td>
                {dailyClassStats.map((st) => (
                  <td key={`t_${st.dateStr}`} className="px-1 py-2 text-center border-l border-slate-200 font-mono-numbers text-amber-700">
                    {st.t}
                  </td>
                ))}
                <td colSpan={6} className="px-2 py-2 border-l border-slate-200 text-center text-amber-800 text-[11px] font-medium">
                  Perhitungan Keterlambatan Terpisah
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
