import React, { useState } from 'react';
import {
  Student,
  DailyAttendanceRecord,
  SchoolConfig,
  Semester,
  KopConfig,
} from '../types/attendance';
import {
  formatIndonesianDate,
  formatIndonesianDateWithDay,
  INDONESIAN_MONTHS,
  INDONESIAN_DAYS,
  getDaysInMonth,
  checkDateHoliday,
} from '../utils/date';
import { KopSuratView } from './KopSuratView';
import { KopConfigDrawer } from './KopConfigDrawer';
import { DEFAULT_KOP_CONFIG } from '../utils/storage';
import { Printer, X, Sliders, Check } from 'lucide-react';

export type PrintReportType = 'daily' | 'weekly' | 'monthly' | 'semester' | 'individual';

interface PrintReportViewProps {
  type: PrintReportType;
  schoolConfig: SchoolConfig;
  students: Student[];
  allRecords: Record<string, DailyAttendanceRecord>;
  dailyRecord?: DailyAttendanceRecord;
  weekDates?: string[];
  monthlyData?: { year: number; month: number };
  semesterData?: { semester: Semester; academicYear: string };
  individualStudent?: Student;
  onSaveKopConfig?: (updatedKop: KopConfig) => void;
  onClose: () => void;
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  type,
  schoolConfig,
  students,
  allRecords,
  dailyRecord,
  weekDates,
  monthlyData,
  semesterData,
  individualStudent,
  onSaveKopConfig,
  onClose,
}) => {
  // Local kop configuration that can be tweaked on the fly
  const [activeKop, setActiveKop] = useState<KopConfig>(
    schoolConfig.kopConfig || DEFAULT_KOP_CONFIG
  );
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState<boolean>(false);

  const todayFormatted = activeKop.signDate || formatIndonesianDate(new Date().toISOString().slice(0, 10));
  const signCity = activeKop.signCity || schoolConfig.city;

  const handlePrint = () => {
    window.print();
  };

  const handleSaveDefault = (updated: KopConfig) => {
    setActiveKop(updated);
    if (onSaveKopConfig) {
      onSaveKopConfig(updated);
    }
  };

  // Determine container styling based on orientation and font size
  const isLandscape = activeKop.orientation === 'landscape' || type === 'monthly';
  const fontSizeClass =
    activeKop.fontSize === 'compact'
      ? 'text-[10px]'
      : activeKop.fontSize === 'spacious'
      ? 'text-sm'
      : 'text-xs';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 flex justify-center">
      <div
        className={`relative w-full bg-white rounded-2xl shadow-2xl p-5 sm:p-8 my-auto text-slate-900 border border-slate-300 print-container transition-all ${
          isLandscape ? 'max-w-6xl' : 'max-w-4xl'
        }`}
      >
        {/* Floating Print Action Bar (Hidden on print) */}
        <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-5 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">Pratinjau Dokumen Cetak / PDF</span>
            <span className="text-xs text-slate-500 hidden md:inline">
              (Gunakan opsi Cetak untuk Simpan ke PDF)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsConfigDrawerOpen(!isConfigDrawerOpen)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                isConfigDrawerOpen
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sliders className="h-3.5 w-3.5 text-blue-600" />
              Atur Kop & Tata Letak
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-md transition-colors"
            >
              <Printer className="h-4 w-4" />
              Cetak Dokumen Sekarang
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>

        {/* Kop Configuration Drawer (Hidden on print) */}
        {isConfigDrawerOpen && (
          <div className="no-print">
            <KopConfigDrawer
              currentKop={activeKop}
              schoolConfig={schoolConfig}
              onUpdateKop={setActiveKop}
              onSaveAsDefault={handleSaveDefault}
              onClose={() => setIsConfigDrawerOpen(false)}
            />
          </div>
        )}

        {/* --- DYNAMIC KOP SURAT SEKOLAH --- */}
        <KopSuratView schoolConfig={schoolConfig} customKop={activeKop} />

        {/* DOCUMENT TITLE */}
        <div className="text-center mb-6">
          <h3 className="text-sm sm:text-base font-bold uppercase underline tracking-wide text-slate-950">
            {type === 'daily' && 'DAFTAR HADIR PESERTA DIDIK HARIAN'}
            {type === 'weekly' && 'REKAPITULASI KEHADIRAN SISWA MINGGUAN'}
            {type === 'monthly' && 'REKAPITULASI PRESENSI SISWA BULANAN'}
            {type === 'semester' && 'REKAPITULASI KEHADIRAN SISWA SATU SEMESTER'}
            {type === 'individual' && 'LEMBAR LAPORAN KEHADIRAN SISWA INDIVIDU'}
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Kelas: <strong>{schoolConfig.currentClass}</strong> · Tahun Pelajaran: <strong>{schoolConfig.academicYear}</strong>
            {semesterData && ` · Semester: ${semesterData.semester === '1' ? '1 (Ganjil)' : '2 (Genap)'}`}
            {dailyRecord && ` · Tanggal: ${formatIndonesianDateWithDay(dailyRecord.date)}`}
            {monthlyData && ` · Bulan: ${INDONESIAN_MONTHS[monthlyData.month - 1]} ${monthlyData.year}`}
          </p>
        </div>

        {/* --- CONTENT TYPE 1: DAILY ATTENDANCE TABLE --- */}
        {type === 'daily' && dailyRecord && (
          <div className="overflow-x-auto mb-6">
            <table className={`w-full text-left ${fontSizeClass} border-collapse border border-slate-400`}>
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold">
                  <th className="border border-slate-400 px-2 py-2 text-center w-10">No</th>
                  <th className="border border-slate-400 px-2 py-2 w-20">NIS</th>
                  <th className="border border-slate-400 px-3 py-2">Nama Peserta Didik</th>
                  <th className="border border-slate-400 px-2 py-2 text-center w-10">L/P</th>
                  <th className="border border-slate-400 px-2 py-2 text-center w-28">Status</th>
                  <th className="border border-slate-400 px-3 py-2">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => {
                  const entry = dailyRecord.entries[student.id];
                  const status = entry?.status || 'unmarked';
                  const isLate = !!entry?.isLate;
                  const label =
                    status === 'hadir'
                      ? isLate
                        ? 'Hadir (Terlambat)'
                        : 'Hadir'
                      : status === 'sakit'
                      ? 'Sakit'
                      : status === 'izin'
                      ? 'Izin'
                      : status === 'alpa'
                      ? 'Alpa'
                      : 'Belum Diisi';

                  return (
                    <tr key={student.id}>
                      <td className="border border-slate-400 px-2 py-1.5 text-center">{idx + 1}</td>
                      <td className="border border-slate-400 px-2 py-1.5">{student.nis}</td>
                      <td className="border border-slate-400 px-3 py-1.5 font-medium">{student.name}</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center">{student.gender}</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center font-bold">
                        <span className={isLate ? 'text-amber-800' : ''}>{label}</span>
                      </td>
                      <td className="border border-slate-400 px-3 py-1.5 text-slate-700">{entry?.notes || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* --- CONTENT TYPE 2: WEEKLY TABLE --- */}
        {type === 'weekly' && weekDates && (
          <div className="overflow-x-auto mb-6">
            <table className={`w-full text-left ${fontSizeClass} border-collapse border border-slate-400`}>
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold">
                  <th className="border border-slate-400 px-2 py-2 text-center w-8">No</th>
                  <th className="border border-slate-400 px-3 py-2">Nama Siswa</th>
                  <th className="border border-slate-400 px-1 py-2 text-center w-8">L/P</th>
                  {weekDates.map((dStr) => {
                    const dObj = new Date(dStr + 'T00:00:00');
                    return (
                      <th key={dStr} className="border border-slate-400 px-1 py-1 text-center w-12">
                        {INDONESIAN_DAYS[dObj.getDay()]}
                        <div className="text-[10px] font-normal font-mono-numbers">{dStr.split('-')[2]}</div>
                      </th>
                    );
                  })}
                  <th className="border border-slate-400 px-1 py-2 text-center w-8">H</th>
                  <th className="border border-slate-400 px-1 py-2 text-center w-8 bg-amber-50 text-amber-900" title="Terlambat">T</th>
                  <th className="border border-slate-400 px-1 py-2 text-center w-8">S</th>
                  <th className="border border-slate-400 px-1 py-2 text-center w-8">I</th>
                  <th className="border border-slate-400 px-1 py-2 text-center w-8">A</th>
                  <th className="border border-slate-400 px-2 py-2 text-center w-14">%</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => {
                  let h = 0, t = 0, s = 0, i = 0, a = 0;
                  return (
                    <tr key={student.id}>
                      <td className="border border-slate-400 px-2 py-1 text-center">{idx + 1}</td>
                      <td className="border border-slate-400 px-3 py-1 font-medium">{student.name}</td>
                      <td className="border border-slate-400 px-1 py-1 text-center">{student.gender}</td>
                      {weekDates.map((dateStr) => {
                        const rec = allRecords[`${schoolConfig.currentClass}_${dateStr}`];
                        const entry = rec?.entries[student.id];
                        const st = entry?.status;
                        const isLate = !!entry?.isLate;
                        if (isLate) t++;

                        let mark = '-';
                        if (st === 'hadir') {
                          mark = isLate ? 'H(T)' : 'H';
                          h++;
                        } else if (st === 'sakit') {
                          mark = 'S';
                          s++;
                        } else if (st === 'izin') {
                          mark = 'I';
                          i++;
                        } else if (st === 'alpa') {
                          mark = 'A';
                          a++;
                        }
                        return (
                          <td
                            key={dateStr}
                            className={`border border-slate-400 px-1 py-1 text-center font-bold ${
                              isLate ? 'bg-amber-100 text-amber-950 font-extrabold' : ''
                            }`}
                          >
                            {mark}
                          </td>
                        );
                      })}
                      <td className="border border-slate-400 px-1 py-1 text-center font-bold">{h}</td>
                      <td className="border border-slate-400 px-1 py-1 text-center font-bold text-amber-800 bg-amber-50">{t}</td>
                      <td className="border border-slate-400 px-1 py-1 text-center">{s}</td>
                      <td className="border border-slate-400 px-1 py-1 text-center">{i}</td>
                      <td className="border border-slate-400 px-1 py-1 text-center">{a}</td>
                      <td className="border border-slate-400 px-2 py-1 text-center font-bold">
                        {h + s + i + a > 0 ? ((h / (h + s + i + a)) * 100).toFixed(0) + '%' : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* --- CONTENT TYPE 3: MONTHLY RECAP --- */}
        {type === 'monthly' && monthlyData && (() => {
          const daysCount = getDaysInMonth(monthlyData.year, monthlyData.month);
          const daysArr = Array.from({ length: daysCount }, (_, i) => i + 1);

          return (
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left text-[9px] sm:text-[10px] border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold">
                    <th className="border border-slate-400 px-1 py-1 text-center">No</th>
                    <th className="border border-slate-400 px-2 py-1 min-w-[130px]">Nama Siswa</th>
                    <th className="border border-slate-400 px-0.5 py-1 text-center">JK</th>
                    {daysArr.map((d) => {
                      const dateStr = `${monthlyData.year}-${String(monthlyData.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const hInfo = checkDateHoliday(dateStr, schoolConfig.holidays);
                      return (
                        <th
                          key={d}
                          className={`border border-slate-400 px-0.5 py-1 text-center ${
                            hInfo.isOff ? 'bg-rose-100 text-rose-800 font-bold' : ''
                          }`}
                          title={hInfo.holidayName}
                        >
                          {d}
                        </th>
                      );
                    })}
                    <th className="border border-slate-400 px-1 py-1 text-center">H</th>
                    <th className="border border-slate-400 px-1 py-1 text-center bg-amber-50 text-amber-900" title="Terlambat">T</th>
                    <th className="border border-slate-400 px-1 py-1 text-center">S</th>
                    <th className="border border-slate-400 px-1 py-1 text-center">I</th>
                    <th className="border border-slate-400 px-1 py-1 text-center">A</th>
                    <th className="border border-slate-400 px-1 py-1 text-center">%</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => {
                    let sH = 0, sT = 0, sS = 0, sI = 0, sA = 0;
                    return (
                      <tr key={student.id}>
                        <td className="border border-slate-400 px-1 py-0.5 text-center">{idx + 1}</td>
                        <td className="border border-slate-400 px-2 py-0.5 font-medium truncate max-w-[140px]">{student.name}</td>
                        <td className="border border-slate-400 px-0.5 py-0.5 text-center">{student.gender}</td>
                        {daysArr.map((d) => {
                          const dateStr = `${monthlyData.year}-${String(monthlyData.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                          const hInfo = checkDateHoliday(dateStr, schoolConfig.holidays);
                          const rec = allRecords[`${schoolConfig.currentClass}_${dateStr}`];
                          const entry = rec?.entries[student.id];
                          const st = entry?.status;
                          const isLate = !!entry?.isLate;
                          if (isLate) sT++;

                          let m = '';
                          let cellBg = '';
                          if (st === 'hadir') {
                            sH++;
                            if (isLate) {
                              m = 'T';
                              cellBg = 'bg-amber-100 text-amber-900 font-extrabold';
                            } else {
                              m = '•';
                            }
                          }
                          else if (st === 'sakit') { m = 'S'; sS++; }
                          else if (st === 'izin') { m = 'I'; sI++; }
                          else if (st === 'alpa') { m = 'A'; sA++; }
                          else if (hInfo.isOff) {
                            m = hInfo.isNationalHoliday ? 'L' : '·';
                            cellBg = 'bg-rose-50 text-rose-500 font-bold';
                          }
                          return (
                            <td key={d} className={`border border-slate-400 px-0.5 py-0.5 text-center font-bold ${cellBg}`}>
                              {m}
                            </td>
                          );
                        })}
                        <td className="border border-slate-400 px-1 py-0.5 text-center font-bold">{sH}</td>
                        <td className="border border-slate-400 px-1 py-0.5 text-center font-bold text-amber-800 bg-amber-50">{sT}</td>
                        <td className="border border-slate-400 px-1 py-0.5 text-center">{sS}</td>
                        <td className="border border-slate-400 px-1 py-0.5 text-center">{sI}</td>
                        <td className="border border-slate-400 px-1 py-0.5 text-center">{sA}</td>
                        <td className="border border-slate-400 px-1 py-0.5 text-center font-bold">
                          {sH + sS + sI + sA > 0 ? ((sH / (sH + sS + sI + sA)) * 100).toFixed(0) + '%' : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* --- CONTENT TYPE 4: SEMESTER SUMMARY --- */}
        {type === 'semester' && semesterData && (
          <div className="overflow-x-auto mb-6">
            <table className={`w-full text-left ${fontSizeClass} border-collapse border border-slate-400`}>
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold">
                  <th className="border border-slate-400 px-2 py-2 text-center w-10">No</th>
                  <th className="border border-slate-400 px-2 py-2 w-20">NIS</th>
                  <th className="border border-slate-400 px-3 py-2">Nama Peserta Didik</th>
                  <th className="border border-slate-400 px-2 py-2 text-center w-10">L/P</th>
                  <th className="border border-slate-400 px-2 py-2 text-center w-16">Total H</th>
                  <th className="border border-slate-400 px-2 py-2 text-center w-16 bg-amber-50 text-amber-900" title="Total Terlambat">Total T</th>
                  <th className="border border-slate-400 px-2 py-2 text-center w-16">Total S</th>
                  <th className="border border-slate-400 px-2 py-2 text-center w-16">Total I</th>
                  <th className="border border-slate-400 px-2 py-2 text-center w-16">Total A</th>
                  <th className="border border-slate-400 px-2 py-2 text-center w-20">% Hadir</th>
                  <th className="border border-slate-400 px-3 py-2 text-center w-28">Predikat</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => {
                  let totalH = 0, totalT = 0, totalS = 0, totalI = 0, totalA = 0;
                  Object.values(allRecords).forEach((rec) => {
                    if (rec.classRoom !== schoolConfig.currentClass) return;
                    const entry = rec.entries[student.id];
                    const st = entry?.status;
                    if (st === 'hadir') totalH++;
                    else if (st === 'sakit') totalS++;
                    else if (st === 'izin') totalI++;
                    else if (st === 'alpa') totalA++;

                    if (entry?.isLate) totalT++;
                  });

                  const total = totalH + totalS + totalI + totalA;
                  const pct = total > 0 ? (totalH / total) * 100 : 0;
                  let predikat = 'Sangat Baik';
                  if (total === 0) predikat = '-';
                  else if (pct < 75) predikat = 'Kurang';
                  else if (pct < 85) predikat = 'Cukup';
                  else if (pct < 95) predikat = 'Baik';

                  return (
                    <tr key={student.id}>
                      <td className="border border-slate-400 px-2 py-1.5 text-center">{idx + 1}</td>
                      <td className="border border-slate-400 px-2 py-1.5 font-mono-numbers">{student.nis}</td>
                      <td className="border border-slate-400 px-3 py-1.5 font-medium">{student.name}</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center">{student.gender}</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center font-bold">{totalH}</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center font-bold text-amber-800 bg-amber-50">{totalT}</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center">{totalS}</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center">{totalI}</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center">{totalA}</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center font-bold">
                        {total > 0 ? `${pct.toFixed(1)}%` : '-'}
                      </td>
                      <td className="border border-slate-400 px-3 py-1.5 text-center font-semibold">
                        {predikat}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* --- CONTENT TYPE 5: INDIVIDUAL STUDENT REPORT CARD --- */}
        {type === 'individual' && individualStudent && (() => {
          let h = 0, s = 0, i = 0, a = 0;
          const log: Array<{ date: string; status: string; notes?: string }> = [];

          Object.values(allRecords).forEach((rec) => {
            if (rec.classRoom !== individualStudent.classRoom) return;
            const entry = rec.entries[individualStudent.id];
            if (entry && entry.status && entry.status !== 'unmarked') {
              if (entry.status === 'hadir') h++;
              else if (entry.status === 'sakit') s++;
              else if (entry.status === 'izin') i++;
              else if (entry.status === 'alpa') a++;
              log.push({ date: rec.date, status: entry.status, notes: entry.notes });
            }
          });

          const total = h + s + i + a;
          const rate = total > 0 ? ((h / total) * 100).toFixed(1) : '100';

          return (
            <div className="space-y-4 mb-6">
              {/* Student identity box */}
              <div className="border border-slate-400 p-4 rounded-md text-xs grid grid-cols-2 gap-2">
                <div>Nama Siswa: <strong>{individualStudent.name}</strong></div>
                <div>Kelas: <strong>{individualStudent.classRoom}</strong></div>
                <div>NIS / NISN: <strong>{individualStudent.nis} / {individualStudent.nisn || '-'}</strong></div>
                <div>Jenis Kelamin: <strong>{individualStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</strong></div>
                <div>Orang Tua / Wali: <strong>{individualStudent.parentName || '-'}</strong></div>
                <div>No. Telepon: <strong>{individualStudent.parentPhone || '-'}</strong></div>
              </div>

              {/* Summary table */}
              <table className="w-full text-xs border border-slate-400 border-collapse text-center">
                <thead className="bg-slate-100 font-bold">
                  <tr>
                    <th className="border border-slate-400 p-2">Hadir (Hari)</th>
                    <th className="border border-slate-400 p-2">Sakit (Hari)</th>
                    <th className="border border-slate-400 p-2">Izin (Hari)</th>
                    <th className="border border-slate-400 p-2">Alpa (Hari)</th>
                    <th className="border border-slate-400 p-2">Persentase Kehadiran</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-bold text-sm">
                    <td className="border border-slate-400 p-2 text-emerald-800">{h}</td>
                    <td className="border border-slate-400 p-2 text-amber-800">{s}</td>
                    <td className="border border-slate-400 p-2 text-sky-800">{i}</td>
                    <td className="border border-slate-400 p-2 text-rose-800">{a}</td>
                    <td className="border border-slate-400 p-2">{rate}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* --- FORMAL SIGNATURE SECTION (TANDA TANGAN RESMI) --- */}
        <div className="mt-8 pt-4 border-t border-slate-300 text-xs text-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {activeKop.showCounselorSign && (
            <div className="text-center">
              <p className="mb-1">Guru Bimbingan Konseling,</p>
              <div className="h-16" />
              <p className="font-bold underline uppercase">{schoolConfig.counselorTeacher}</p>
              <p className="text-[11px] text-slate-600">NIP. {schoolConfig.counselorTeacherNip}</p>
            </div>
          )}

          {activeKop.showHomeroomSign && (
            <div className="text-center">
              <p className="mb-1">Wali Kelas {schoolConfig.currentClass},</p>
              <div className="h-16" />
              <p className="font-bold underline uppercase">{schoolConfig.homeroomTeacher}</p>
              <p className="text-[11px] text-slate-600">NIP. {schoolConfig.homeroomTeacherNip}</p>
            </div>
          )}

          {activeKop.showHeadmasterSign && (
            <div className="text-center">
              <p className="mb-1">{signCity}, {todayFormatted}</p>
              <p className="font-bold">Kepala {schoolConfig.schoolName},</p>
              <div className="h-16" />
              <p className="font-bold underline uppercase">{schoolConfig.headmaster}</p>
              <p className="text-[11px] text-slate-600">NIP. {schoolConfig.headmasterNip}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
