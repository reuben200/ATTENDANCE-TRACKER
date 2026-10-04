export type MemberTitle = 'Sis' | 'Bro';
export type UserRole = 'Admin' | 'Secretary' | 'Member';

export interface Activity {
  id: string;
  name: string;
  dayOfWeek: string; // e.g., 'Sunday', 'Tuesday', 'Friday', '1st Saturday', '2nd Saturday'
}

export type OutreachStatus = 'none' | 'pending' | 'contacted' | 'resolved';

export interface Member {
  id: string;
  title: MemberTitle;
  name: string;
  isSick: boolean; // If true, assumed present in calculations
  isVisible: boolean; // Toggled by eye icon, if false, not shown in attendance sheet
  role: 'member' | 'admin' | 'secretary'; // Default 'member'
  accessCode: string; // 7-character auto-generated alphanumeric code
  phone?: string; // e.g. "+234 801 234 5678"
  email?: string; // e.g. "member@example.com"
  address?: string; // Residential address or fellowship center
  outreachStatus?: OutreachStatus;
  outreachNotes?: string;
  birthday?: string; // format 'MM-DD', e.g. '07-14'
  avatarUrl?: string; // Base64 or cloud storage URL for member photo
}

export interface HouseFellowshipNotice {
  id: 'house_fellowship';
  topic: string; // Host name
  date: string;
  time: string;
  host: string; // Moderator name
  address: string; // Fellowship center address
  lastUpdatedBy?: string;
  hostPhone?: string; // Host contact phone pre-filled from member database
  hostEmail?: string; // Host email pre-filled from member database
  hostMemberId?: string; // Associated member ID
  hostDetails?: string; // Any special instructions or fellowship notes
}

export interface AttendanceRecord {
  memberId: string;
  status: 'Present' | 'Absent';
  isSickAtTime?: boolean; // Captured status when attendance was taken
}

export interface AttendanceSession {
  id: string;
  activityId: string;
  activityName: string; // Snapshotted activity name
  date: string; // YYYY-MM-DD
  records: AttendanceRecord[];
}
