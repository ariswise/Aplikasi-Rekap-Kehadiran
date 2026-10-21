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
  StoredAccount,
} from './types/attendance';
import { StorageService, sortStudentsAlphabetically } from './utils/storage';
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

  // On first mount, try to sync from Firebase Cloud first, fallback to local storage or seed
  useEffect(() => {
    const initApp = async () => {
      // 1. Try pulling fresh cloud dataset if Firebase is configured
      if (FirebaseService.isConfigured()) {
        try {
          const cloudRes = await Promise.race([
            FirebaseService.pullAllFromCloud(),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000)),
          ]);

          if (cloudRes.success && cloudRes.data) {
            let hasCloudData = false;

            if (cloudRes.data.schoolConfig) {
              StorageService.saveSchoolConfig(cloudRes.data.schoolConfig);
              setSchoolConfig(cloudRes.data.schoolConfig);
              hasCloudData = true;
            }

            if (cloudRes.data.students && cloudRes.data.students.length > 0) {
              const sorted = sortStudentsAlphabetically(cloudRes.data.students);
              StorageService.saveStudents(sorted);
              setStudents(sorted);
              hasCloudData = true;
            }

            if (cloudRes.data.allRecords && Object.keys(cloudRes.data.allRecords).length > 0) {
              localStorage.setItem('rekap_kehadiran_daily_records_v1', JSON.stringify(cloudRes.data.allRecords));
              setAllRecords(cloudRes.data.allRecords);
              hasCloudData = true;
            }

            if (cloudRes.data.followUpCases && cloudRes.data.followUpCases.length > 0) {
              StorageService.saveFollowUpCases(cloudRes.data.followUpCases);
              setFollowUpCases(cloudRes.data.followUpCases);
              hasCloudData = true;
            }

            if (cloudRes.data.accounts && cloudRes.data.accounts.length > 0) {
              const localAccounts = StorageService.getAccounts();
              const map = new Map<string, StoredAccount>();
              localAccounts.forEach((a) => map.set(a.id, a));
              cloudRes.data.accounts.forEach((a) => map.set(a.id, a));
              StorageService.saveAccounts(Array.from(map.values()));
              hasCloudData = true;
            }

            if (hasCloudData) {
              localStorage.setItem('rekap_kehadiran_initialized_v1', 'true');
              addToast('info', 'Data Terhubung ke Cloud', 'Data sekolah dan akun telah disinkronkan dari server Cloud Firebase.');
              return;
            }
          }
        } catch (err) {
          console.warn('Initial cloud pull timed out or failed, proceeding with local data:', err);
        }
      }

      // 2. If no cloud data and not initialized, seed with sample data
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
    };

    initApp();
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

    // CRITICAL: Reload fresh storage data so newly synced cloud dataset on mobile is immediately active
    const freshConfig = StorageService.getSchoolConfig();
    const freshStudents = StorageService.getStudents();
    const freshRecords = StorageService.getAllAttendanceRecords();
    const freshFollowUps = StorageService.getFollowUpCases();

    setSchoolConfig(freshConfig);
    setStudents(sortStudentsAlphabetically(freshStudents));
    setAllRecords(freshRecords);
    setFollowUpCases(freshFollowUps);

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
    const sorted = sortStudentsAlphabetically(updated);
    setStudents(sorted);
    StorageService.saveStudents(sorted);
    sorted.forEach((s) => FirebaseService.syncStudent(s));
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

  // Determine effective available classes for the logged in user based on permissions
  const effectiveAvailableClasses = useMemo(() => {
    if (!currentUser || currentUser.role === 'admin') {
      return schoolConfig.availableClasses;
    }
    if (currentUser.allowedClasses && currentUser.allowedClasses.length > 0) {
      const allowed = schoolConfig.availableClasses.filter((c) =>
        currentUser.allowedClasses!.includes(c)
      );
      return allowed.length > 0 ? allowed : schoolConfig.availableClasses;
    }
    return schoolConfig.availableClasses;
  }, [currentUser, schoolConfig.availableClasses]);

  // Combined schoolConfig reflecting allowed classes
  const effectiveSchoolConfig = useMemo(() => {
    return {
      ...schoolConfig,
      availableClasses: effectiveAvailableClasses,
    };
  }, [schoolConfig, effectiveAvailableClasses]);

  // Ensure current active class is within user's allowed classes
  useEffect(() => {
    if (
      currentUser &&
      effectiveAvailableClasses.length > 0 &&
      !effectiveAvailableClasses.includes(schoolConfig.currentClass)
    ) {
      handleClassChange(effectiveAvailableClasses[0]);
    }
  }, [effectiveAvailableClasses, schoolConfig.currentClass, currentUser]);

  // Students visible according to user's class permissions (sorted A-Z)
  const visibleStudents = useMemo(() => {
    const list = !currentUser || currentUser.role === 'admin'
      ? students
      : students.filter((s) => effectiveAvailableClasses.includes(s.classRoom));
    return sortStudentsAlphabetically(list);
  }, [students, currentUser, effectiveAvailableClasses]);

  // Current active class students (always strictly sorted A-Z alphabetically)
  const activeClassStudents = useMemo(() => {
    const list = students.filter((s) => s.classRoom === schoolConfig.currentClass);
    return sortStudentsAlphabetically(list);
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
        schoolConfig={effectiveSchoolConfig}
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
          schoolConfig={effectiveSchoolConfig}
          studentCount={activeClassStudents.length}
          followUpAlertCount={followUpAlertCount}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 max-w-7xl mx-auto w-full flex flex-col justify-between">
          <div className="flex-1 pb-6">
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
                students={visibleStudents}
                schoolConfig={effectiveSchoolConfig}
                onSaveStudents={handleSaveStudents}
                onShowToast={addToast}
                onOpenStudentDetail={setSelectedStudentForDetail}
              />
            )}

            {activeTab === 'users' && currentUser?.role === 'admin' && (
              <UserManagement
                currentUser={currentUser}
                availableClasses={schoolConfig.availableClasses}
                onShowToast={addToast}
                onUpdateCurrentUser={setCurrentUser}
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
          </div>

          {/* Bottom Footer on every menu page */}
          <footer className="mt-12 pt-6 pb-4 border-t border-slate-200 text-center text-xs text-slate-500 font-medium no-print">
            Dikembangkan Oleh : Aris Wicaksono, S.Pd.
          </footer>
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
