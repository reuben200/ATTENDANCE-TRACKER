import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { Member, Activity, AttendanceSession, HouseFellowshipNotice } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const hasFirebaseConfig = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

let db: any = null;

if (hasFirebaseConfig) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || "(default)");
  } catch (e) {
    console.error("Firebase initialization failed:", e);
  }
}

// Collection names
const MEMBERS_COLLECTION = 'members';
const ACTIVITIES_COLLECTION = 'activities';
const SESSIONS_COLLECTION = 'sessions';
const NOTICES_COLLECTION = 'notices';

// Helper to read from LocalStorage
function getLocal<T>(key: string, defaultValue: T): T {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(data) as T;
  } catch {
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Seed / Default Offline Data
const DEFAULT_MEMBERS: Member[] = [
  {
    id: 'm_1',
    title: 'Bro',
    name: 'Samuel Adebayo',
    isSick: false,
    isVisible: true,
    role: 'member',
    accessCode: 'SAM1234',
    phone: '+234 802 345 6789',
    email: 'samuel.adebayo@example.com',
    address: '14 Unity Close, Ikeja, Lagos',
    birthday: '08-14',
    avatarUrl: ''
  },
  {
    id: 'm_2',
    title: 'Sis',
    name: 'Chioma Nwachukwu',
    isSick: true,
    isVisible: true,
    role: 'member',
    accessCode: 'CHI5678',
    phone: '+234 803 987 6543',
    email: 'chioma.nwachukwu@example.com',
    address: '8 Faith Street, Surulere, Lagos',
    outreachStatus: 'contacted',
    outreachNotes: 'Recuperating at home; welfare team scheduled follow-up prayer call.',
    birthday: '08-28',
    avatarUrl: ''
  },
  {
    id: 'm_3',
    title: 'Bro',
    name: 'Joseph Olatunji',
    isSick: false,
    isVisible: true,
    role: 'member',
    accessCode: 'JOS9012',
    phone: '+234 805 112 2334',
    email: 'joseph.olatunji@example.com',
    address: '22 Grace Road, Lekki Phase 1, Lagos',
    birthday: '09-05',
    avatarUrl: ''
  },
  {
    id: 'm_4',
    title: 'Sis',
    name: 'Blessing Emmanuel',
    isSick: true,
    isVisible: true,
    role: 'member',
    accessCode: 'BLE4321',
    phone: '+234 807 555 4321',
    email: 'blessing.emmanuel@example.com',
    address: '5 Victory Crescent, Yaba, Lagos',
    outreachStatus: 'pending',
    outreachNotes: 'Admitted for short rest; requested prayers from elders.',
    birthday: '08-31',
    avatarUrl: ''
  },
  {
    id: 'm_5',
    title: 'Bro',
    name: 'Emmanuel Chukwuma',
    isSick: false,
    isVisible: true,
    role: 'member',
    accessCode: 'EMM7890',
    phone: '+234 812 334 9988',
    email: 'emmanuel.c@example.com',
    address: '10 Peace Estate, Gbagada, Lagos',
    birthday: '08-18',
    avatarUrl: ''
  }
];

const DEFAULT_ACTIVITIES: Activity[] = [
  { id: 'a_1', name: 'Sunday Service', dayOfWeek: 'Sunday' },
  { id: 'a_2', name: 'Wednesday Bible Study', dayOfWeek: 'Wednesday' }
];

const DEFAULT_SESSIONS: AttendanceSession[] = [];

const DEFAULT_NOTICE: HouseFellowshipNotice = {
  id: 'house_fellowship',
  topic: 'Bro. Samuel Adebayo', // Host name
  date: '2026-07-19',
  time: '5:00 PM',
  host: 'Elder. Joseph Olatunji', // Moderator name
  address: '14 Unity Close, Ikeja, Lagos',
  hostPhone: '+234 802 345 6789',
  hostMemberId: 'm_1'
};

/**
 * Members APIs
 */
export async function getMembersFromFirestore(): Promise<Member[]> {
  if (db) {
    try {
      const querySnapshot = await getDocs(collection(db, MEMBERS_COLLECTION));
      const list: Member[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Member);
      });
      if (list.length > 0) {
        setLocal('cached_members', list);
      }
      return list;
    } catch (e) {
      console.warn("Firestore error getting members, falling back to local:", e);
    }
  }
  return getLocal<Member[]>('cached_members', DEFAULT_MEMBERS);
}

export async function addMemberToFirestore(member: Member): Promise<void> {
  if (db) {
    try {
      await setDoc(doc(db, MEMBERS_COLLECTION, member.id), member);
    } catch (e) {
      console.warn("Firestore error adding member:", e);
    }
  }
  const current = getLocal<Member[]>('cached_members', DEFAULT_MEMBERS);
  setLocal('cached_members', [...current, member]);
}

export async function updateMemberInFirestore(id: string, data: Partial<Member>): Promise<void> {
  if (db) {
    try {
      const sanitized: Record<string, any> = {};
      Object.entries(data).forEach(([key, val]) => {
        if (val !== undefined) {
          sanitized[key] = val;
        }
      });
      await updateDoc(doc(db, MEMBERS_COLLECTION, id), sanitized);
    } catch (e) {
      console.warn("Firestore error updating member:", e);
    }
  }
  const current = getLocal<Member[]>('cached_members', DEFAULT_MEMBERS);
  const updated = current.map(m => m.id === id ? { ...m, ...data } : m);
  setLocal('cached_members', updated);
}

