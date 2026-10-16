import React, { useState, useMemo } from 'react';
import {
  Student,
  DailyAttendanceRecord,
  SchoolConfig,
  Semester,
} from '../types/attendance';
import { getSemesterMonths, INDONESIAN_MONTHS } from '../utils/date';
import { ExcelService } from '../utils/excel';
import {
  CalendarDays,
  FileSpreadsheet,
  Printer,
  Search,
  Award,
} from 'lucide-react';

interface SemesterRecapProps {
  students: Student[];
  schoolConfig: SchoolConfig;
  allRecords: Record<string, DailyAttendanceRecord>;
  onOpenStudentDetail: (student: Student) => void;
  onPrintSemester: (semester: Semester, academicYear: string, students: Student[]) => void;
}

export const SemesterRecap: React.FC<SemesterRecapProps> = ({
  students,
  schoolConfig,
  allRecords,
  onOpenStudentDetail,
  onPrintSemester,
}) => {
  const [selectedSemester, setSelectedSemester] = useState<Semester>(schoolConfig.semester);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const months = useMemo(() => {
    return getSemesterMonths(selectedSemester);
  }, [selectedSemester]);

  const yearNumber = useMemo(() => {
    const parts = schoolConfig.academicYear.split('/');
    if (selectedSemester === '1') {
      return parseInt(parts[0], 10) || 2024;
    } else {
      return parseInt(parts[1], 10) || 2025;
    }
  }, [selectedSemester, schoolConfig.academicYear]);

  const filteredStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nis.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Rekap Kehadiran Semester
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelas {schoolConfig.currentClass} · Semester {selectedSemester === '1' ? '1 (Ganjil)' : '2 (Genap)'} · TP {schoolConfig.academicYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Semester Selector */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedSemester('1')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                selectedSemester === '1'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semester 1 (Ganjil)
            </button>
            <button
              type="button"
              onClick={() => setSelectedSemester('2')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                selectedSemester === '2'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semester 2 (Genap)
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              ExcelService.exportSemesterRecapExcel(
                students,
                allRecords,
                schoolConfig.currentClass,
                selectedSemester,
                schoolConfig.academicYear,
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
            onClick={() => onPrintSemester(selectedSemester, schoolConfig.academicYear, students)}
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
          placeholder="Cari siswa dalam rekap semester..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Semester Matrix Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              <tr>
                <th scope="col" rowSpan={2} className="w-10 px-2 py-3 text-center border-r border-slate-200">
                  No
                </th>
                <th scope="col" rowSpan={2} className="px-3 py-3 min-w-[180px] border-r border-slate-200">
                  Nama Siswa
                </th>
                <th scope="col" rowSpan={2} className="w-10 px-2 py-3 text-center border-r border-slate-200">
                  L/P
                </th>

                {/* 6 Months of Semester */}
                {months.map((m) => (
                  <th
                    key={m.month}
                    scope="col"
                    colSpan={2}
                    className="px-2 py-1.5 text-center border-r border-slate-200"
                  >
                    {m.name}
                  </th>
                ))}

                {/* Total Semester */}
                <th scope="col" colSpan={5} className="px-2 py-1.5 text-center border-r border-slate-200">
                  Total Semester
                </th>
                <th scope="col" rowSpan={2} className="w-16 px-2 py-3 text-center border-r border-slate-200">
                  % Hadir
                </th>
                <th scope="col" rowSpan={2} className="w-24 px-2 py-3 text-center">
                  Predikat
                </th>
              </tr>
              <tr className="border-t border-slate-200 text-[10px] text-slate-500">
                {months.map((m) => (
                  <React.Fragment key={m.month}>
                    <th scope="col" className="w-10 px-1 py-1.5 text-center text-emerald-700">H</th>
                    <th scope="col" className="w-14 px-1 py-1.5 text-center border-r border-slate-200">S/I/A</th>
                  </React.Fragment>
                ))}
                <th scope="col" className="w-10 px-1 py-1.5 text-center text-emerald-700" title="Total Hadir">H</th>
                <th scope="col" className="w-10 px-1 py-1.5 text-center text-amber-700" title="Total Terlambat (Terpisah)">T</th>
                <th scope="col" className="w-10 px-1 py-1.5 text-center text-yellow-700" title="Total Sakit">S</th>
                <th scope="col" className="w-10 px-1 py-1.5 text-center text-sky-700" title="Total Izin">I</th>
                <th scope="col" className="w-10 px-1 py-1.5 text-center text-rose-700 border-r border-slate-200" title="Total Alpa">A</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={23} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada siswa ditemukan.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => {
                  let totalH = 0;
                  let totalT = 0;
                  let totalS = 0;
                  let totalI = 0;
                  let totalA = 0;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-2 py-2.5 text-center font-mono-numbers text-slate-400 text-xs border-r border-slate-200">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2.5 border-r border-slate-200">
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
                      <td className="px-2 py-2.5 text-center text-xs font-semibold text-slate-600 border-r border-slate-200">
                        {student.gender}
                      </td>

                      {/* Monthly breakdown */}
                      {months.map((m) => {
                        const daysInM = new Date(yearNumber, m.month, 0).getDate();
                        let mH = 0, mS = 0, mI = 0, mA = 0;

                        for (let d = 1; d <= daysInM; d++) {
                          const dateStr = `${yearNumber}-${String(m.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                          const rec = allRecords[`${schoolConfig.currentClass}_${dateStr}`];
                          const entry = rec?.entries[student.id];
                          const st = entry?.status;
                          if (st === 'hadir') mH++;
                          else if (st === 'sakit') mS++;
                          else if (st === 'izin') mI++;
                          else if (st === 'alpa') mA++;

                          if (entry?.isLate) totalT++;
                        }

                        totalH += mH;
                        totalS += mS;
                        totalI += mI;
                        totalA += mA;

                        return (
                          <React.Fragment key={m.month}>
                            <td className="px-1 py-2 text-center font-mono-numbers font-medium text-emerald-700">
                              {mH}
                            </td>
                            <td className="px-1 py-2 text-center font-mono-numbers text-[11px] text-slate-500 border-r border-slate-200">
                              {mS}/{mI}/{mA}
                            </td>
                          </React.Fragment>
                        );
                      })}

                      {/* Total Semester */}
                      <td className="px-1 py-2 text-center font-mono-numbers font-bold text-emerald-700">
                        {totalH}
                      </td>
                      <td className="px-1 py-2 text-center font-mono-numbers font-bold text-amber-700 bg-amber-50/40" title="Total Terlambat Semester">
                        {totalT}
                      </td>
                      <td className="px-1 py-2 text-center font-mono-numbers font-bold text-yellow-700">
                        {totalS}
                      </td>
                      <td className="px-1 py-2 text-center font-mono-numbers font-bold text-sky-700">
                        {totalI}
                      </td>
                      <td className="px-1 py-2 text-center font-mono-numbers font-bold text-rose-700 border-r border-slate-200">
                        {totalA}
                      </td>

                      {/* Percentage & Predicate */}
                      {(() => {
                        const totalMeetings = totalH + totalS + totalI + totalA;
                        const pct = totalMeetings > 0 ? (totalH / totalMeetings) * 100 : 0;
                        const pctStr = totalMeetings > 0 ? pct.toFixed(1) + '%' : '-';

                        let predikat = 'Sangat Baik';
                        let predikatClass = 'text-emerald-700 bg-emerald-50';

                        if (totalMeetings === 0) {
                          predikat = '-';
                          predikatClass = 'text-slate-400';
                        } else if (pct < 75) {
                          predikat = 'Kurang';
                          predikatClass = 'text-rose-700 bg-rose-50 font-bold';
                        } else if (pct < 85) {
                          predikat = 'Cukup';
                          predikatClass = 'text-amber-700 bg-amber-50';
                        } else if (pct < 95) {
                          predikat = 'Baik';
                          predikatClass = 'text-blue-700 bg-blue-50';
                        }

                        return (
                          <>
                            <td className="px-2 py-2 text-center font-mono-numbers font-semibold text-slate-800 border-r border-slate-200">
                              {pctStr}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-md text-xs ${predikatClass}`}>
                                {predikat}
                              </span>
                            </td>
                          </>
                        );
                      })()}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
