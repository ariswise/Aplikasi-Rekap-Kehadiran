import React, { useState, useMemo, useRef } from 'react';
import { Student, SchoolConfig, Gender } from '../types/attendance';
import { ExcelService } from '../utils/excel';
import {
  Users,
  UserPlus,
  Search,
  Upload,
  Download,
  FileSpreadsheet,
  Trash2,
  Edit2,
  X,
  Check,
  AlertCircle,
  HelpCircle,
  Phone,
  MapPin,
  FileText,
} from 'lucide-react';

interface StudentManagementProps {
  students: Student[];
  schoolConfig: SchoolConfig;
  onSaveStudents: (students: Student[]) => void;
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  onOpenStudentDetail: (student: Student) => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  schoolConfig,
  onSaveStudents,
  onShowToast,
  onOpenStudentDetail,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form states
  const [formName, setFormName] = useState<string>('');
  const [formNis, setFormNis] = useState<string>('');
  const [formNisn, setFormNisn] = useState<string>('');
  const [formGender, setFormGender] = useState<Gender>('L');
  const [formClass, setFormClass] = useState<string>(schoolConfig.currentClass);
  const [formParentName, setFormParentName] = useState<string>('');
  const [formParentPhone, setFormParentPhone] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Filtered students for current active class
  const classStudents = useMemo(() => {
    return students.filter((s) => s.classRoom === schoolConfig.currentClass);
  }, [students, schoolConfig.currentClass]);

