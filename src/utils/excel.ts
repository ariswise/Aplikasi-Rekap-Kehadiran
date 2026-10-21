import * as XLSX from 'xlsx';
import { Student, DailyAttendanceRecord, SchoolConfig, AttendanceStatus } from '../types/attendance';
import { sortStudentsAlphabetically } from './storage';
import { INDONESIAN_MONTHS } from './date';

export interface ImportResult {
  success: boolean;
  students: Student[];
  errors: string[];
}

export const ExcelService = {
  // Generate and trigger download of template file for importing students
  downloadStudentTemplate(format: 'xlsx' | 'csv' = 'xlsx'): void {
    const templateData = [
      {
        'NIS': '2401',
        'NISN': '0071234561',
        'Nama Lengkap': 'Ahmad Faiz Pratama',
        'Jenis Kelamin (L/P)': 'L',
        'Kelas': 'X-MIPA 1',
        'Nama Orang Tua / Wali': 'Bambang Pratama',
        'No HP Orang Tua': '081234567890',
        'Alamat': 'Jl. Melati No. 12',
        'Catatan': 'Ketua Kelas'
      },
      {
        'NIS': '2402',
        'NISN': '0071234562',
        'Nama Lengkap': 'Anisa Putri Maharani',
        'Jenis Kelamin (L/P)': 'P',
        'Kelas': 'X-MIPA 1',
        'Nama Orang Tua / Wali': 'Rudi Hartono',
        'No HP Orang Tua': '081298765432',
        'Alamat': 'Jl. Kenanga Indah No. 5',
        'Catatan': 'Wakil Ketua Kelas'
      },
      {
        'NIS': '2403',
        'NISN': '0071234563',
        'Nama Lengkap': 'Bagas Aditya Nugraha',
        'Jenis Kelamin (L/P)': 'L',
        'Kelas': 'X-MIPA 1',
        'Nama Orang Tua / Wali': 'Agus Nugraha',
        'No HP Orang Tua': '081345678912',
        'Alamat': 'Jl. Dahlia Raya No. 19',
        'Catatan': ''
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Siswa');

    if (format === 'csv') {
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Format_Impor_Daftar_Siswa.csv';
      link.click();
      URL.revokeObjectURL(url);
    } else {
      XLSX.writeFile(workbook, 'Format_Impor_Daftar_Siswa.xlsx');
    }
  },

  // Parse uploaded file (xlsx or csv)
  async parseStudentFile(file: File, defaultClassRoom: string): Promise<ImportResult> {
    const errors: string[] = [];
    const students: Student[] = [];

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

      if (!rawJson || rawJson.length === 0) {
        return { success: false, students: [], errors: ['Berkas kosong atau tidak ada data yang terbaca.'] };
      }

      rawJson.forEach((row, index) => {
        const rowNumber = index + 2; // considering 1 is header

        // Flexible column mapping
        const nameKey = Object.keys(row).find((k) =>
          /nama/i.test(k) || /siswa/i.test(k) || /student/i.test(k)
        );
        const nisKey = Object.keys(row).find((k) =>
          /^nis$/i.test(k) || /nomor induk/i.test(k)
        );
        const nisnKey = Object.keys(row).find((k) =>
          /nisn/i.test(k)
        );
        const genderKey = Object.keys(row).find((k) =>
          /jenis kelamin/i.test(k) || /gender/i.test(k) || /^jk$/i.test(k)
        );
        const classKey = Object.keys(row).find((k) =>
          /kelas/i.test(k) || /rombel/i.test(k) || /class/i.test(k)
        );
        const parentPhoneKey = Object.keys(row).find((k) =>
          /hp/i.test(k) || /telepon/i.test(k) || /wa/i.test(k) || /kontak/i.test(k)
        );
        const parentNameKey = Object.keys(row).find((k) =>
          /ortu/i.test(k) || /orang tua/i.test(k) || /wali/i.test(k)
        );
        const addressKey = Object.keys(row).find((k) =>
          /alamat/i.test(k) || /address/i.test(k)
        );
        const notesKey = Object.keys(row).find((k) =>
          /catatan/i.test(k) || /keterangan/i.test(k)
        );

        const name = String(row[nameKey || ''] || '').trim();
        if (!name) {
          errors.push(`Baris ${rowNumber}: Nama siswa tidak boleh kosong.`);
          return;
        }

        const rawGender = String(row[genderKey || ''] || '').trim().toUpperCase();
        const gender = rawGender.startsWith('P') || rawGender.includes('PEREMPUAN') ? 'P' : 'L';

        const nis = String(row[nisKey || ''] || '').trim();
        const nisn = String(row[nisnKey || ''] || '').trim();
        const classRoom = String(row[classKey || ''] || defaultClassRoom).trim() || defaultClassRoom;
        const parentPhone = String(row[parentPhoneKey || ''] || '').trim();
        const parentName = String(row[parentNameKey || ''] || '').trim();
        const address = String(row[addressKey || ''] || '').trim();
        const notes = String(row[notesKey || ''] || '').trim();

        students.push({
          id: `std-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
          nis: nis || `24${String(index + 1).padStart(2, '0')}`,
          nisn: nisn || `007${String(index + 1).padStart(7, '0')}`,
          name,
          gender,
          classRoom,
          parentPhone,
          parentName,
          address,
          notes,
          createdAt: new Date().toISOString(),
        });
      });

      return {
        success: students.length > 0,
        students: sortStudentsAlphabetically(students),
        errors,
      };
    } catch (err) {
      return {
        success: false,
        students: [],
        errors: ['Gagal membaca berkas: ' + (err instanceof Error ? err.message : 'Format tidak sesuai.')],
      };
    }
  },

  // Export Daily Attendance to Excel
  exportDailyAttendanceExcel(
    record: DailyAttendanceRecord,
    students: Student[],
    config: SchoolConfig
  ): void {
    const sorted = sortStudentsAlphabetically(students);
    const rows = sorted.map((s, index) => {
      const entry = record.entries[s.id];
      const statusText =
        !entry || entry.status === 'unmarked'
          ? 'Belum Diisi'
          : entry.status === 'hadir'
          ? 'Hadir'
          : entry.status === 'sakit'
          ? 'Sakit'
          : entry.status === 'izin'
          ? 'Izin'
          : 'Alpa';

      const terlambatText = entry?.isLate
        ? entry.lateMinutes
          ? `Ya (${entry.lateMinutes} menit)`
          : 'Ya (Terlambat)'
        : 'Tidak';

      return {
        'No': index + 1,
        'NIS': s.nis,
        'NISN': s.nisn,
        'Nama Siswa': s.name,
        'L/P': s.gender,
        'Status Kehadiran': statusText,
        'Terlambat': terlambatText,
        'Keterangan': entry?.notes || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Kehadiran_${record.date}`);
    XLSX.writeFile(workbook, `Absensi_${config.currentClass}_${record.date}.xlsx`);
  },

  // Export Monthly Attendance Recap Matrix to Excel
  exportMonthlyRecapExcel(
    students: Student[],
    allRecords: Record<string, DailyAttendanceRecord>,
    classRoom: string,
    year: number,
    month: number,
    config: SchoolConfig
  ): void {
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthName = INDONESIAN_MONTHS[month - 1];
    const sorted = sortStudentsAlphabetically(students);

    const dataRows = sorted.map((s, idx) => {
      const row: Record<string, unknown> = {
        'No': idx + 1,
        'NIS': s.nis,
        'Nama Siswa': s.name,
        'L/P': s.gender,
      };

      let h = 0;
      let tCount = 0;
      let sCount = 0;
      let iCount = 0;
      let aCount = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const rec = allRecords[`${classRoom}_${dateStr}`];
        const entry = rec?.entries[s.id];
        const status = entry?.status;
        const isLate = !!entry?.isLate;

        if (isLate) tCount++;

        if (status === 'hadir') {
          row[`Tgl ${day}`] = isLate ? 'H (T)' : 'H';
          h++;
        } else if (status === 'sakit') {
          row[`Tgl ${day}`] = 'S';
          sCount++;
        } else if (status === 'izin') {
          row[`Tgl ${day}`] = 'I';
          iCount++;
        } else if (status === 'alpa') {
          row[`Tgl ${day}`] = 'A';
          aCount++;
        } else {
          row[`Tgl ${day}`] = '-';
        }
      }

      const totalRecorded = h + sCount + iCount + aCount;
      const pct = totalRecorded > 0 ? ((h / totalRecorded) * 100).toFixed(1) + '%' : '0%';

      row['Hadir (H)'] = h;
      row['Terlambat (T)'] = tCount;
      row['Sakit (S)'] = sCount;
      row['Izin (I)'] = iCount;
      row['Alpa (A)'] = aCount;
      row['% Kehadiran'] = pct;

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap_${monthName}`);
    XLSX.writeFile(workbook, `Rekap_Bulanan_${classRoom}_${monthName}_${year}.xlsx`);
  },

  // Export Semester Attendance Recap to Excel
  exportSemesterRecapExcel(
    students: Student[],
    allRecords: Record<string, DailyAttendanceRecord>,
    classRoom: string,
    semester: '1' | '2',
    academicYear: string,
    config: SchoolConfig
  ): void {
    const isGanjil = semester === '1';
    const months = isGanjil ? [7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6];
    const yearParts = academicYear.split('/');
    const yearNumber = isGanjil ? parseInt(yearParts[0], 10) || 2024 : parseInt(yearParts[1], 10) || 2025;
    const sorted = sortStudentsAlphabetically(students);

    const dataRows = sorted.map((s, idx) => {
      let totalH = 0;
      let totalT = 0;
      let totalS = 0;
      let totalI = 0;
      let totalA = 0;

      const row: Record<string, unknown> = {
        'No': idx + 1,
        'NIS': s.nis,
        'NISN': s.nisn,
        'Nama Siswa': s.name,
        'L/P': s.gender,
      };

      months.forEach((m) => {
        const mName = INDONESIAN_MONTHS[m - 1];
        const daysInM = new Date(yearNumber, m, 0).getDate();
        let mH = 0, mS = 0, mI = 0, mA = 0;

        for (let d = 1; d <= daysInM; d++) {
          const dateStr = `${yearNumber}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const rec = allRecords[`${classRoom}_${dateStr}`];
          const entry = rec?.entries[s.id];
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

        row[`${mName} (H)`] = mH;
        row[`${mName} (S/I/A)`] = `${mS}/${mI}/${mA}`;
      });

      const totalMeetings = totalH + totalS + totalI + totalA;
      const rate = totalMeetings > 0 ? ((totalH / totalMeetings) * 100).toFixed(1) : '0';
      const rateNum = parseFloat(rate);

      let predikat = 'Sangat Baik';
      if (rateNum < 75) predikat = 'Kurang';
      else if (rateNum < 85) predikat = 'Cukup';
      else if (rateNum < 95) predikat = 'Baik';

      row['Total Hadir'] = totalH;
      row['Total Terlambat'] = totalT;
      row['Total Sakit'] = totalS;
      row['Total Izin'] = totalI;
      row['Total Alpa'] = totalA;
      row['% Kehadiran'] = `${rate}%`;
      row['Predikat Kehadiran'] = predikat;

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Semester_${semester}`);
    XLSX.writeFile(workbook, `Rekap_Semester_${semester}_${classRoom}_${academicYear.replace('/', '-')}.xlsx`);
  }
};
