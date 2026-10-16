import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  collection,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { Student, SchoolConfig, DailyAttendanceRecord, FollowUpCase, StoredAccount } from '../types/attendance';
import firebaseAppletConfig from '../../firebase-applet-config.json';

// Skill-mandated error handling structures
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (appInstance) return appInstance;

  const apps = getApps();
  if (apps.length > 0) {
    appInstance = apps[0];
  } else {
    appInstance = initializeApp({
      apiKey: firebaseAppletConfig.apiKey,
      authDomain: firebaseAppletConfig.authDomain,
      projectId: firebaseAppletConfig.projectId,
      storageBucket: firebaseAppletConfig.storageBucket,
      messagingSenderId: firebaseAppletConfig.messagingSenderId,
      appId: firebaseAppletConfig.appId,
    });
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;
  const app = getFirebaseApp();
  authInstance = getAuth(app);
  return authInstance;
}

export function getFirestoreDb(): Firestore {
  if (dbInstance) return dbInstance;
  const app = getFirebaseApp();
  const dbId = (firebaseAppletConfig as any).firestoreDatabaseId;

  const settings = {
    experimentalAutoDetectLongPolling: true,
  };

  try {
    if (dbId && dbId !== '(default)' && dbId.trim().length > 0) {
      dbInstance = initializeFirestore(app, settings, dbId);
    } else {
      dbInstance = initializeFirestore(app, settings);
    }
  } catch {
    // If instance was already initialized, retrieve existing
    if (dbId && dbId !== '(default)' && dbId.trim().length > 0) {
      dbInstance = getFirestore(app, dbId);
    } else {
      dbInstance = getFirestore(app);
    }
  }
  return dbInstance;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const auth = authInstance || getFirebaseAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initial connection test (callable on demand without blocking application boot)
export async function testInitialConnection(): Promise<boolean> {
  try {
    const db = getFirestoreDb();
    await getDoc(doc(db, 'settings', 'school_config'));
    return true;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('Could not reach'))) {
      console.warn('Firebase status: client operates in offline mode with local storage cache.');
    }
    return false;
  }
}