export async function deleteMemberFromFirestore(id: string): Promise<void> {
  if (db) {
    try {
      await deleteDoc(doc(db, MEMBERS_COLLECTION, id));
    } catch (e) {
      console.warn("Firestore error deleting member:", e);
    }
  }
  const current = getLocal<Member[]>('cached_members', DEFAULT_MEMBERS);
  const filtered = current.filter(m => m.id !== id);
  setLocal('cached_members', filtered);
}

/**
 * Activities APIs
 */
export async function getActivitiesFromFirestore(): Promise<Activity[]> {
  if (db) {
    try {
      const querySnapshot = await getDocs(collection(db, ACTIVITIES_COLLECTION));
      const list: Activity[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Activity);
      });
      if (list.length > 0) {
        setLocal('cached_activities', list);
      }
      return list;
    } catch (e) {
      console.warn("Firestore error getting activities, falling back to local:", e);
    }
  }
  return getLocal<Activity[]>('cached_activities', DEFAULT_ACTIVITIES);
}

export async function addActivityToFirestore(activity: Activity): Promise<void> {
  if (db) {
    try {
      await setDoc(doc(db, ACTIVITIES_COLLECTION, activity.id), activity);
    } catch (e) {
      console.warn("Firestore error adding activity:", e);
    }
  }
  const current = getLocal<Activity[]>('cached_activities', DEFAULT_ACTIVITIES);
  setLocal('cached_activities', [...current, activity]);
}

export async function updateActivityInFirestore(id: string, data: Partial<Activity>): Promise<void> {
  if (db) {
    try {
      await updateDoc(doc(db, ACTIVITIES_COLLECTION, id), data);
    } catch (e) {
      console.warn("Firestore error updating activity:", e);
    }
  }
  const current = getLocal<Activity[]>('cached_activities', DEFAULT_ACTIVITIES);
  const updated = current.map(a => a.id === id ? { ...a, ...data } : a);
  setLocal('cached_activities', updated);
}

export async function deleteActivityFromFirestore(id: string): Promise<void> {
  if (db) {
    try {
      await deleteDoc(doc(db, ACTIVITIES_COLLECTION, id));
    } catch (e) {
      console.warn("Firestore error deleting activity:", e);
    }
  }
  const current = getLocal<Activity[]>('cached_activities', DEFAULT_ACTIVITIES);
  const filtered = current.filter(a => a.id !== id);
  setLocal('cached_activities', filtered);
}

/**
 * Sessions APIs
 */
export async function getSessionsFromFirestore(): Promise<AttendanceSession[]> {
  if (db) {
    try {
      const querySnapshot = await getDocs(collection(db, SESSIONS_COLLECTION));
      const list: AttendanceSession[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push(docSnap.data() as AttendanceSession);
      });
      if (list.length > 0) {
        setLocal('cached_sessions', list);
      }
      return list;
    } catch (e) {
      console.warn("Firestore error getting sessions, falling back to local:", e);
    }
  }
  return getLocal<AttendanceSession[]>('cached_sessions', DEFAULT_SESSIONS);
}

export async function addSessionToFirestore(session: AttendanceSession): Promise<void> {
  if (db) {
    try {
      await setDoc(doc(db, SESSIONS_COLLECTION, session.id), session);
    } catch (e) {
      console.warn("Firestore error adding session:", e);
    }
  }
  const current = getLocal<AttendanceSession[]>('cached_sessions', DEFAULT_SESSIONS);
  const existingIndex = current.findIndex(s => s.id === session.id);
  if (existingIndex >= 0) {
    const copy = [...current];
    copy[existingIndex] = session;
    setLocal('cached_sessions', copy);
  } else {
    setLocal('cached_sessions', [...current, session]);
  }
}

export async function updateSessionInFirestore(id: string, data: Partial<AttendanceSession>): Promise<void> {
  if (db) {
    try {
      await updateDoc(doc(db, SESSIONS_COLLECTION, id), data);
    } catch (e) {
      console.warn("Firestore error updating session:", e);
    }
  }
  const current = getLocal<AttendanceSession[]>('cached_sessions', DEFAULT_SESSIONS);
  const updated = current.map(s => s.id === id ? { ...s, ...data } : s);
  setLocal('cached_sessions', updated);
}

export async function deleteSessionFromFirestore(id: string): Promise<void> {
  if (db) {
    try {
      await deleteDoc(doc(db, SESSIONS_COLLECTION, id));
    } catch (e) {
      console.warn("Firestore error deleting session:", e);
    }
  }
  const current = getLocal<AttendanceSession[]>('cached_sessions', DEFAULT_SESSIONS);
  const filtered = current.filter(s => s.id !== id);
  setLocal('cached_sessions', filtered);
}

/**
 * Noticeboard APIs
 */
export async function getHouseFellowshipNoticeFromFirestore(): Promise<HouseFellowshipNotice | null> {
  if (db) {
    try {
      const querySnapshot = await getDocs(collection(db, NOTICES_COLLECTION));
      let notice: HouseFellowshipNotice | null = null;
      querySnapshot.forEach((docSnap) => {
        if (docSnap.id === 'house_fellowship') {
          notice = docSnap.data() as HouseFellowshipNotice;
        }
      });
      if (notice) {
        setLocal('cached_notice', notice);
        return notice;
      }
    } catch (e) {
      console.warn("Firestore error getting notice, falling back to local:", e);
    }
  }
  return getLocal<HouseFellowshipNotice | null>('cached_notice', DEFAULT_NOTICE);
}

export async function saveHouseFellowshipNoticeInFirestore(notice: HouseFellowshipNotice): Promise<void> {
  if (db) {
    try {
      await setDoc(doc(db, NOTICES_COLLECTION, 'house_fellowship'), notice);
    } catch (e) {
      console.warn("Firestore error saving notice:", e);
    }
  }
  setLocal('cached_notice', notice);
}

