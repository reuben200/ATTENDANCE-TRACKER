import { Member, Activity, AttendanceSession, AttendanceRecord } from '../types';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
// Initialize Firebase App & Auth
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Keep auth states & token cached in memory and localStorage
let cachedAccessToken: string | null = localStorage.getItem('google_access_token');
let cachedUser: { email: string; displayName: string } | null = null;
try {
  const savedUser = localStorage.getItem('google_user');
  if (savedUser) {
    cachedUser = JSON.parse(savedUser);
  }
} catch (e) {
  console.error('Error parsing cached user:', e);
}

export const initAuth = (
  onAuthSuccess?: (user: { email: string; displayName: string }, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (cachedAccessToken && cachedUser) {
    if (onAuthSuccess) {
      onAuthSuccess(cachedUser, cachedAccessToken);
    }
  } else {
    if (onAuthFailure) {
      onAuthFailure();
    }
  }
};

export const googleSignIn = async (): Promise<{ user: { email: string; displayName: string }; accessToken: string } | null> => {
  try {
    const provider = new GoogleAuthProvider();
    // Request sheets and calendar scopes needed for the app
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    provider.addScope('https://www.googleapis.com/auth/calendar');

    // Open standard Firebase Google Login popup
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential || !credential.accessToken) {
      throw new Error('Failed to retrieve Google Access Token from login popup.');
    }

    const accessToken = credential.accessToken;
    const userObj = {
      email: result.user.email || 'authorized@gmail.com',
      displayName: result.user.displayName || result.user.email || 'Church Administrator',
    };

    cachedAccessToken = accessToken;
    cachedUser = userObj;
    localStorage.setItem('google_access_token', accessToken);
    localStorage.setItem('google_user', JSON.stringify(userObj));

    return { user: userObj, accessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    // Standardize error message for user closed popup or cancelled
    if (error.code === 'auth/popup-closed-by-user' || error.message?.includes('closed-by-user')) {
      throw new Error('Sign-In window closed by user. If you are running inside the AI Studio preview iframe, please open the application in a new standalone tab using the button below to bypass browser iframe restrictions and complete Google sign-in.');
    }
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error('Error signing out of Firebase Auth:', e);
  }
  cachedAccessToken = null;
  cachedUser = null;
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_user');
};

export const getCachedToken = () => cachedAccessToken;

export const setCachedToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    localStorage.setItem('google_access_token', token);
  } else {
    localStorage.removeItem('google_access_token');
  }
};

// ==========================================
// GOOGLE SHEETS API INTEGRATION
// ==========================================

export async function createSpreadsheet(accessToken: string): Promise<string> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: 'Isolo Church of Christ - Congregation Records',
      },
      sheets: [
        { properties: { title: 'Members' } },
        { properties: { title: 'Activities' } },
        { properties: { title: 'Sessions' } },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create spreadsheet: ${errText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Initialize Headers
  await initializeSpreadsheetHeaders(accessToken, spreadsheetId);

  return spreadsheetId;
}

async function initializeSpreadsheetHeaders(accessToken: string, spreadsheetId: string) {
  const rangesData = [
    {
      range: 'Members!A1:G1',
      values: [['ID', 'Title', 'Name', 'Is Sick', 'Is Visible', 'Role', 'Access Code']],
    },
    {
      range: 'Activities!A1:C1',
      values: [['ID', 'Name', 'Day of Week']],
    },
    {
      range: 'Sessions!A1:E1',
      values: [['Session ID', 'Activity Name', 'Date', 'Present Member IDs', 'Present Member Names']],
    },
  ];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: rangesData,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to initialize spreadsheet headers: ${errText}`);
  }
}

export async function syncToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  members: Member[],
  activities: Activity[],
  sessions: AttendanceSession[]
): Promise<void> {
  // 1. Clear existing ranges to prevent old data ghosting
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Members!A2:G1000:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Activities!A2:C1000:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sessions!A2:E1000:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 2. Prepare values (replacing Gender with Access Code)
  const membersValues = members.map((m) => [
    m.id,
    m.title,
    m.name,
    m.isSick ? 'TRUE' : 'FALSE',
    m.isVisible ? 'TRUE' : 'FALSE',
    m.role,
    m.accessCode,
  ]);

  const activitiesValues = activities.map((a) => [a.id, a.name, a.dayOfWeek]);

  const sessionsValues = sessions.map((s) => {
    // Present member list
    const presentIds = s.records
      .filter((r) => r.status === 'Present' || r.isSickAtTime)
      .map((r) => r.memberId);

    // Names lookup
    const presentNames = presentIds
      .map((id) => {
        const found = members.find((m) => m.id === id);
        return found ? `${found.title}. ${found.name}` : id;
      })
      .join(', ');

    return [s.id, s.activityName, s.date, presentIds.join(','), presentNames];
  });

  const rangesData = [];
  if (membersValues.length > 0) {
    rangesData.push({ range: 'Members!A2', values: membersValues });
  }
  if (activitiesValues.length > 0) {
    rangesData.push({ range: 'Activities!A2', values: activitiesValues });
  }
  if (sessionsValues.length > 0) {
    rangesData.push({ range: 'Sessions!A2', values: sessionsValues });
  }

  if (rangesData.length === 0) return;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: rangesData,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to sync to Google Sheet: ${errText}`);
  }
}