export const FirebaseService = {
  // Check if Firebase is provisioned with valid config
  isConfigured(): boolean {
    return Boolean(firebaseAppletConfig.projectId && firebaseAppletConfig.apiKey);
  },

  getProjectInfo() {
    return {
      projectId: firebaseAppletConfig.projectId,
      firestoreDatabaseId: (firebaseAppletConfig as any).firestoreDatabaseId || '(default)',
      authDomain: firebaseAppletConfig.authDomain,
      storageBucket: firebaseAppletConfig.storageBucket,
    };
  },

  // Test live connection with roundtrip read/write test
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
    details?: string;
  }> {
    const startTime = Date.now();
    try {
      const db = getFirestoreDb();
      const testRef = doc(db, 'settings', 'ping_test');

      // Write ping with timeout
      await Promise.race([
        setDoc(testRef, {
          timestamp: new Date().toISOString(),
          client: 'Aplikasi Rekap Kehadiran',
          status: 'online',
          serverCheck: true,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout koneksi (jaringan lambat atau offline)')), 6000)
        ),
      ]);

      // Read back with timeout
      const snap = await Promise.race([
        getDoc(testRef),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout membaca respon dari server')), 6000)
        ),
      ]);
      const latencyMs = Date.now() - startTime;

      if (snap.exists()) {
        return {
          success: true,
          message: `Koneksi ke Firebase Firestore aktif & stabil!`,
          latencyMs,
          details: `Project ID: ${firebaseAppletConfig.projectId} · Database: ${(firebaseAppletConfig as any).firestoreDatabaseId || '(default)'} · Waktu Respons: ${latencyMs}ms`,
        };
      } else {
        return {
          success: true,
          message: 'Koneksi terhubung ke Firestore, data tersimpan.',
          latencyMs,
        };
      }
    } catch (err: any) {
      console.error('Firebase test connection error:', err);
      let userFriendlyMsg = 'Tidak dapat terhubung ke Firebase Firestore.';
      const rawMsg = err?.message || '';

      if (rawMsg.includes('the client is offline') || rawMsg.includes('unavailable') || rawMsg.includes('network')) {
        userFriendlyMsg = 'Klien sedang offline atau jaringan internet tidak dapat menjangkau server Firebase. Data absensi tetap aman di penyimpanan lokal perangkat.';
      } else if (rawMsg.includes('permission-denied')) {
        userFriendlyMsg = 'Izin akses ditolak (Permission Denied). Aturan keamanan Firestore telah disiapkan.';
      } else if (rawMsg.includes('not-found') || rawMsg.includes('database')) {
        userFriendlyMsg = 'Basis data Firestore sedang dipersiapkan oleh cloud. Silakan coba kembali dalam beberapa saat.';
      } else {
        userFriendlyMsg = `Kendala koneksi: ${rawMsg}`;
      }

      return {
        success: false,
        message: userFriendlyMsg,
        details: rawMsg,
      };
    }
  },

  // Sync entire local dataset to Firestore Cloud
  async uploadAllToCloud(data: {
    schoolConfig: SchoolConfig;
    students: Student[];
    allRecords: Record<string, DailyAttendanceRecord>;
    followUpCases: FollowUpCase[];
    accounts?: StoredAccount[];
  }): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const db = getFirestoreDb();
      let totalSynced = 0;

      // 1. Save School Config
      await setDoc(doc(db, 'settings', 'school_config'), {
        ...data.schoolConfig,
        updatedAt: new Date().toISOString(),
      });
      totalSynced++;

      // 2. Save Students
      for (const student of data.students) {
        await setDoc(doc(db, 'students', student.id), {
          ...student,
          syncedAt: new Date().toISOString(),
        });
        totalSynced++;
      }

      // 3. Save Attendance Records
      for (const [key, record] of Object.entries(data.allRecords)) {
        await setDoc(doc(db, 'attendance', key), {
          ...record,
          syncedAt: new Date().toISOString(),
        });
        totalSynced++;
      }

      // 4. Save Follow-Up Cases
      for (const c of data.followUpCases) {
        await setDoc(doc(db, 'followups', c.id), {
          ...c,
          syncedAt: new Date().toISOString(),
        });
        totalSynced++;
      }

      // 5. Save Accounts
      if (data.accounts && data.accounts.length > 0) {
        for (const acc of data.accounts) {
          await setDoc(doc(db, 'accounts', acc.id), {
            ...acc,
            syncedAt: new Date().toISOString(),
          });
          totalSynced++;
        }
      }

      return {
        success: true,
        message: `Berhasil mengunggah ${totalSynced} data (Profil, ${data.students.length} Siswa, ${Object.keys(data.allRecords).length} Riwayat Absensi) ke Firebase Cloud!`,
        count: totalSynced,
      };
    } catch (err: any) {
      console.error('Upload all error:', err);
      return {
        success: false,
        message: 'Gagal mengunggah data ke Cloud: ' + (err?.message || 'Error tidak diketahui'),
      };
    }
  },

  // Pull latest dataset from Firestore Cloud
  async pullAllFromCloud(): Promise<{
    success: boolean;
    data?: {
      schoolConfig?: SchoolConfig;
      students: Student[];
      allRecords: Record<string, DailyAttendanceRecord>;
      followUpCases: FollowUpCase[];
      accounts?: StoredAccount[];
    };
    message: string;
  }> {
    try {
      const db = getFirestoreDb();

      // 1. Read School Config
      const configSnap = await getDoc(doc(db, 'settings', 'school_config'));
      const schoolConfig = configSnap.exists() ? (configSnap.data() as SchoolConfig) : undefined;

      // 2. Read Students
      const studentsSnap = await getDocs(collection(db, 'students'));
      const students: Student[] = [];
      studentsSnap.forEach((d) => {
        students.push(d.data() as Student);
      });

      // 3. Read Attendance
      const attendanceSnap = await getDocs(collection(db, 'attendance'));
      const allRecords: Record<string, DailyAttendanceRecord> = {};
      attendanceSnap.forEach((d) => {
        allRecords[d.id] = d.data() as DailyAttendanceRecord;
      });

      // 4. Read Follow-Ups
      const followUpsSnap = await getDocs(collection(db, 'followups'));
      const followUpCases: FollowUpCase[] = [];
      followUpsSnap.forEach((d) => {
        followUpCases.push(d.data() as FollowUpCase);
      });

      // 5. Read Accounts
      const accountsSnap = await getDocs(collection(db, 'accounts'));
      const accounts: StoredAccount[] = [];
      accountsSnap.forEach((d) => {
        accounts.push(d.data() as StoredAccount);
      });

      return {
        success: true,
        data: {
          schoolConfig,
          students,
          allRecords,
          followUpCases,
          accounts: accounts.length > 0 ? accounts : undefined,
        },
        message: `Berhasil mengunduh data dari Cloud (${students.length} Siswa, ${Object.keys(allRecords).length} Riwayat Absensi).`,
      };
    } catch (err: any) {
      console.error('Pull all error:', err);
      return {
        success: false,
        message: 'Gagal mengambil data dari Cloud: ' + (err?.message || 'Error tidak diketahui'),
      };
    }
  },

  // Real-time sync for single daily attendance
  async syncDailyAttendance(record: DailyAttendanceRecord): Promise<void> {
    try {
      const db = getFirestoreDb();
      const key = `${record.classRoom}_${record.date}`;
      await setDoc(doc(db, 'attendance', key), {
        ...record,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Realtime cloud sync skipped (offline or unreached)', e);
    }
  },

  // Real-time sync for student list or student item
  async syncStudent(student: Student): Promise<void> {
    try {
      const db = getFirestoreDb();
      await setDoc(doc(db, 'students', student.id), {
        ...student,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Student sync skipped', e);
    }
  },

  async deleteStudent(studentId: string): Promise<void> {
    try {
      const db = getFirestoreDb();
      await deleteDoc(doc(db, 'students', studentId));
    } catch (e) {
      console.warn('Student delete sync skipped', e);
    }
  },

  async syncSchoolConfig(config: SchoolConfig): Promise<void> {
    try {
      const db = getFirestoreDb();
      await setDoc(doc(db, 'settings', 'school_config'), {
        ...config,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('SchoolConfig sync skipped', e);
    }
  },

  async syncFollowUpCase(caseItem: FollowUpCase): Promise<void> {
    try {
      const db = getFirestoreDb();
      await setDoc(doc(db, 'followups', caseItem.id), {
        ...caseItem,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('FollowUp sync skipped', e);
    }
  },

  getConfig() {
    return firebaseAppletConfig;
  },
};