  const filteredStudents = useMemo(() => {
    return classStudents.filter((s) => {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q)
      );
    });
  }, [classStudents, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormName('');
    setFormNis(`24${String(classStudents.length + 1).padStart(2, '0')}`);
    setFormNisn('');
    setFormGender('L');
    setFormClass(schoolConfig.currentClass);
    setFormParentName('');
    setFormParentPhone('');
    setFormAddress('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormName(student.name);
    setFormNis(student.nis);
    setFormNisn(student.nisn);
    setFormGender(student.gender);
    setFormClass(student.classRoom);
    setFormParentName(student.parentName || '');
    setFormParentPhone(student.parentPhone || '');
    setFormAddress(student.address || '');
    setFormNotes(student.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      onShowToast('error', 'Validasi Gagal', 'Nama siswa wajib diisi!');
      return;
    }

    if (editingStudent) {
      // Update existing student
      const updated = students.map((s) =>
        s.id === editingStudent.id
          ? {
              ...s,
              name: formName.trim(),
              nis: formNis.trim(),
              nisn: formNisn.trim(),
              gender: formGender,
              classRoom: formClass,
              parentName: formParentName.trim(),
              parentPhone: formParentPhone.trim(),
              address: formAddress.trim(),
              notes: formNotes.trim(),
            }
          : s
      );
      onSaveStudents(updated);
      onShowToast('success', 'Berhasil', `Data siswa ${formName} berhasil diperbarui.`);
    } else {
      // Add new student
      const newStudent: Student = {
        id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: formName.trim(),
        nis: formNis.trim() || `24${String(classStudents.length + 1).padStart(2, '0')}`,
        nisn: formNisn.trim() || `007${String(Date.now()).slice(-7)}`,
        gender: formGender,
        classRoom: formClass,
        parentName: formParentName.trim(),
        parentPhone: formParentPhone.trim(),
        address: formAddress.trim(),
        notes: formNotes.trim(),
        createdAt: new Date().toISOString(),
      };
      onSaveStudents([...students, newStudent]);
      onShowToast('success', 'Berhasil', `Siswa ${formName} berhasil ditambahkan ke ${formClass}.`);
    }

    setIsModalOpen(false);
  };

  const handleDeleteStudent = (student: Student) => {
    if (window.confirm(`Yakin ingin menghapus data siswa "${student.name}"? Data kehadiran terkait akan terpengaruh.`)) {
      const updated = students.filter((s) => s.id !== student.id);
      onSaveStudents(updated);
      onShowToast('info', 'Dihapus', `Data siswa ${student.name} telah dihapus.`);
    }
  };

  // Handle file upload for Excel/CSV import
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportErrors([]);

    const result = await ExcelService.parseStudentFile(file, schoolConfig.currentClass);

    setIsImporting(false);

    if (result.success && result.students.length > 0) {
      // Append or replace
      const merged = [...students, ...result.students];
      onSaveStudents(merged);
      onShowToast(
        'success',
        'Impor Berhasil',
        `${result.students.length} siswa berhasil diimpor ke dalam basis data!`
      );
      setIsImportModalOpen(false);
    } else {
      setImportErrors(result.errors.length > 0 ? result.errors : ['Gagal memproses berkas.']);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Daftar Peserta Didik
            </h2>
            <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
              {classStudents.length} Siswa Terdaftar
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar siswa Kelas {schoolConfig.currentClass} otomatis digunakan pada seluruh menu absensi harian dan rekap
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Upload className="h-3.5 w-3.5 text-emerald-600" />
            Impor Excel / CSV
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-2xs"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Tambah Siswa Baru
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari siswa berdasarkan nama, NIS, atau NISN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="text-xs text-slate-500">
          Kelas: <span className="font-semibold text-slate-800">{schoolConfig.currentClass}</span>
        </div>
      </div>

      {/* Students Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              <tr>
                <th scope="col" className="w-12 px-3 py-3 text-center">No</th>
                <th scope="col" className="w-24 px-3 py-3">NIS</th>
                <th scope="col" className="w-28 px-3 py-3">NISN</th>
                <th scope="col" className="px-3 py-3">Nama Lengkap</th>
                <th scope="col" className="w-14 px-2 py-3 text-center">L/P</th>
                <th scope="col" className="w-40 px-3 py-3">Orang Tua / HP</th>
                <th scope="col" className="px-3 py-3">Catatan</th>
                <th scope="col" className="w-24 px-3 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium">Belum ada peserta didik di kelas ini.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Gunakan tombol "Tambah Siswa Baru" atau "Impor Excel / CSV" untuk memasukkan data siswa.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3 py-3 text-center font-mono-numbers text-slate-400 text-xs">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-3 font-mono-numbers text-slate-700">
                      {student.nis}
                    </td>
                    <td className="px-3 py-3 font-mono-numbers text-slate-500">
                      {student.nisn || '-'}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => onOpenStudentDetail(student)}
                        className="font-semibold text-slate-900 hover:text-blue-600 hover:underline text-left"
                      >
                        {student.name}
                      </button>
                    </td>
                    <td className="px-2 py-3 text-center font-semibold">
                      <span className={student.gender === 'L' ? 'text-blue-600' : 'text-pink-600'}>
                        {student.gender}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">
                      {student.parentPhone ? (
                        <div>
                          <div className="font-medium text-slate-800">{student.parentName || 'Orang Tua'}</div>
                          <div className="text-[11px] text-slate-500 font-mono-numbers">{student.parentPhone}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500 truncate max-w-xs">
                      {student.notes || '-'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(student)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit Data Siswa"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(student)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingStudent ? 'Edit Data Peserta Didik' : 'Tambah Peserta Didik Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Ahmad Faiz Pratama"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    NIS (Nomor Induk)
                  </label>
                  <input
                    type="text"
                    value={formNis}
                    onChange={(e) => setFormNis(e.target.value)}
                    placeholder="2401"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    NISN
                  </label>
                  <input
                    type="text"
                    value={formNisn}
                    onChange={(e) => setFormNisn(e.target.value)}
                    placeholder="0071234567"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as Gender)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Kelas / Rombel
                  </label>
                  <select
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    {schoolConfig.availableClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nama Orang Tua / Wali
                  </label>
                  <input
                    type="text"
                    value={formParentName}
                    onChange={(e) => setFormParentName(e.target.value)}
                    placeholder="Nama Orang Tua"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    No. HP Ortu / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formParentPhone}
                    onChange={(e) => setFormParentPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Catatan Tambahan
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contoh: Ketua Kelas / Riwayat asma"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-2xs"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                Impor Daftar Siswa dari Excel atau CSV
              </h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Unggah berkas spreadsheet (.xlsx atau .csv) untuk memasukkan daftar siswa secara massal ke dalam sistem absensi.
              </p>

              {/* Template download buttons */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-blue-900">Unduh Format Contoh</h4>
                  <p className="text-[11px] text-blue-700">Gunakan format ini agar kolom terpetakan otomatis</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => ExcelService.downloadStudentTemplate('xlsx')}
                    className="rounded-lg bg-white border border-blue-200 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors shadow-2xs"
                  >
                    Format Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => ExcelService.downloadStudentTemplate('csv')}
                    className="rounded-lg bg-white border border-blue-200 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors shadow-2xs"
                  >
                    Format CSV (.csv)
                  </button>
                </div>
              </div>

              {/* Upload Input */}
              <div className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  Pilih berkas Excel (.xlsx) atau CSV
                </p>
                <p className="text-[11px] text-slate-400 mt-1 mb-3">
                  Data akan ditambahkan ke Kelas {schoolConfig.currentClass}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="excel-file-input"
                />
                <label
                  htmlFor="excel-file-input"
                  className="inline-block cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  {isImporting ? 'Memproses Berkas...' : 'Pilih Berkas Komputer'}
                </label>
              </div>

              {/* Error messages if any */}
              {importErrors.length > 0 && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <div className="font-bold flex items-center gap-1 mb-1">
                    <AlertCircle className="h-4 w-4 text-rose-600" /> Kesalahan saat impor:
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {importErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
