import React, { useState } from 'react';
import { Student, SchoolConfig, KopConfig } from '../types/attendance';
import { formatIndonesianDate } from '../utils/date';
import { KopSuratView } from './KopSuratView';
import { KopConfigDrawer } from './KopConfigDrawer';
import { DEFAULT_KOP_CONFIG } from '../utils/storage';
import { Printer, X, Mail, Sliders } from 'lucide-react';

interface OfficialLetterModalProps {
  student: Student | null;
  schoolConfig: SchoolConfig;
  alpaCount: number;
  lateCount?: number;
  reason: string;
  onSaveKopConfig?: (updatedKop: KopConfig) => void;
  onClose: () => void;
}

export const OfficialLetterModal: React.FC<OfficialLetterModalProps> = ({
  student,
  schoolConfig,
  alpaCount,
  lateCount,
  reason,
  onSaveKopConfig,
  onClose,
}) => {
  if (!student) return null;

  const [activeKop, setActiveKop] = useState<KopConfig>(
    schoolConfig.kopConfig || DEFAULT_KOP_CONFIG
  );
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState<boolean>(false);

  const today = new Date();
  const currentMonthRomawi = [
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'
  ][today.getMonth()];
  const currentYear = today.getFullYear();

  // Editable letter parameters
  const [letterNo, setLetterNo] = useState<string>(
    `421.3/0${Math.floor(Math.random() * 80 + 10)}/${schoolConfig.schoolLevel}/${currentMonthRomawi}/${currentYear}`
  );
  const [letterDate, setLetterDate] = useState<string>(
    activeKop.signDate || formatIndonesianDate(today.toISOString().slice(0, 10))
  );
  const [invitationDayDate, setInvitationDayDate] = useState<string>('Senin, 16 Oktober 2024');
  const [invitationTime, setInvitationTime] = useState<string>('09.00 - 11.00 WIB');
  const [invitationRoom, setInvitationRoom] = useState<string>('Ruang Bimbingan Konseling (BK) / Ruang Wali Kelas');

  const handlePrint = () => {
    window.print();
  };

  const handleSaveDefault = (updated: KopConfig) => {
    setActiveKop(updated);
    if (onSaveKopConfig) {
      onSaveKopConfig(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 flex justify-center">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-6 sm:p-10 my-auto text-slate-900 border border-slate-300 print-container">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-5 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-rose-600" />
            <span className="text-sm font-bold text-slate-900">
              Surat Panggilan Orang Tua / Wali Murid
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
              Atur Kop Surat
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-md transition-colors"
            >
              <Printer className="h-4 w-4" />
              Cetak Surat Sekarang
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

        {/* --- DYNAMIC KOP SURAT DINAS --- */}
        <KopSuratView schoolConfig={schoolConfig} customKop={activeKop} />

        {/* Letter Metadata */}
        <div className="flex justify-between items-start text-xs mb-6">
          <div className="space-y-1">
            <div>Nomor: <strong>{letterNo}</strong></div>
            <div>Lampiran: <strong>-</strong></div>
            <div>
              Perihal:{' '}
              <strong>
                {lateCount && lateCount > 0 && alpaCount === 0
                  ? 'Panggilan Orang Tua / Wali Murid Terkait Keterlambatan Siswa'
                  : 'Panggilan Orang Tua / Wali Murid Terkait Kedisiplinan & Kehadiran Siswa'}
              </strong>
            </div>
          </div>
          <div className="text-right">
            <div>{activeKop.signCity || schoolConfig.city}, {letterDate}</div>
          </div>
        </div>

        {/* Recipient */}
        <div className="text-xs mb-6 space-y-1">
          <div>Kepada Yth.</div>
          <div className="font-bold text-sm">
            Bapak / Ibu Orang Tua / Wali dari: {student.name}
          </div>
          <div>Di Tempat</div>
        </div>

        {/* Body Paragraphs */}
        <div className="text-xs sm:text-sm text-slate-800 space-y-3 leading-relaxed">
          <p>Dengan hormat,</p>
          <p className="text-justify">
            Sehubungan dengan pemantauan kedisiplinan dan rekapitulasi kehadiran peserta didik Tahun Pelajaran {schoolConfig.academicYear}, dengan ini kami mengundang Bapak/Ibu Orang Tua/Wali dari peserta didik:
          </p>

          <div className="bg-slate-50 border border-slate-300 rounded-lg p-3.5 text-xs space-y-1.5 my-3">
            <div className="grid grid-cols-3">
              <span className="text-slate-500">Nama Siswa:</span>
              <span className="col-span-2 font-bold text-slate-900">{student.name}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-500">Nomor Induk Siswa (NIS/NISN):</span>
              <span className="col-span-2 font-mono">{student.nis} / {student.nisn || '-'}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-500">Kelas / Jenjang:</span>
              <span className="col-span-2 font-semibold">{student.classRoom} ({schoolConfig.schoolLevel})</span>
            </div>
            {alpaCount > 0 && (
              <div className="grid grid-cols-3">
                <span className="text-slate-500">Catatan Alpa:</span>
                <span className="col-span-2 font-bold text-rose-700">
                  {alpaCount} Hari Tanpa Keterangan (Alpa)
                </span>
              </div>
            )}
            {lateCount !== undefined && lateCount > 0 && (
              <div className="grid grid-cols-3">
                <span className="text-slate-500">Frekuensi Terlambat:</span>
                <span className="col-span-2 font-bold text-amber-700">
                  {lateCount} Kali Masuk Terlambat dalam Semester Ini
                </span>
              </div>
            )}
            {reason && (
              <div className="grid grid-cols-3">
                <span className="text-slate-500">Keterangan Khusus:</span>
                <span className="col-span-2 font-medium text-slate-800">{reason}</span>
              </div>
            )}
          </div>

          <p className="text-justify">
            Untuk hadir di sekolah guna membicarakan perkembangan proses belajar dan penyelesaian kendala kehadiran ananda, yang direncanakan pada:
          </p>

          <div className="pl-6 space-y-1 text-xs">
            <div className="grid grid-cols-3">
              <span className="text-slate-600">Hari / Tanggal:</span>
              <span className="col-span-2 font-semibold">{invitationDayDate}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-600">Waktu:</span>
              <span className="col-span-2 font-semibold">{invitationTime}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-600">Tempat:</span>
              <span className="col-span-2 font-semibold">{invitationRoom}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-600">Menghadap:</span>
              <span className="col-span-2 font-semibold">Wali Kelas & Guru Bimbingan Konseling (BK)</span>
            </div>
          </div>

          <p className="text-justify pt-2">
            Mengingat pentingnya koordinasi ini demi kelancaran dan kelanjutan pendidikan ananda, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktu yang telah ditentukan.
          </p>

          <p>
            Demikian surat undangan pemanggilan ini kami sampaikan. Atas perhatian dan kerja sama yang baik dari Bapak/Ibu, kami ucapkan terima kasih.
          </p>
        </div>

        {/* --- SIGNATURE BLOCK (3 SIGNATURES) --- */}
        <div className="mt-8 pt-4 border-t border-slate-300 text-xs text-slate-800">
          <div className="grid grid-cols-2 gap-8 text-center mb-8">
            <div>
              <p className="font-semibold">Guru Bimbingan Konseling (BK),</p>
              <div className="h-16" />
              <p className="font-bold underline uppercase">{schoolConfig.counselorTeacher}</p>
              <p className="text-[11px] text-slate-600">NIP. {schoolConfig.counselorTeacherNip}</p>
            </div>

            <div>
              <p className="font-semibold">Wali Kelas {schoolConfig.currentClass},</p>
              <div className="h-16" />
              <p className="font-bold underline uppercase">{schoolConfig.homeroomTeacher}</p>
              <p className="text-[11px] text-slate-600">NIP. {schoolConfig.homeroomTeacherNip}</p>
            </div>
          </div>

          <div className="text-center max-w-xs mx-auto">
            <p className="font-semibold">Mengetahui,</p>
            <p className="font-bold">Kepala {schoolConfig.schoolName}</p>
            <div className="h-16" />
            <p className="font-bold underline uppercase">{schoolConfig.headmaster}</p>
            <p className="text-[11px] text-slate-600">NIP. {schoolConfig.headmasterNip}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
