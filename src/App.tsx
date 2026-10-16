import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Student,
  DailyAttendanceRecord,
  SchoolConfig,
  FollowUpCase,
  UserRole,
  AppNotification,
  Semester,
  AuthUser,
  KopConfig,
} from './types/attendance';
import { StorageService } from './utils/storage';
import { FirebaseService } from './utils/firebase';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DailyAttendance } from './components/DailyAttendance';
import { WeeklyRecap } from './components/WeeklyRecap';
import { MonthlyRecap } from './components/MonthlyRecap';
import { SemesterRecap } from './components/SemesterRecap';
import { AttendanceCharts } from './components/AttendanceCharts';
import { FollowUpReports } from './components/FollowUpReports';
import { StudentManagement } from './components/StudentManagement';
import { AllClassesRecap } from './components/AllClassesRecap';
import { UserManagement } from './components/UserManagement';
import { SchoolSettings } from './components/SchoolSettings';
import { IndividualRecapModal } from './components/IndividualRecapModal';
import { PrintReportView, PrintReportType } from './components/PrintReportView';
import { OfficialLetterModal } from './components/OfficialLetterModal';
import { NotificationToast } from './components/NotificationToast';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() =>
    StorageService.getLoggedInUser()
  );

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<ActiveTab>('daily');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    const logged = StorageService.getLoggedInUser();
    return logged?.role || 'admin';
  });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Domain States
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>(() =>
    StorageService.getSchoolConfig()
  );
  const [students, setStudents] = useState<Student[]>(() =>
    StorageService.getStudents()
  );
  const [allRecords, setAllRecords] = useState<Record<string, DailyAttendanceRecord>>(() =>
    StorageService.getAllAttendanceRecords()
  );
  const [followUpCases, setFollowUpCases] = useState<FollowUpCase[]>(() =>
    StorageService.getFollowUpCases()
  );

  // Modals & Overlays
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);

  const [printModalConfig, setPrintModalConfig] = useState<{
    isOpen: boolean;
    type: PrintReportType;
    dailyRecord?: DailyAttendanceRecord;
    weekDates?: string[];
    monthlyData?: { year: number; month: number };
    semesterData?: { semester: Semester; academicYear: string };
    individualStudent?: Student;
  }>({
    isOpen: false,
    type: 'daily',
  });

  const [letterModalConfig, setLetterModalConfig] = useState<{
    isOpen: boolean;
    student: Student | null;
    alpaCount: number;
    lateCount?: number;
    reason: string;
  }>({
    isOpen: false,
    student: null,
    alpaCount: 0,
    lateCount: 0,
    reason: '',
  });

  // On first mount, if not initialized, seed with sample data so user immediately sees a working app
  useEffect(() => {
    if (!StorageService.isInitialized()) {
      StorageService.seedSampleData();
      setSchoolConfig(StorageService.getSchoolConfig());
      setStudents(StorageService.getStudents());
      setAllRecords(StorageService.getAllAttendanceRecords());
      addToast(
        'info',
        'Selamat Datang di Rekap Kehadiran',
        'Data simulasi telah disiapkan. Anda dapat mengganti data siswa atau mengimpor dari Excel kapan saja.'
      );
    }
  }, []);

  // Toast Notification helper
  const addToast = useCallback(
    (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      setNotifications((prev) => [...prev, { id, type, title, message, timestamp: Date.now() }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Auth Handlers
  const handleLoginSuccess = (user: AuthUser) => {
    StorageService.setLoggedInUser(user);
    setCurrentUser(user);
    setActiveRole(user.role);

    // If Guru BK logs in, direct to Follow-Up and Attendance Analysis
    if (user.role === 'guru_bk') {
      setActiveTab('followup');
    } else {
      setActiveTab('daily');
    }

    addToast(
      'success',
      'Berhasil Masuk',
      `Selamat datang, ${user.name}! Anda masuk sebagai ${
        user.role === 'admin' ? 'Admin Sekolah' : 'Guru BK'
      }.`
    );
  };

  const handleLogout = () => {
    StorageService.setLoggedInUser(null);
    setCurrentUser(null);
    addToast('info', 'Keluar Akun', 'Anda telah keluar dari aplikasi.');
  };

  // Reload all data after restore / clear
  const reloadAllData = () => {
    setSchoolConfig(StorageService.getSchoolConfig());
    setStudents(StorageService.getStudents());
    setAllRecords(StorageService.getAllAttendanceRecords());
    setFollowUpCases(StorageService.getFollowUpCases());
  };

  // Handlers for persistence
  const handleSaveSchoolConfig = (updated: SchoolConfig) => {
    setSchoolConfig(updated);
    StorageService.saveSchoolConfig(updated);
    FirebaseService.syncSchoolConfig(updated);
  };

  const handleSaveKopConfig = (updatedKop: KopConfig) => {
    const updated = { ...schoolConfig, kopConfig: updatedKop };
    setSchoolConfig(updated);
    StorageService.saveSchoolConfig(updated);
    FirebaseService.syncSchoolConfig(updated);
    addToast('success', 'Kop Tersimpan', 'Pengaturan kop dan logo berhasil disimpan sebagai bawaan.');
  };

  const handleClassChange = (newClass: string) => {
    const classTeacher = schoolConfig.classTeachers?.[newClass];
    const updated: SchoolConfig = {
      ...schoolConfig,
      currentClass: newClass,
      homeroomTeacher: classTeacher?.homeroomTeacher || schoolConfig.homeroomTeacher,
      homeroomTeacherNip: classTeacher?.homeroomTeacherNip || schoolConfig.homeroomTeacherNip,
    };
    handleSaveSchoolConfig(updated);
    addToast('info', 'Kelas Diganti', `Menampilkan data absensi untuk kelas ${newClass}`);
  };

  const handleSaveStudents = (updated: Student[]) => {
    setStudents(updated);
    StorageService.saveStudents(updated);
    updated.forEach((s) => FirebaseService.syncStudent(s));
  };

  const handleSaveDailyAttendance = (record: DailyAttendanceRecord) => {
    StorageService.saveDailyAttendance(record);
    setAllRecords((prev) => ({
      ...prev,
      [`${record.classRoom}_${record.date}`]: record,
    }));
    FirebaseService.syncDailyAttendance(record);
  };

  const handleSaveFollowUpCases = (cases: FollowUpCase[]) => {
    setFollowUpCases(cases);
    StorageService.saveFollowUpCases(cases);
    cases.forEach((c) => FirebaseService.syncFollowUpCase(c));
    addToast('success', 'Status Disimpan', 'Pembaruan data tindak lanjut siswa berhasil disimpan.');
  };

  // Current active class students
  const activeClassStudents = useMemo(() => {
    return students.filter((s) => s.classRoom === schoolConfig.currentClass);
  }, [students, schoolConfig.currentClass]);

  // Compute number of active alerts for sidebar badge
  const followUpAlertCount = useMemo(() => {
    let count = 0;
    activeClassStudents.forEach((student) => {
      let alpa = 0;
      let late = 0;
      Object.values(allRecords).forEach((rec) => {
        if (rec.classRoom !== schoolConfig.currentClass) return;
        if (rec.entries[student.id]?.status === 'alpa') alpa++;
        if (rec.entries[student.id]?.isLate) late++;
      });
      if (alpa >= 3 || late > 3) count++;
    });
    return count;
  }, [activeClassStudents, allRecords, schoolConfig.currentClass]);

  // Print handlers
  const handlePrintDaily = (record: DailyAttendanceRecord, currentStudents: Student[]) => {
    setPrintModalConfig({
      isOpen: true,
      type: 'daily',
      dailyRecord: record,
    });
  };

  const handlePrintWeekly = (weekDates: string[], currentStudents: Student[]) => {
    setPrintModalConfig({
      isOpen: true,
      type: 'weekly',
      weekDates,
    });
  };

  const handlePrintMonthly = (year: number, month: number, currentStudents: Student[]) => {
    setPrintModalConfig({
      isOpen: true,
      type: 'monthly',
      monthlyData: { year, month },
    });
  };

  const handlePrintSemester = (semester: Semester, academicYear: string, currentStudents: Student[]) => {
    setPrintModalConfig({
      isOpen: true,
      type: 'semester',
      semesterData: { semester, academicYear },
    });
  };

  const handlePrintStudentReport = (student: Student) => {
    setSelectedStudentForDetail(null);
    setPrintModalConfig({
      isOpen: true,
      type: 'individual',
      individualStudent: student,
    });
  };

  const handleGenerateOfficialLetter = (
    student: Student,
    alpaCount: number,
    reason: string,
    lateCount?: number
  ) => {
    setLetterModalConfig({
      isOpen: true,
      student,
      alpaCount,
      lateCount,
      reason,
    });
  };

  // If user is not logged in, display the Login Screen first
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 font-sans selection:bg-blue-600 selection:text-white">
        <LoginScreen schoolConfig={schoolConfig} onLoginSuccess={handleLoginSuccess} />
        <NotificationToast notifications={notifications} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        schoolConfig={schoolConfig}
        currentUser={currentUser}
        onClassChange={handleClassChange}
        activeRole={activeRole}
        onRoleChange={setActiveRole}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onOpenSettings={() => setActiveTab('settings')}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          schoolConfig={schoolConfig}
          studentCount={activeClassStudents.length}
          followUpAlertCount={followUpAlertCount}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 max-w-7xl mx-auto w-full">
          {activeTab === 'daily' && (
            <DailyAttendance
              students={activeClassStudents}
              schoolConfig={schoolConfig}
              allRecords={allRecords}
              onSaveDailyAttendance={handleSaveDailyAttendance}
              onOpenStudentDetail={setSelectedStudentForDetail}
              onPrintDaily={handlePrintDaily}
            />
          )}

          {activeTab === 'weekly' && (
            <WeeklyRecap
              students={activeClassStudents}
              schoolConfig={schoolConfig}
              allRecords={allRecords}
              onOpenStudentDetail={setSelectedStudentForDetail}
              onPrintWeekly={handlePrintWeekly}
            />
          )}

          {activeTab === 'monthly' && (
            <MonthlyRecap
              students={activeClassStudents}
              schoolConfig={schoolConfig}
              allRecords={allRecords}
              onOpenStudentDetail={setSelectedStudentForDetail}
              onPrintMonthly={handlePrintMonthly}
            />
          )}

          {activeTab === 'semester' && (
            <SemesterRecap
              students={activeClassStudents}
              schoolConfig={schoolConfig}
              allRecords={allRecords}
              onOpenStudentDetail={setSelectedStudentForDetail}
              onPrintSemester={handlePrintSemester}
            />
          )}

          {activeTab === 'charts' && (
            <AttendanceCharts
              students={activeClassStudents}
              schoolConfig={schoolConfig}
              allRecords={allRecords}
              onOpenStudentDetail={setSelectedStudentForDetail}
            />
          )}

          {activeTab === 'followup' && (
            <FollowUpReports
              students={activeClassStudents}
              schoolConfig={schoolConfig}
              allRecords={allRecords}
              followUpCases={followUpCases}
              onSaveFollowUpCases={handleSaveFollowUpCases}
              onOpenStudentDetail={setSelectedStudentForDetail}
              onGenerateOfficialLetter={handleGenerateOfficialLetter}
            />
          )}

          {activeTab === 'all_classes' && currentUser?.role === 'admin' && (
            <AllClassesRecap
              students={students}
              schoolConfig={schoolConfig}
              allRecords={allRecords}
              onOpenStudentDetail={setSelectedStudentForDetail}
              onSwitchClass={handleClassChange}
              onNavigateToTab={(tab, className) => {
                setActiveTab(tab);
              }}
            />
          )}

          {activeTab === 'students' && (
            <StudentManagement
              students={students}
              schoolConfig={schoolConfig}
              onSaveStudents={handleSaveStudents}
              onShowToast={addToast}
              onOpenStudentDetail={setSelectedStudentForDetail}
            />
          )}

          {activeTab === 'users' && currentUser?.role === 'admin' && (
            <UserManagement
              currentUser={currentUser}
              onShowToast={addToast}
            />
          )}

          {activeTab === 'settings' && (
            <SchoolSettings
              schoolConfig={schoolConfig}
              onSaveSchoolConfig={handleSaveSchoolConfig}
              onReloadAllData={reloadAllData}
              onShowToast={addToast}
              students={students}
              allRecords={allRecords}
              followUpCases={followUpCases}
            />
          )}
        </main>
      </div>

      {/* Individual Student Profile Modal */}
      {selectedStudentForDetail && (
        <IndividualRecapModal
          student={selectedStudentForDetail}
          schoolConfig={schoolConfig}
          allRecords={allRecords}
          onClose={() => setSelectedStudentForDetail(null)}
          onPrintStudentReport={handlePrintStudentReport}
        />
      )}

      {/* Printable Report View (Kop Surat, Logo & Signatures) */}
      {printModalConfig.isOpen && (
        <PrintReportView
          type={printModalConfig.type}
          schoolConfig={schoolConfig}
          students={activeClassStudents}
          allRecords={allRecords}
          dailyRecord={printModalConfig.dailyRecord}
          weekDates={printModalConfig.weekDates}
          monthlyData={printModalConfig.monthlyData}
          semesterData={printModalConfig.semesterData}
          individualStudent={printModalConfig.individualStudent}
          onSaveKopConfig={handleSaveKopConfig}
          onClose={() => setPrintModalConfig((prev) => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* Official Parent Invitation Letter Modal */}
      {letterModalConfig.isOpen && (
        <OfficialLetterModal
          student={letterModalConfig.student}
          schoolConfig={schoolConfig}
          alpaCount={letterModalConfig.alpaCount}
          lateCount={letterModalConfig.lateCount}
          reason={letterModalConfig.reason}
          onSaveKopConfig={handleSaveKopConfig}
          onClose={() => setLetterModalConfig((prev) => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* Toast Feedback Notifications */}
      <NotificationToast notifications={notifications} onDismiss={dismissToast} />
    </div>
  );
}
