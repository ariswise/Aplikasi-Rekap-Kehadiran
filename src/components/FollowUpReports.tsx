import React, { useState, useMemo } from 'react';
import {
  Student,
  DailyAttendanceRecord,
  SchoolConfig,
  FollowUpCase,
  FollowUpStatus,
} from '../types/attendance';
import { sortStudentsAlphabetically } from '../utils/storage';
import {
  AlertTriangle,
  FileText,
  Mail,
  CheckCircle2,
  Clock,
  UserX,
  Phone,
  Search,
  Printer,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface FollowUpReportsProps {
  students: Student[];
  schoolConfig: SchoolConfig;
  allRecords: Record<string, DailyAttendanceRecord>;
  followUpCases: FollowUpCase[];
  onSaveFollowUpCases: (cases: FollowUpCase[]) => void;
  onOpenStudentDetail: (student: Student) => void;
  onGenerateOfficialLetter: (student: Student, alpaCount: number, reason: string, lateCount?: number) => void;
}

export const FollowUpReports: React.FC<FollowUpReportsProps> = ({
  students,
  schoolConfig,
  allRecords,
  followUpCases,
  onSaveFollowUpCases,
  onOpenStudentDetail,
  onGenerateOfficialLetter,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterType, setFilterType] = useState<'all' | 'keterlambatan' | 'alpa'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Automatically compute attendance & lateness breakdown per student in this semester (sorted A-Z)
  const studentMetrics = useMemo(() => {
    const sorted = sortStudentsAlphabetically(students);
    return sorted.map((s) => {
      let h = 0, sakit = 0, izin = 0, alpa = 0, lateCount = 0;

      Object.values(allRecords).forEach((rec) => {
        if (rec.classRoom !== schoolConfig.currentClass) return;
        const entry = rec.entries[s.id];
        if (entry?.status === 'hadir') h++;
        else if (entry?.status === 'sakit') sakit++;
        else if (entry?.status === 'izin') izin++;
        else if (entry?.status === 'alpa') alpa++;

        if (entry?.isLate) lateCount++;
      });

      const totalAbsences = sakit + izin + alpa;

      // Aturan Peringatan Dini Keterlambatan:
      // > 3 kali dalam 1 semester (4x): masuk ke Peringatan & Konseling Wali Kelas (sedang)
      // > 4 kali dalam 1 semester (>= 5x): masuk ke Panggilan Ortu & Rujukan BK (tinggi)
      // Aturan Ketidakhadiran Alpa:
      // alpa >= 3: Peringatan (sedang)
      // alpa >= 5: Panggilan Ortu (tinggi)
      // alpa >= 7: Kritis (kritis)
      let severity: 'rendah' | 'sedang' | 'tinggi' | 'kritis' = 'rendah';
      const isLateCall = lateCount > 4;
      const isLateWarning = lateCount > 3;
      const isAlpaCall = alpa >= 5;
      const isAlpaWarning = alpa >= 3;
      const isAlpaCritical = alpa >= 7;

      if (isAlpaCritical) {
        severity = 'kritis';
      } else if (isAlpaCall || isLateCall) {
        severity = 'tinggi';
      } else if (isAlpaWarning || isLateWarning || sakit >= 5) {
        severity = 'sedang';
      }

      let triggerReason = '';
      if (isAlpaCritical) {
        triggerReason = `Alpa Kritis (${alpa} Hari)`;
      } else if (isAlpaCall && isLateCall) {
        triggerReason = `Alpa (${alpa} Hari) & Keterlambatan (${lateCount}x) Tinggi`;
      } else if (isLateCall) {
        triggerReason = `Keterlambatan > 4 Kali (${lateCount}x Semester Ini) → Panggilan Orang Tua`;
      } else if (isAlpaCall) {
        triggerReason = `Alpa ≥ 5 Hari (${alpa} Hari) → Panggilan Orang Tua`;
      } else if (isLateWarning && isAlpaWarning) {
        triggerReason = `Keterlambatan (${lateCount}x) & Alpa (${alpa} Hari) → Peringatan`;
      } else if (isLateWarning) {
        triggerReason = `Keterlambatan > 3 Kali (${lateCount}x Semester Ini) → Peringatan Wali Kelas`;
      } else if (isAlpaWarning) {
        triggerReason = `Alpa ≥ 3 Hari (${alpa} Hari) → Peringatan`;
      } else if (sakit >= 5) {
        triggerReason = `Sakit Berulang (${sakit} Hari)`;
      }

      const isAtRisk = lateCount > 3 || alpa >= 3 || sakit >= 5;

      return {
        student: s,
        h,
        sakit,
        izin,
        alpa,
        lateCount,
        totalAbsences,
        severity,
        triggerReason,
        isAtRisk,
        isLateCall,
        isLateWarning,
        isAlpaCall,
        isAlpaWarning,
      };
    });
  }, [students, allRecords, schoolConfig.currentClass]);

  // Merge computed alerts with stored case notes/statuses
  const activeAlerts = useMemo(() => {
    return studentMetrics
      .filter((m) => m.isAtRisk)
      .map((m) => {
        const existingCase = followUpCases.find((c) => c.studentId === m.student.id);

        const followUpCase: FollowUpCase = existingCase || {
          id: `case-${m.student.id}`,
          studentId: m.student.id,
          studentName: m.student.name,
          classRoom: schoolConfig.currentClass,
          alpaCount: m.alpa,
          sakitCount: m.sakit,
          izinCount: m.izin,
          lateCount: m.lateCount,
          totalAbsences: m.totalAbsences,
          severityLevel: m.severity,
          status: 'belum',
          actionNotes: '',
          lastUpdated: new Date().toISOString(),
        };

        return {
          ...m,
          caseData: followUpCase,
        };
      });
  }, [studentMetrics, followUpCases, schoolConfig.currentClass]);

  // Update a case
  const handleUpdateCase = (studentId: string, updates: Partial<FollowUpCase>) => {
    const existingIndex = followUpCases.findIndex((c) => c.studentId === studentId);
    let updatedCases: FollowUpCase[];

    if (existingIndex >= 0) {
      updatedCases = [...followUpCases];
      updatedCases[existingIndex] = {
        ...updatedCases[existingIndex],
        ...updates,
        lastUpdated: new Date().toISOString(),
      };
    } else {
      const targetStudent = students.find((s) => s.id === studentId);
      const metrics = studentMetrics.find((m) => m.student.id === studentId);

      const newCase: FollowUpCase = {
        id: `case-${studentId}`,
        studentId,
        studentName: targetStudent?.name || '',
        classRoom: schoolConfig.currentClass,
        alpaCount: metrics?.alpa || 0,
        sakitCount: metrics?.sakit || 0,
        izinCount: metrics?.izin || 0,
        lateCount: metrics?.lateCount || 0,
        totalAbsences: metrics?.totalAbsences || 0,
        severityLevel: metrics?.severity || 'sedang',
        status: 'belum',
        actionNotes: '',
        lastUpdated: new Date().toISOString(),
        ...updates,
      };
      updatedCases = [...followUpCases, newCase];
    }

    onSaveFollowUpCases(updatedCases);
  };

  // Filtered alerts (strictly sorted A-Z by student name)
  const filteredAlerts = useMemo(() => {
    const list = activeAlerts.filter((item) => {
      const matchesSearch =
        item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.student.nis.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterStatus === 'pending' && item.caseData.status === 'selesai') return false;
      if (filterStatus === 'completed' && item.caseData.status !== 'selesai') return false;

      if (filterType === 'keterlambatan' && item.lateCount <= 3) return false;
      if (filterType === 'alpa' && item.alpa < 3) return false;

      return true;
    });

    return [...list].sort((a, b) => {
      const nameA = (a.student?.name || '').trim().replace(/\s+/g, ' ');
      const nameB = (b.student?.name || '').trim().replace(/\s+/g, ' ');
      const cmp = nameA.localeCompare(nameB, 'id', {
        sensitivity: 'accent',
        caseFirst: 'upper',
        numeric: true,
      });
      if (cmp !== 0) return cmp;
      return (a.student?.nis || '').localeCompare(b.student?.nis || '', undefined, { numeric: true });
    });
  }, [activeAlerts, searchQuery, filterStatus, filterType]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Sistem Peringatan Dini & Tindak Lanjut
            </h2>
            <span className="rounded-md bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
              {activeAlerts.length} Kasus Terdeteksi
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen otomatis kasus keterlambatan & ketidakhadiran siswa, rujukan BK, dan penerbitan surat panggilan resmi
          </p>
        </div>
      </div>

      {/* Early Warning Explanatory Rule Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Aturan Terlambat > 3x */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            Terlambat &gt; 3x (Semester)
          </div>
          <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
            <strong>Masuk Peringatan:</strong> Konseling & pembinaan disiplin lisan / tertulis oleh Wali Kelas.
          </p>
        </div>

        {/* Aturan Terlambat > 4x */}
        <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-3.5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-orange-900">
            <Mail className="h-4 w-4 text-orange-600 shrink-0" />
            Terlambat &gt; 4x (Semester)
          </div>
          <p className="text-[11px] text-orange-800 mt-1 leading-relaxed">
            <strong>Panggilan Ortu:</strong> Penerbitan Surat Panggilan Orang Tua resmi & rujukan penanganan Guru BK.
          </p>
        </div>

        {/* Aturan Alpa 3 - 4x */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            Alpa 3 - 4 Hari
          </div>
          <p className="text-[11px] text-rose-800 mt-1 leading-relaxed">
            <strong>Peringatan Alpa:</strong> Pembinaan persuasif Wali Kelas dan pemantauan harian presensi.
          </p>
        </div>

        {/* Aturan Alpa >= 5x & Kritis */}
        <div className="rounded-xl border border-rose-300 bg-rose-100/50 p-3.5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-950">
            <UserX className="h-4 w-4 text-rose-700 shrink-0" />
            Alpa &ge; 5 Hari / Kritis (&ge; 7)
          </div>
          <p className="text-[11px] text-rose-900 mt-1 leading-relaxed">
            <strong>Panggilan Ortu & Home Visit:</strong> Surat panggilan orang tua, sidang kasus BK, & kunjungan rumah.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama siswa atau NIS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tipe Kasus Filter */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                filterType === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua Kasus ({activeAlerts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('keterlambatan')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                filterType === 'keterlambatan'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              Keterlambatan &gt; 3x ({activeAlerts.filter((a) => a.lateCount > 3).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('alpa')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                filterType === 'alpa'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-800 hover:bg-rose-50'
              }`}
            >
              Alpa &ge; 3 Hari ({activeAlerts.filter((a) => a.alpa >= 3).length})
            </button>
          </div>

          {/* Status Penanganan */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                filterStatus === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua Status
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                filterStatus === 'pending'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              Perlu Tindakan ({activeAlerts.filter((a) => a.caseData.status !== 'selesai').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('completed')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                filterStatus === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Selesai ({activeAlerts.filter((a) => a.caseData.status === 'selesai').length})
            </button>
          </div>
        </div>
      </div>
      {/* Case Cards List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-2xs">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">
              Tidak Ada Siswa Masuk Kategori Peringatan
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Seluruh siswa di kelas ini memiliki tingkat kehadiran dan kedisiplinan yang baik, tidak ada yang melebihi batas toleransi keterlambatan atau ketidakhadiran.
            </p>
          </div>
        ) : (
          filteredAlerts.map(({ student, alpa, sakit, izin, lateCount, severity, triggerReason, caseData }) => {
            const isCompleted = caseData.status === 'selesai';

            return (
              <div
                key={student.id}
                className={`rounded-xl border p-4 sm:p-5 transition-all shadow-2xs ${
                  isCompleted
                    ? 'border-slate-200 bg-white/70 opacity-80'
                    : severity === 'kritis'
                    ? 'border-rose-300 bg-rose-50/40'
                    : severity === 'tinggi'
                    ? 'border-orange-300 bg-orange-50/30'
                    : 'border-amber-200 bg-amber-50/20'
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {/* Left: Student info and Absence counts */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenStudentDetail(student)}
                        className="text-base font-bold text-slate-900 hover:text-blue-600 hover:underline"
                      >
                        {student.name}
                      </button>
                      <span className="text-xs text-slate-500">· NIS: {student.nis}</span>

                      {/* Severity Label */}
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                          severity === 'kritis'
                            ? 'bg-rose-100 text-rose-800'
                            : severity === 'tinggi'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        Tingkat: {severity}
                      </span>
                    </div>

                    {/* Trigger Reason Banner */}
                    {triggerReason && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500 font-medium">Pemicu Peringatan:</span>
                        <span className="font-bold text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded-md border border-rose-200">
                          {triggerReason}
                        </span>
                      </div>
                    )}

                    {/* Stats pills */}
                    <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs">
                      <span className={`font-bold px-2 py-0.5 rounded-md ${
                        lateCount > 4
                          ? 'text-orange-900 bg-orange-100 border border-orange-300'
                          : lateCount > 3
                          ? 'text-amber-900 bg-amber-100 border border-amber-300'
                          : 'text-amber-800 bg-amber-50'
                      }`}>
                        <Clock className="inline h-3 w-3 mr-1 text-amber-600" />
                        {lateCount}x Terlambat
                      </span>
                      <span className="font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-md">
                        {alpa} Hari Alpa
                      </span>
                      <span className="font-medium text-yellow-800 bg-yellow-100/70 px-2 py-0.5 rounded-md">
                        {sakit} Hari Sakit
                      </span>
                      <span className="font-medium text-sky-800 bg-sky-100/70 px-2 py-0.5 rounded-md">
                        {izin} Hari Izin
                      </span>
                      {student.parentPhone && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Phone className="h-3 w-3 text-slate-400" />
                          Ortu: {student.parentPhone} ({student.parentName || 'Wali'})
                        </span>
                      )}
                    </div>

                    {/* Action Notes Input */}
                    <div className="mt-3">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                        Catatan Tindak Lanjut / Hasil Konseling:
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Sudah ditelepon ortu, akan hadir besok / sudah konseling BK..."
                        value={caseData.actionNotes}
                        onChange={(e) =>
                          handleUpdateCase(student.id, {
                            actionNotes: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Right: Status selector and Official Letter Trigger */}
                  <div className="flex flex-col gap-2 shrink-0 sm:min-w-[220px]">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                        Status Penanganan:
                      </label>
                      <select
                        value={caseData.status}
                        onChange={(e) =>
                          handleUpdateCase(student.id, {
                            status: e.target.value as FollowUpStatus,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="belum">Belum Ditangani</option>
                        <option value="konseling_wali">Konseling Wali Kelas</option>
                        <option value="bimbingan_bk">Bimbingan Guru BK</option>
                        <option value="surat_terbit">Surat Panggilan Terbit</option>
                        <option value="home_visit">Kunjungan Rumah (Home Visit)</option>
                        <option value="selesai">Selesai (Kasus Tuntas)</option>
                      </select>
                    </div>

                    {/* Official Letter Generator Button */}
                    <button
                      type="button"
                      onClick={() => {
                        let reasonText = '';
                        if (lateCount > 4 && alpa >= 5) {
                          reasonText = `Telah mencapai ${alpa} hari Alpa dan ${lateCount} kali terlambat dalam 1 semester.`;
                        } else if (lateCount > 4) {
                          reasonText = `Telah terlambat masuk sekolah sebanyak ${lateCount} kali dalam semester ini (melebihi batas toleransi sekolah 4 kali).`;
                        } else {
                          reasonText = `Telah mencapai ${alpa} hari ketidakhadiran tanpa keterangan (Alpa) dalam semester ini.`;
                        }
                        onGenerateOfficialLetter(student, alpa, reasonText, lateCount);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors shadow-2xs"
                    >
                      <Mail className="h-3.5 w-3.5 text-rose-600" />
                      Cetak Surat Panggilan Ortu
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
