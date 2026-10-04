import { Member, AttendanceSession, Activity } from './types';

export interface ActivitySummary {
  activityId: string;
  activityName: string;
  noHeld: number;
  noPresent: number;
  percentage: number;
  remark: string;
}

export interface MemberAttendanceStats {
  combinedPercentage: number;
  summaries: ActivitySummary[];
}

export const getRemark = (percentage: number, noHeld: number, noPresent: number): string => {
  if (noHeld === 0) return 'No sessions';
  if (noPresent === 0) return 'Zero attendance (0)';
  if (percentage <= 30) return 'Very Poor (0-30%)';
  if (percentage <= 49) return 'Poor (30-49%)';
  if (percentage <= 59) return 'Fair (50-59%)';
  if (percentage <= 79) return 'Good (60-79%)';
  if (percentage <= 89) return 'Very Good (80-89%)';
  return 'Excellent (>=90%)';
};

export const calculateMemberStats = (
  member: Member,
  activities: Activity[],
  sessions: AttendanceSession[]
): MemberAttendanceStats => {
  const summaries: ActivitySummary[] = activities.map((activity) => {
    // Sessions held for this activity
    const activitySessions = sessions.filter((s) => s.activityId === activity.id);
    const noHeld = activitySessions.length;

    let noPresent = 0;
    activitySessions.forEach((session) => {
      // Find the record for this member in this session
      const record = session.records.find((r) => r.memberId === member.id);
      
      // If member is currently marked as Sick globally, they are assumed to be present
      if (member.isSick) {
        noPresent++;
      } else if (record) {
        if (record.status === 'Present' || record.isSickAtTime) {
          noPresent++;
        }
      }
    });

    const percentage = noHeld > 0 ? Math.round((noPresent / noHeld) * 100) : 0;
    const remark = getRemark(percentage, noHeld, noPresent);

    return {
      activityId: activity.id,
      activityName: activity.name,
      noHeld,
      noPresent,
      percentage,
      remark,
    };
  });

  // Calculate combined attendance
  // Total sessions held across all activities
  const totalHeld = summaries.reduce((sum, s) => sum + s.noHeld, 0);
  const totalPresent = summaries.reduce((sum, s) => sum + s.noPresent, 0);
  const combinedPercentage = totalHeld > 0 ? Math.round((totalPresent / totalHeld) * 100) : 100;

  return {
    combinedPercentage,
    summaries,
  };
};

export const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-rose-500 text-rose-50 border-rose-600',
    'bg-emerald-500 text-emerald-50 border-emerald-600',
    'bg-sky-500 text-sky-50 border-sky-600',
    'bg-amber-500 text-amber-50 border-amber-600',
    'bg-violet-500 text-violet-50 border-violet-600',
    'bg-indigo-500 text-indigo-50 border-indigo-600',
    'bg-fuchsia-500 text-fuchsia-50 border-fuchsia-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export interface WeekDayInfo {
  date: Date;
  mmDd: string; // 'MM-DD'
  dayName: string; // 'Monday', 'Tuesday', etc.
  shortDayName: string; // 'Mon', 'Tue', etc.
  formattedDate: string; // 'Aug 31'
  formattedFullDate: string; // 'Monday, Aug 31'
  dayNumber: number; // 31
  isToday: boolean;
  isTomorrow: boolean;
  daysDiff: number; // 0 = today, 1 = tomorrow, -1 = yesterday, etc.
}

export interface WeekCelebrant {
  member: Member;
  dayInfo: WeekDayInfo;
}

export interface WeekBirthdaySummary {
  startDate: Date;
  endDate: Date;
  formattedRange: string; // e.g. "Aug 31 – Sep 6, 2026"
  weekOffset: number; // 0 = current week, 1 = next week, -1 = last week
  isCurrentWeek: boolean;
  days: WeekDayInfo[];
  celebrants: WeekCelebrant[];
  todayCelebrants: WeekCelebrant[];
  tomorrowCelebrants: WeekCelebrant[];
  upcomingCelebrants: WeekCelebrant[];
  pastCelebrants: WeekCelebrant[];
}

export const getWeekBirthdaySummary = (
  members: Member[],
  weekOffset: number = 0,
  weekStart: 'monday' | 'sunday' = 'monday'
): WeekBirthdaySummary => {
  const now = new Date();
  // Standardize now to midnight
  const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentDayOfWeek = baseDate.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday

  let diffToStart = 0;
  if (weekStart === 'monday') {
    diffToStart = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  } else {
    diffToStart = -currentDayOfWeek;
  }

  const startOfWeek = new Date(baseDate);
  startOfWeek.setDate(baseDate.getDate() + diffToStart + weekOffset * 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNamesFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days: WeekDayInfo[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);

    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const mmDd = `${mm}-${dd}`;

    const diffTime = d.getTime() - baseDate.getTime();
    const daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const isToday = daysDiff === 0;
    const isTomorrow = daysDiff === 1;

    days.push({
      date: d,
      mmDd,
      dayName: dayNamesFull[d.getDay()],
      shortDayName: dayNamesShort[d.getDay()],
      formattedDate: `${monthNamesShort[d.getMonth()]} ${d.getDate()}`,
      formattedFullDate: `${dayNamesFull[d.getDay()]}, ${monthNamesShort[d.getMonth()]} ${d.getDate()}`,
      dayNumber: d.getDate(),
      isToday,
      isTomorrow,
      daysDiff,
    });
  }

  const endOfWeek = days[6].date;
  const startMonth = monthNamesShort[startOfWeek.getMonth()];
  const endMonth = monthNamesShort[endOfWeek.getMonth()];
  const startYear = startOfWeek.getFullYear();
  const endYear = endOfWeek.getFullYear();

  let formattedRange = '';
  if (startYear === endYear) {
    if (startMonth === endMonth) {
      formattedRange = `${startMonth} ${startOfWeek.getDate()} – ${endOfWeek.getDate()}, ${startYear}`;
    } else {
      formattedRange = `${startMonth} ${startOfWeek.getDate()} – ${endMonth} ${endOfWeek.getDate()}, ${startYear}`;
    }
  } else {
    formattedRange = `${startMonth} ${startOfWeek.getDate()}, ${startYear} – ${endMonth} ${endOfWeek.getDate()}, ${endYear}`;
  }

  // Find celebrants for this week
  const celebrants: WeekCelebrant[] = [];

  days.forEach((dayInfo) => {
    // Check members with active birthday matching this day's mmDd
    const matchingMembers = members.filter((m) => m.birthday === dayInfo.mmDd);
    matchingMembers.forEach((member) => {
      celebrants.push({
        member,
        dayInfo,
      });
    });
  });

  // Sort celebrants chronologically across the week
  celebrants.sort((a, b) => a.dayInfo.date.getTime() - b.dayInfo.date.getTime());

  const todayCelebrants = celebrants.filter((c) => c.dayInfo.isToday);
  const tomorrowCelebrants = celebrants.filter((c) => c.dayInfo.isTomorrow);
  const upcomingCelebrants = celebrants.filter((c) => c.dayInfo.daysDiff > 0);
  const pastCelebrants = celebrants.filter((c) => c.dayInfo.daysDiff < 0);

  return {
    startDate: startOfWeek,
    endDate: endOfWeek,
    formattedRange,
    weekOffset,
    isCurrentWeek: weekOffset === 0,
    days,
    celebrants,
    todayCelebrants,
    tomorrowCelebrants,
    upcomingCelebrants,
    pastCelebrants,
  };
};
