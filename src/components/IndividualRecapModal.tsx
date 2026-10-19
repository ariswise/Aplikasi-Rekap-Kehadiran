import React, { useMemo } from 'react';
import { Student, DailyAttendanceRecord, SchoolConfig } from '../types/attendance';
import { formatIndonesianDateWithDay } from '../utils/date';
import {
  X,
  Printer,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface IndividualRecapModalProps {
  student: Student | null;
  schoolConfig: SchoolConfig;
  allRecords: Record<string, DailyAttendanceRecord>;
  onClose: () => void;
  onPrintStudentReport: (student: Student) => void;
}

export const IndividualRecapModal: React.FC<IndividualRecapModalProps> = ({
  student,
  schoolConfig,
  allRecords,
  onClose,
  onPrintStudentReport,
}) => {
  if (!student) return null;

  // Extract attendance history for this student
  const studentHistory = useMemo(() => {
    const list: Array<{
      date: string;
      status: 'hadir' | 'sakit' | 'izin' | 'alpa';
      isLate?: boolean;
      lateMinutes?: number;
      arrivalTime?: string;
      notes?: string;
    }> = [];

    // Sort dates chronologically descending (newest first)
    const sortedRecordKeys = Object.keys(allRecords).sort().reverse();

    sortedRecordKeys.forEach((key) => {
      const rec = allRecords[key];
      if (rec.classRoom !== student.classRoom) return;

      const entry = rec.entries[student.id];
      if (entry && entry.status && entry.status !== 'unmarked') {
        list.push({
          date: rec.date,
          status: entry.status,
          isLate: !!entry.isLate,
          lateMinutes: entry.lateMinutes,
          arrivalTime: entry.arrivalTime,
          notes: entry.notes,
        });
      }
    });

    return list;
  }, [student, allRecords]);

  // Aggregate student stats (Terlambat dihitung terpisah dari rasio kehadiran)
  const stats = useMemo(() => {
    let hadir = 0;
    let terlambat = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    studentHistory.forEach((h) => {
      if (h.status === 'hadir') hadir++;
      else if (h.status === 'sakit') sakit++;
      else if (h.status === 'izin') izin++;
      else if (h.status === 'alpa') alpa++;

      if (h.isLate) terlambat++;
    });

    const totalDays = hadir + sakit + izin + alpa;
    const rate = totalDays > 0 ? ((hadir / totalDays) * 100).toFixed(1) : '100';

    return {
      hadir,
      terlambat,
      sakit,
      izin,
      alpa,
      totalDays,
      rate,
    };
  }, [studentHistory]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm shadow-xs">
              {student.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{student.name}</h3>
              <p className="text-xs text-slate-500">
                NIS: {student.nis} · NISN: {student.nisn || '-'} · Kelas: {student.classRoom} ({student.gender === 'L' ? 'Laki-laki' : 'Perempuan'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPrintStudentReport(student)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5 text-blue-600" />
              Cetak Rekap
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key KPI Stats */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-center">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase block">Hadir</span>
              <span className="text-xl font-bold text-emerald-900 font-mono-numbers">{stats.hadir}</span>
              <span className="text-[10px] text-emerald-700 block">Hari</span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-center">
              <span className="text-[11px] font-semibold text-amber-800 uppercase block">Terlambat (T)</span>
              <span className="text-xl font-bold text-amber-900 font-mono-numbers">{stats.terlambat}</span>
              <span className="text-[10px] text-amber-700 block">Kali</span>
            </div>

            <div className="rounded-xl border border-yellow-100 bg-yellow-50/60 p-3 text-center">
              <span className="text-[11px] font-semibold text-yellow-800 uppercase block">Sakit</span>
              <span className="text-xl font-bold text-yellow-900 font-mono-numbers">{stats.sakit}</span>
              <span className="text-[10px] text-yellow-700 block">Hari</span>
            </div>

            <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-center">
              <span className="text-[11px] font-semibold text-sky-800 uppercase block">Izin</span>
              <span className="text-xl font-bold text-sky-900 font-mono-numbers">{stats.izin}</span>
              <span className="text-[10px] text-sky-700 block">Hari</span>
            </div>

            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-center">
              <span className="text-[11px] font-semibold text-rose-800 uppercase block">Alpa</span>
              <span className="text-xl font-bold text-rose-900 font-mono-numbers">{stats.alpa}</span>
              <span className="text-[10px] text-rose-700 block">Hari</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <span className="text-[11px] font-semibold text-slate-700 uppercase block">% Hadir</span>
              <span className="text-xl font-bold text-slate-900 font-mono-numbers">{stats.rate}%</span>
              <span className="text-[10px] text-slate-500 block">Rasio</span>
            </div>
          </div>

          {/* Contact & Parent Info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Orang Tua / Wali:</span>
              <span className="font-semibold text-slate-800">{student.parentName || 'Belum diisi'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">No. Telepon / WhatsApp:</span>
              <span className="font-semibold text-slate-800 font-mono-numbers">{student.parentPhone || 'Belum diisi'}</span>
            </div>
            {student.address && (
              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[11px]">Alamat Domisili:</span>
                <span className="text-slate-700">{student.address}</span>
              </div>
            )}
            {student.notes && (
              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[11px]">Catatan Khusus:</span>
                <span className="text-slate-700 italic">{student.notes}</span>
              </div>
            )}
          </div>

          {/* Chronological Attendance History Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Riwayat Presensi Siswa ({studentHistory.length} Hari Terekam)
            </h4>

            {studentHistory.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Belum ada catatan presensi untuk siswa ini.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Tanggal</th>
                      <th className="px-3 py-2 text-center w-28">Status</th>
                      <th className="px-3 py-2">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentHistory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-800 font-medium">
                          {formatIndonesianDateWithDay(item.date)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.status === 'hadir' && item.isLate ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <span>HADIR (T)</span>
                            </span>
                          ) : (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                item.status === 'hadir'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.status === 'sakit'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : item.status === 'izin'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.status.toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {item.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