export interface SpreadsheetDataImport {
  members: Member[];
  activities: Activity[];
  sessions: AttendanceSession[];
}

export async function importFromSpreadsheet(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetDataImport> {
  const ranges = ['Members!A2:G1000', 'Activities!A2:C1000', 'Sessions!A2:E1000'];
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${ranges.join('&ranges=')}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to import from Google Sheet: ${errText}`);
  }

  const data = await response.json();
  const valueRanges = data.valueRanges || [];

  const membersRows = valueRanges[0]?.values || [];
  const activitiesRows = valueRanges[1]?.values || [];
  const sessionsRows = valueRanges[2]?.values || [];

  // Helper to generate 7-digit access codes for imported members if they don't have one
  const generateCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 7; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Parse Members (without gender)
  const members: Member[] = membersRows.map((row: any) => ({
    id: row[0] || Math.random().toString(),
    title: (row[1] || 'Bro') as any,
    name: row[2] || 'Unnamed Member',
    isSick: row[3] === 'TRUE',
    isVisible: row[4] !== 'FALSE',
    role: (row[5] || 'member') as any,
    accessCode: row[6] || generateCode(),
  }));

  // Parse Activities
  const activities: Activity[] = activitiesRows.map((row: any) => ({
    id: row[0] || Math.random().toString(),
    name: row[1] || 'Unnamed Service',
    dayOfWeek: row[2] || 'Sunday',
  }));

  // Parse Sessions
  const sessions: AttendanceSession[] = sessionsRows.map((row: any) => {
    const sessionId = row[0] || Math.random().toString();
    const activityName = row[1] || 'Service';
    const date = row[2] || new Date().toISOString().split('T')[0];
    const presentIds = row[3] ? row[3].split(',') : [];

    // Reconstruct records: every member not in presentIds is Absent, else Present
    const records: AttendanceRecord[] = members.map((m) => {
      const isPresent = presentIds.includes(m.id);
      return {
        memberId: m.id,
        status: isPresent ? 'Present' : 'Absent',
        isSickAtTime: isPresent && m.isSick, // fallback
      };
    });

    // Find if we can match an activityId
    const matchingAct = activities.find((a) => a.name === activityName);

    return {
      id: sessionId,
      activityId: matchingAct?.id || 'imported-act',
      activityName,
      date,
      records,
    };
  });

  return { members, activities, sessions };
}

// ==========================================
// GOOGLE CALENDAR API INTEGRATION
// ==========================================

export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description: string;
    startDateTime: string; // ISO String
    endDateTime: string; // ISO String
  }
): Promise<string> {
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description,
      start: {
        dateTime: event.startDateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.endDateTime,
        timeZone: 'UTC',
      },
      reminders: {
        useDefault: true,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to schedule Calendar event: ${errText}`);
  }

  const data = await response.json();
  return data.htmlLink || '';
}
