import React, { useState } from 'react';
import { Member, Activity, AttendanceSession } from '../types';
import { calculateMemberStats, getWeekBirthdaySummary } from '../utils';
import {
  TrendingUp,
  Users,
  HeartPulse,
  Sparkles,
  Calendar,
  Clock,
  Download,
  Cake,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  Edit3,
  Check,
  X,
  HeartHandshake,
  Gift,
  Search,
  ChevronLeft,
  ChevronRight,
  Bell,
} from 'lucide-react';

interface AdminDashboardProps {
  members: Member[];
  activities: Activity[];
  sessions: AttendanceSession[];
  onSelectMember?: (member: Member) => void;
  onUpdateMember?: (id: string, updates: Partial<Member>) => void;
  onNavigateToEditSession?: (sessionId: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  members,
  activities,
  sessions,
  onSelectMember,
  onUpdateMember,
  onNavigateToEditSession,
}) => {
  // Date calculations
  const now = new Date();
  const currentMonthNumber = now.getMonth() + 1; // 1-12
  const currentMonthStr = String(currentMonthNumber).padStart(2, '0');
  const currentDayNumber = now.getDate();

  const [selectedBirthdayMonth, setSelectedBirthdayMonth] = useState<string>(currentMonthStr);
  const [birthdayViewMode, setBirthdayViewMode] = useState<'week' | 'month'>('week');
  const [adminWeekOffset, setAdminWeekOffset] = useState(0);
  const [editingContactMemberId, setEditingContactMemberId] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // 1. Calculate General Aggregates
  const totalMembers = members.length;
  const visibleMembersCount = members.filter((m) => m.isVisible).length;
  const sickMembers = members.filter((m) => m.isSick);
  const sickMembersCount = sickMembers.length;

  // Calculate Average Attendance Percentage across all sessions
  let totalRecordCount = 0;
  let totalPresentCount = 0;

  sessions.forEach((session) => {
    session.records.forEach((record) => {
      const member = members.find((m) => m.id === record.memberId);
      const isPresent = record.status === 'Present' || record.isSickAtTime || (member && member.isSick);
      
      totalRecordCount++;
      if (isPresent) {
        totalPresentCount++;
      }
    });
  });

  const overallAttendanceRate = totalRecordCount > 0 ? Math.round((totalPresentCount / totalRecordCount) * 100) : 100;

  // Function to export complete attendance roster to CSV
  const handleExportAllCSV = () => {
    const activityHeaders = activities.map(a => `${a.name} (%)`);
    const headers = [
      'Member ID',
      'Title',
      'Name',
      'Access Code',
      'Role',
      'Phone',
      'Email',
      'Address',
      'Birthday',
      'Sickness Status',
      'Care Notes',
      'Combined Attendance Rate (%)',
      'Total Sessions Held',
      'Total Sessions Present',
      ...activityHeaders
    ];

    const rows = members.map((member) => {
      const stats = calculateMemberStats(member, activities, sessions);
      const totalHeld = stats.summaries.reduce((sum, s) => sum + s.noHeld, 0);
      const totalPresent = stats.summaries.reduce((sum, s) => sum + s.noPresent, 0);

      const activityPercentages = activities.map((activity) => {
        const found = stats.summaries.find(s => s.activityId === activity.id);
        return found && found.noHeld > 0 ? `${found.percentage}%` : '—';
      });

      return [
        member.id,
        member.title,
        member.name,
        member.accessCode,
        member.role.toUpperCase(),
        member.phone || '',
        member.email || '',
        member.address || '',
        member.birthday || '',
        member.isSick ? 'Sick (Excused)' : 'Active',
        member.outreachNotes || '',
        `${stats.combinedPercentage}%`,
        totalHeld.toString(),
        totalPresent.toString(),
        ...activityPercentages
      ];
    });

    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${(val || '').replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Congregation_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Calculate average attendance per activity type
  const activityStats = activities.map((activity) => {
    const actSessions = sessions.filter((s) => s.activityId === activity.id);
    let totalActRecords = 0;
    let totalActPresent = 0;

    actSessions.forEach((session) => {
      session.records.forEach((record) => {
        const member = members.find((m) => m.id === record.memberId);
        const isPresent = record.status === 'Present' || record.isSickAtTime || (member && member.isSick);
        totalActRecords++;
        if (isPresent) {
          totalActPresent++;
        }
      });
    });

    const rate = totalActRecords > 0 ? Math.round((totalActPresent / totalActRecords) * 100) : 0;

    return {
      id: activity.id,
      name: activity.name,
      day: activity.dayOfWeek,
      held: actSessions.length,
      rate,
    };
  });

  const topPerforming = [...activityStats].sort((a, b) => b.rate - a.rate)[0];

  // 3. Chronological Sessions for line chart (up to 5 recent)
  const sortedSessions = [...sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-5);

  const trendData = sortedSessions.map((session) => {
    let sessionPresent = 0;
    session.records.forEach((record) => {
      const member = members.find((m) => m.id === record.memberId);
      const isPresent = record.status === 'Present' || record.isSickAtTime || (member && member.isSick);
      if (isPresent) {
        sessionPresent++;
      }
    });

    const rate = session.records.length > 0 ? Math.round((sessionPresent / session.records.length) * 100) : 0;

    return {
      id: session.id,
      date: session.date,
      name: session.activityName,
      rate,
    };
  });

  // Demographics stats
  const broCount = members.filter((m) => m.title === 'Bro').length;
  const sisCount = members.filter((m) => m.title === 'Sis').length;
  const broPct = totalMembers > 0 ? Math.round((broCount / totalMembers) * 100) : 0;
  const sisPct = totalMembers > 0 ? Math.round((sisCount / totalMembers) * 100) : 0;

  // Weekly Birthday Summary Calculation
  const adminWeekSummary = getWeekBirthdaySummary(members, adminWeekOffset, 'monday');

  // Birthday Processing for Selected Month
  const targetMonthNum = parseInt(selectedBirthdayMonth, 10);
  const targetMonthName = MONTH_NAMES[targetMonthNum - 1] || 'Current Month';
  const isViewingCurrentMonth = selectedBirthdayMonth === currentMonthStr;

  const monthBirthdays = members
    .filter((m) => {
      if (!m.birthday || !m.birthday.includes('-')) return false;
      const [mm] = m.birthday.split('-');
      return mm === selectedBirthdayMonth;
    })
    .map((m) => {
      const parts = m.birthday!.split('-');
      const day = parseInt(parts[1], 10) || 1;
      const isToday = isViewingCurrentMonth && day === currentDayNumber;
      const isUpcoming = isViewingCurrentMonth && day > currentDayNumber;
      const isPassed = isViewingCurrentMonth && day < currentDayNumber;
      const daysAway = isViewingCurrentMonth ? day - currentDayNumber : null;

      return {
        member: m,
        day,
        formattedDate: `${targetMonthName} ${day}`,
        isToday,
        isUpcoming,
        isPassed,
        daysAway,
      };
    })
    .sort((a, b) => a.day - b.day);

  // Group birthdays into today, upcoming, and earlier
  const todaysBirthdays = monthBirthdays.filter((b) => b.isToday);
  const upcomingBirthdays = monthBirthdays.filter((b) => !b.isToday && (b.isUpcoming || !isViewingCurrentMonth));
  const pastBirthdays = monthBirthdays.filter((b) => b.isPassed);

  // Handlers for Inline Edit Contact Info
  const handleStartEditContact = (member: Member) => {
    setEditingContactMemberId(member.id);
    setEditPhone(member.phone || '');
    setEditEmail(member.email || '');
    setEditAddress(member.address || '');
    setEditNotes(member.outreachNotes || '');
  };

  const handleSaveContact = (id: string) => {
    if (onUpdateMember) {
      onUpdateMember(id, {
        phone: editPhone.trim(),
        email: editEmail.trim(),
        address: editAddress.trim(),
        outreachNotes: editNotes.trim(),
      });
      setSaveSuccessMsg(`Contact info updated for member`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
    setEditingContactMemberId(null);
  };

  const handleToggleSickStatus = (member: Member) => {
    if (onUpdateMember) {
      const newStatus = !member.isSick;
      onUpdateMember(member.id, { isSick: newStatus });
      setSaveSuccessMsg(
        newStatus
          ? `${member.title}. ${member.name} marked as sick (excused).`
          : `${member.title}. ${member.name} marked as recovered & active.`
      );
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  return (
    <div id="admin-dashboard-root" className="space-y-8">
      {/* Dashboard Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E4DD] pb-4">
        <div>
          <h2 className="text-xl font-serif font-bold tracking-tight text-[#3D3D33] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#5A5A40]" />
            Executive Attendance & Pastoral Dashboard
          </h2>
          <p className="text-sm text-[#7A7A66]">
            Congregational metrics, pastoral sickness care records, and upcoming monthly celebrations.
          </p>
        </div>
        <button
          id="btn-export-all-csv"
          onClick={handleExportAllCSV}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-[#5A5A40] bg-white hover:bg-[#FAF9F6] border border-[#C8C8A9] rounded-xl transition-all cursor-pointer shadow-sm shrink-0"
          title="Export complete congregation roster attendance to CSV"
        >
          <Download className="w-3.5 h-3.5" />
          Export All Attendance (CSV)
        </button>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="bg-[#FAF9F6] border border-[#5A5A40] text-[#5A5A40] text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#5A5A40] shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="bg-white rounded-xl border border-[#E6E4DD] shadow-sm p-5 flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider">
              Total Members
            </p>
            <p id="bento-total-members" className="text-3xl font-extrabold text-[#3D3D33]">
              {totalMembers}
            </p>
            <p className="text-xs text-[#7A7A66]">
              {visibleMembersCount} visible • {totalMembers - visibleMembersCount} hidden
            </p>
          </div>
          <div className="p-3 bg-[#FAF9F6] text-[#5A5A40] rounded-xl border border-[#E6E4DD]">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Attendance Index */}
        <div className="bg-white rounded-xl border border-[#E6E4DD] shadow-sm p-5 flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider">
              Attendance Index
            </p>
            <p id="bento-overall-rate" className="text-3xl font-extrabold text-[#5A5A40]">
              {overallAttendanceRate}%
            </p>
            <p className="text-xs text-[#7A7A66]">
              Combined average of all sessions
            </p>
          </div>
          <div className="p-3 bg-[#F5F2ED] text-[#5A5A40] rounded-xl border border-[#E6E4DD]">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Active Sickness Log */}
        <div className="bg-white rounded-xl border border-[#E6E4DD] shadow-sm p-5 flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider">
              Active Sickness Log
            </p>
            <p id="bento-sick-count" className="text-3xl font-extrabold text-[#B25E5E]">
              {sickMembersCount}
            </p>
            <p className="text-xs text-[#7A7A66]">
              {sickMembersCount === 0 ? 'All members healthy' : `${sickMembersCount} on medical leave`}
            </p>
          </div>
          <div className="p-3 bg-[#FDF2F2] text-[#B25E5E] rounded-xl border border-[#FAD2D2]">
            <HeartPulse className="w-5 h-5" />
          </div>
        </div>

        {/* Highest Attendance Program */}
        <div className="bg-white rounded-xl border border-[#E6E4DD] shadow-sm p-5 flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider">
              Highest Attendance Rate
            </p>
            <p id="bento-top-activity" className="text-xl font-extrabold text-[#3D3D33] truncate max-w-[150px]">
              {topPerforming ? topPerforming.name : '—'}
            </p>
            <p className="text-xs text-[#7A7A66]">
              Avg Rate: {topPerforming ? `${topPerforming.rate}%` : '0%'}
            </p>
          </div>
          <div className="p-3 bg-[#FAF9F6] text-[#D4A373] rounded-xl border border-[#E6E4DD]">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DEDICATED SICK MEMBERS SECTION WITH CONTACT INFORMATION */}
      {/* ========================================================================= */}
      <div id="admin-sick-members-section" className="bg-white rounded-2xl border border-[#E6E4DD] shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#E6E4DD] bg-[#FAF9F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FDF2F2] text-[#B25E5E] border border-[#FAD2D2] rounded-xl">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-serif font-bold text-[#3D3D33]">
                  Pastoral Care & Sickness Registry
                </h3>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  sickMembersCount > 0
                    ? 'bg-[#FDF2F2] text-[#B25E5E] border-[#FAD2D2]'
                    : 'bg-[#F5F2ED] text-[#5A5A40] border-[#E6E4DD]'
                }`}>
                  {sickMembersCount} {sickMembersCount === 1 ? 'Member' : 'Members'} Currently Sick
                </span>
              </div>
              <p className="text-xs text-[#7A7A66] mt-0.5">
                Members marked as sick are excused from attendance and highlighted here with direct pastoral contact channels.
              </p>
            </div>
          </div>

          {sickMembersCount > 0 && (
            <span className="text-[11px] font-semibold text-[#B25E5E] bg-white border border-[#FAD2D2] px-3 py-1 rounded-lg self-start sm:self-auto">
              Auto-Excused as Present
            </span>
          )}
        </div>

        <div className="p-5 sm:p-6">
          {sickMembersCount === 0 ? (
            <div className="py-8 px-4 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#E6E4DD] text-[#5A5A40] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#3D3D33]">
                  No Members Currently Reported Sick
                </h4>
                <p className="text-xs text-[#7A7A66] mt-1 leading-relaxed">
                  All registered congregation members are currently marked in good health. When any member falls ill or requests medical leave, mark them as sick in the Attendance sheet or Member Registry to coordinate pastoral support here.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sickMembers.map((member) => {
                const isEditing = editingContactMemberId === member.id;
                const cleanPhone = (member.phone || '').replace(/[^0-9+]/g, '');

                return (
                  <div
                    key={member.id}
                    id={`sick-member-card-${member.id}`}
                    className="bg-white rounded-xl border border-[#FAD2D2] shadow-sm p-4 space-y-3.5 hover:border-[#B25E5E]/40 transition-colors"
                  >
                    {/* Header: Member Avatar + Name + Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full border-2 border-[#FAD2D2] bg-[#FAF9F6] text-[#5A5A40] font-bold text-sm flex items-center justify-center overflow-hidden shrink-0">
                          {member.avatarUrl || localStorage.getItem(`avatar_${member.id}`) ? (
                            <img
                              src={member.avatarUrl || localStorage.getItem(`avatar_${member.id}`) || ''}
                              alt={member.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            member.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-[#3D3D33]">
                              {member.title}. {member.name}
                            </h4>
                            <span className="text-[9px] font-mono uppercase bg-[#FDF2F2] text-[#B25E5E] border border-[#FAD2D2] px-1.5 py-0.2 rounded font-extrabold">
                              Sick
                            </span>
                          </div>
                          <p className="text-[11px] text-[#7A7A66]">
                            Code: <span className="font-mono font-semibold text-[#5A5A40]">{member.accessCode}</span> • Role: <span className="capitalize">{member.role}</span>
                          </p>
                        </div>
                      </div>

                      {/* Recovered toggle button */}
                      <button
                        onClick={() => handleToggleSickStatus(member)}
                        className="text-[11px] font-bold text-[#5A5A40] bg-[#FAF9F6] hover:bg-[#F5F2ED] border border-[#C8C8A9] px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs shrink-0"
                        title="Mark member as fully recovered"
                      >
                        <Check className="w-3 h-3 text-[#5A5A40]" />
                        <span>Recovered</span>
                      </button>
                    </div>

                    {/* Contact Information Block */}
                    {!isEditing ? (
                      <div className="space-y-2 bg-[#FAF9F6] p-3 rounded-lg border border-[#E6E4DD] text-xs">
                        {/* Phone */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-[#3D3D33] min-w-0">
                            <Phone className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
                            <span className="font-mono text-xs truncate">
                              {member.phone || <span className="text-[#7A7A66] italic font-sans">No phone number recorded</span>}
                            </span>
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={`tel:${cleanPhone}`}
                                className="px-2 py-0.5 bg-white text-[#5A5A40] hover:bg-[#5A5A40] hover:text-white border border-[#C8C8A9] rounded text-[10px] font-bold transition-colors inline-flex items-center gap-1"
                                title="Call member"
                              >
                                <Phone className="w-2.5 h-2.5" />
                                Call
                              </a>
                              <a
                                href={`https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(
                                  `Dear ${member.title}. ${member.name}, the congregation is praying for your quick recovery and God's healing grace.`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 bg-[#25D366] text-white hover:bg-[#20b859] rounded text-[10px] font-bold transition-colors inline-flex items-center gap-1"
                                title="Chat on WhatsApp"
                              >
                                <MessageSquare className="w-2.5 h-2.5" />
                                WhatsApp
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Email */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-[#3D3D33] min-w-0">
                            <Mail className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
                            <span className="text-xs truncate">
                              {member.email || <span className="text-[#7A7A66] italic">No email address</span>}
                            </span>
                          </div>
                          {member.email && (
                            <a
                              href={`mailto:${member.email}?subject=${encodeURIComponent(
                                `Praying for your recovery - Church of Christ`
                              )}`}
                              className="px-2 py-0.5 bg-white text-[#5A5A40] hover:bg-[#5A5A40] hover:text-white border border-[#C8C8A9] rounded text-[10px] font-bold transition-colors inline-flex items-center gap-1 shrink-0"
                            >
                              <Mail className="w-2.5 h-2.5" />
                              Email
                            </a>
                          )}
                        </div>

                        {/* Address */}
                        {member.address && (
                          <div className="flex items-start gap-2 text-[#3D3D33] pt-0.5 border-t border-[#E6E4DD]">
                            <MapPin className="w-3.5 h-3.5 text-[#7A7A66] mt-0.5 shrink-0" />
                            <span className="text-[11px] text-[#555544]">{member.address}</span>
                          </div>
                        )}

                        {/* Care & Outreach Notes */}
                        {member.outreachNotes && (
                          <div className="pt-1.5 border-t border-[#E6E4DD]">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A7A66] mb-0.5 flex items-center gap-1">
                              <HeartHandshake className="w-3 h-3 text-[#B25E5E]" />
                              Pastoral Care Notes:
                            </p>
                            <p className="text-[11px] text-[#3D3D33] italic bg-white p-1.5 rounded border border-[#E6E4DD]">
                              "{member.outreachNotes}"
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Inline Contact Editor */
                      <div className="bg-[#FAF9F6] p-3 rounded-lg border border-[#5A5A40] space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold text-[#3D3D33]">Edit Contact & Care Information</p>
                          <button
                            onClick={() => setEditingContactMemberId(null)}
                            className="text-[#7A7A66] hover:text-[#3D3D33]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-[#7A7A66] uppercase mb-0.5">Phone</label>
                            <input
                              type="text"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              placeholder="+234 801 234 5678"
                              className="w-full text-xs px-2 py-1 bg-white border border-[#E6E4DD] rounded focus:outline-none focus:border-[#5A5A40]"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-[#7A7A66] uppercase mb-0.5">Email</label>
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="member@example.com"
                              className="w-full text-xs px-2 py-1 bg-white border border-[#E6E4DD] rounded focus:outline-none focus:border-[#5A5A40]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-[#7A7A66] uppercase mb-0.5">Residential Address</label>
                          <input
                            type="text"
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            placeholder="Residential location or center"
                            className="w-full text-xs px-2 py-1 bg-white border border-[#E6E4DD] rounded focus:outline-none focus:border-[#5A5A40]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-[#7A7A66] uppercase mb-0.5">Pastoral & Sickness Notes</label>
                          <textarea
                            rows={2}
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Condition, hospital visit details, prayer requests..."
                            className="w-full text-xs px-2 py-1 bg-white border border-[#E6E4DD] rounded focus:outline-none focus:border-[#5A5A40]"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingContactMemberId(null)}
                            className="px-2.5 py-1 text-xs text-[#7A7A66] hover:bg-[#E6E4DD] rounded"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveContact(member.id)}
                            className="px-3 py-1 bg-[#5A5A40] text-white text-xs font-bold rounded hover:bg-[#4E4E37] flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Save Info
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#FAD2D2]/60">
                      <button
                        onClick={() => handleStartEditContact(member)}
                        className="text-[11px] font-semibold text-[#5A5A40] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        {isEditing ? 'Close Editor' : 'Update Contact & Notes'}
                      </button>

                      {onSelectMember && (
                        <button
                          onClick={() => onSelectMember(member)}
                          className="text-[11px] font-bold text-[#3D3D33] hover:text-[#5A5A40] flex items-center gap-1 cursor-pointer"
                        >
                          <span>Full Attendance Profile</span>
                          <ExternalLink className="w-3 h-3 text-[#7A7A66]" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MEMBER BIRTHDAYS REGISTRY & WEEKLY TRACKER */}
      {/* ========================================================================= */}
      <div id="admin-birthdays-section" className="bg-white rounded-2xl border border-[#E6E4DD] shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#E6E4DD] bg-[#FAF9F6] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FAF9F6] text-[#D4A373] border border-[#E6E4DD] rounded-xl">
              <Cake className="w-5 h-5 text-[#D4A373]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-serif font-bold text-[#3D3D33]">
                  {birthdayViewMode === 'week'
                    ? adminWeekOffset === 0
                      ? 'Birthdays Coming Up This Week'
                      : adminWeekOffset === 1
                      ? 'Birthdays Coming Up Next Week'
                      : 'Birthdays for Week'
                    : `Member Birthdays — ${targetMonthName} ${now.getFullYear()}`}
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FAF9F6] text-[#5A5A40] border border-[#E6E4DD]">
                  {birthdayViewMode === 'week'
                    ? `${adminWeekSummary.celebrants.length} ${adminWeekSummary.celebrants.length === 1 ? 'Celebrant' : 'Celebrants'}`
                    : `${monthBirthdays.length} ${monthBirthdays.length === 1 ? 'Celebrant' : 'Celebrants'}`}
                </span>
              </div>
              <p className="text-xs text-[#7A7A66] mt-0.5">
                {birthdayViewMode === 'week'
                  ? `Week of ${adminWeekSummary.formattedRange}`
                  : 'Celebrate congregation members on their special day with warm fellowship & prayers.'}
              </p>
            </div>
          </div>

          {/* View Mode Toggle & Navigation */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* View Mode Segmented Switch */}
            <div className="flex items-center p-1 bg-[#E6E4DD]/60 rounded-xl border border-[#E6E4DD]">
              <button
                type="button"
                onClick={() => setBirthdayViewMode('week')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  birthdayViewMode === 'week'
                    ? 'bg-white text-[#3D3D33] shadow-xs'
                    : 'text-[#7A7A66] hover:text-[#3D3D33]'
                }`}
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => setBirthdayViewMode('month')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  birthdayViewMode === 'month'
                    ? 'bg-white text-[#3D3D33] shadow-xs'
                    : 'text-[#7A7A66] hover:text-[#3D3D33]'
                }`}
              >
                Monthly
              </button>
            </div>

            {/* Context Controls */}
            {birthdayViewMode === 'week' ? (
              <div className="flex items-center gap-1">
                {adminWeekOffset !== 0 && (
                  <button
                    type="button"
                    onClick={() => setAdminWeekOffset(0)}
                    className="text-[11px] font-bold text-[#5A5A40] bg-white hover:bg-[#FAF9F6] border border-[#C8C8A9] px-2 py-1 rounded-lg transition-all cursor-pointer shadow-xs"
                  >
                    Current Week
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAdminWeekOffset((prev) => prev - 1)}
                  className="p-1 bg-white hover:bg-[#FAF9F6] border border-[#E6E4DD] text-[#7A7A66] hover:text-[#3D3D33] rounded-lg transition-colors cursor-pointer"
                  title="Previous Week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAdminWeekOffset((prev) => prev + 1)}
                  className="p-1 bg-white hover:bg-[#FAF9F6] border border-[#E6E4DD] text-[#7A7A66] hover:text-[#3D3D33] rounded-lg transition-colors cursor-pointer"
                  title="Next Week"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <select
                  id="birthday-month-select"
                  value={selectedBirthdayMonth}
                  onChange={(e) => setSelectedBirthdayMonth(e.target.value)}
                  className="text-xs font-bold px-3 py-1.5 bg-white border border-[#E6E4DD] rounded-lg text-[#3D3D33] focus:outline-none focus:border-[#5A5A40] cursor-pointer shadow-xs"
                >
                  {MONTH_NAMES.map((name, index) => {
                    const monthVal = String(index + 1).padStart(2, '0');
                    const isCurrent = monthVal === currentMonthStr;
                    return (
                      <option key={monthVal} value={monthVal}>
                        {name} {isCurrent ? '(Current Month)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* ======================= */}
          {/* A. WEEKLY VIEW MODE */}
          {/* ======================= */}
          {birthdayViewMode === 'week' ? (
            <div className="space-y-5">
              {/* 7-Day Visual Week Timeline Strip */}
              <div className="grid grid-cols-7 gap-1.5 bg-[#FAF9F6] p-2.5 rounded-xl border border-[#E6E4DD]">
                {adminWeekSummary.days.map((day) => {
                  const hasCelebrant = adminWeekSummary.celebrants.some((c) => c.dayInfo.mmDd === day.mmDd);
                  const isToday = day.isToday;
                  return (
                    <div
                      key={day.mmDd}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all ${
                        isToday
                          ? 'bg-[#5A5A40] text-white shadow-xs'
                          : hasCelebrant
                          ? 'bg-[#FDF2F2] border border-[#FAD2D2] text-[#B25E5E]'
                          : 'bg-white text-[#7A7A66] border border-[#E6E4DD]/60'
                      }`}
                    >
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${isToday ? 'text-white/80' : ''}`}>
                        {day.shortDayName}
                      </span>
                      <span className={`text-sm font-bold leading-tight ${isToday ? 'text-white' : 'text-[#3D3D33]'}`}>
                        {day.dayNumber}
                      </span>
                      {hasCelebrant ? (
                        <span className="text-[10px] leading-none pt-0.5" title="Birthday Celebrant!">
                          🎂
                        </span>
                      ) : (
                        <span className="text-[10px] text-transparent leading-none pt-0.5">•</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Weekly Celebrants Grid */}
              {adminWeekSummary.celebrants.length === 0 ? (
                <div className="py-10 px-4 text-center max-w-md mx-auto space-y-3 bg-[#FAF9F6]/50 rounded-xl border border-dashed border-[#E6E4DD]">
                  <div className="w-12 h-12 rounded-full bg-white border border-[#E6E4DD] text-[#D4A373] flex items-center justify-center mx-auto shadow-xs">
                    <Cake className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[#3D3D33]">
                      No Birthdays in the Week of {adminWeekSummary.formattedRange}
                    </h4>
                    <p className="text-xs text-[#7A7A66] leading-relaxed">
                      Check next week or switch to the Monthly view to see celebrants throughout the year.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdminWeekOffset((prev) => prev + 1)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5A5A40] hover:text-[#3D3D33] bg-white border border-[#C8C8A9] px-3.5 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    Check Next Week <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {adminWeekSummary.celebrants.map(({ member, dayInfo }) => {
                    const isToday = dayInfo.isToday;
                    const isTomorrow = dayInfo.isTomorrow;
                    const isPassed = dayInfo.daysDiff < 0;
                    const cleanPhone = (member.phone || '').replace(/[^0-9+]/g, '');

                    return (
                      <div
                        key={member.id}
                        id={`weekly-birthday-card-${member.id}`}
                        className={`rounded-xl border p-4 space-y-3 transition-all ${
                          isToday
                            ? 'bg-[#FDF2F2] border-[#FAD2D2] shadow-sm ring-2 ring-[#B25E5E]/20'
                            : isTomorrow
                            ? 'bg-[#FAF9F6] border-[#D4A373] shadow-xs'
                            : 'bg-white border-[#E6E4DD] hover:border-[#5A5A40]/40 shadow-xs'
                        }`}
                      >
                        {/* Header: Day & Status */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                              isToday
                                ? 'bg-[#B25E5E] text-white border-[#B25E5E]'
                                : isTomorrow
                                ? 'bg-[#D4A373] text-white border-[#D4A373]'
                                : 'bg-[#FAF9F6] text-[#5A5A40] border-[#C8C8A9]'
                            }`}
                          >
                            <Cake className="w-3 h-3" />
                            <span>{dayInfo.formattedFullDate}</span>
                          </span>

                          <span className="text-[10px] font-bold">
                            {isToday ? (
                              <span className="text-[#B25E5E] font-extrabold flex items-center gap-0.5">
                                <Sparkles className="w-3 h-3" /> Today!
                              </span>
                            ) : isTomorrow ? (
                              <span className="text-[#D4A373] font-bold flex items-center gap-0.5">
                                <Bell className="w-3 h-3" /> Tomorrow
                              </span>
                            ) : isPassed ? (
                              <span className="text-[#7A7A66]">Celebrated</span>
                            ) : (
                              <span className="text-[#5A5A40]">In {dayInfo.daysDiff} days</span>
                            )}
                          </span>
                        </div>

                        {/* Member Info */}
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full border border-[#E6E4DD] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden ${
                              isToday ? 'bg-[#B25E5E] text-white' : 'bg-[#FAF9F6] text-[#5A5A40]'
                            }`}
                          >
                            {member.avatarUrl || localStorage.getItem(`avatar_${member.id}`) ? (
                              <img
                                src={member.avatarUrl || localStorage.getItem(`avatar_${member.id}`) || ''}
                                alt={member.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              member.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-[#3D3D33] truncate">
                              {member.title}. {member.name}
                            </h4>
                            <p className="text-[10px] text-[#7A7A66] truncate">
                              {member.phone || member.email || 'Church Member'}
                            </p>
                          </div>
                        </div>

                        {/* Contact & Outreach Actions */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-[#E6E4DD] text-xs">
                          <div className="flex items-center gap-1.5">
                            {member.phone ? (
                              <>
                                <a
                                  href={`https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(
                                    `Happy Birthday ${member.title}. ${member.name}! 🎂🎉 May God grant you divine wisdom, health, and peace on your special day (${dayInfo.formattedFullDate})! - From Church of Christ`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 bg-[#25D366] text-white hover:bg-[#20b859] rounded text-[10px] font-bold inline-flex items-center gap-1 shadow-xs"
                                  title="Send WhatsApp greeting"
                                >
                                  <MessageSquare className="w-2.5 h-2.5" />
                                  WhatsApp
                                </a>
                                <a
                                  href={`tel:${cleanPhone}`}
                                  className="p-1 bg-white hover:bg-[#FAF9F6] border border-[#E6E4DD] text-[#5A5A40] rounded"
                                  title="Call celebrant"
                                >
                                  <Phone className="w-3 h-3" />
                                </a>
                              </>
                            ) : member.email ? (
                              <a
                                href={`mailto:${member.email}?subject=${encodeURIComponent('Happy Birthday!')}`}
                                className="px-2 py-1 bg-white hover:bg-[#FAF9F6] border border-[#E6E4DD] text-[#5A5A40] rounded text-[10px] font-bold inline-flex items-center gap-1"
                              >
                                <Mail className="w-2.5 h-2.5" />
                                Email
                              </a>
                            ) : (
                              <span className="text-[10px] text-[#7A7A66] italic">No contact info</span>
                            )}
                          </div>

                          {onSelectMember && (
                            <button
                              onClick={() => onSelectMember(member)}
                              className="text-[10px] font-bold text-[#5A5A40] hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>Profile</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ======================= */
            /* B. MONTHLY VIEW MODE */
            /* ======================= */
            <div className="space-y-5">
              {/* Today's Birthday Special Banner if any member has birthday today */}
              {todaysBirthdays.length > 0 && (
                <div className="bg-gradient-to-r from-[#FAF9F6] to-[#F5F2ED] border-2 border-[#D4A373] rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-[#5A5A40]">
                    <Gift className="w-5 h-5 text-[#D4A373]" />
                    <h4 className="text-sm font-bold tracking-tight uppercase tracking-wider text-[#3D3D33]">
                      🎉 Celebrating Today ({targetMonthName} {currentDayNumber})!
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {todaysBirthdays.map(({ member }) => {
                      const cleanPhone = (member.phone || '').replace(/[^0-9+]/g, '');
                      return (
                        <div
                          key={member.id}
                          className="bg-white p-3 rounded-lg border border-[#E6E4DD] flex items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-[#5A5A40] text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {member.avatarUrl ? (
                                <img src={member.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                              ) : (
                                member.name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#3D3D33] truncate">
                                {member.title}. {member.name}
                              </p>
                              <p className="text-[10px] text-[#5A5A40] font-semibold">
                                🎂 Happy Birthday!
                              </p>
                            </div>
                          </div>

                          {/* Quick Greeting Shortcuts */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {member.phone && (
                              <a
                                href={`https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(
                                  `Happy Birthday ${member.title}. ${member.name}! Wishing you God's richest blessings, good health, and peace on your special day! 🎉🎂`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-[#25D366] text-white hover:bg-[#20b859] rounded text-[11px] font-bold inline-flex items-center gap-1 shadow-xs"
                                title="Send WhatsApp Birthday Wishes"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Wish</span>
                              </a>
                            )}
                            {member.phone && (
                              <a
                                href={`tel:${cleanPhone}`}
                                className="p-1 bg-white hover:bg-[#FAF9F6] border border-[#E6E4DD] text-[#5A5A40] rounded text-xs"
                                title="Call celebrant"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Month Birthdays List */}
              {monthBirthdays.length === 0 ? (
                <div className="py-8 px-4 text-center max-w-md mx-auto space-y-2">
                  <div className="w-10 h-10 rounded-full bg-[#FAF9F6] border border-[#E6E4DD] text-[#D4A373] flex items-center justify-center mx-auto">
                    <Cake className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-[#3D3D33]">
                    No Birthdays Recorded in {targetMonthName}
                  </h4>
                  <p className="text-xs text-[#7A7A66] leading-relaxed">
                    Add member birthdays in the Member Registry or Member Profile to have upcoming birthday notices automatically highlighted here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {monthBirthdays.map(({ member, day, formattedDate, isToday, isUpcoming, isPassed, daysAway }) => {
                      const cleanPhone = (member.phone || '').replace(/[^0-9+]/g, '');

                      return (
                        <div
                          key={member.id}
                          id={`birthday-card-${member.id}`}
                          className={`rounded-xl border p-4 space-y-3 transition-all ${
                            isToday
                              ? 'bg-[#FAF9F6] border-[#D4A373] shadow-sm ring-1 ring-[#D4A373]/30'
                              : isUpcoming
                              ? 'bg-white border-[#E6E4DD] hover:border-[#5A5A40]/40 shadow-xs'
                              : 'bg-[#FAF9F6]/50 border-[#E6E4DD] opacity-85'
                          }`}
                        >
                          {/* Top Row: Date Pill & Status */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                              isToday
                                ? 'bg-[#D4A373] text-white border-[#D4A373]'
                                : isUpcoming
                                ? 'bg-[#FAF9F6] text-[#5A5A40] border-[#C8C8A9]'
                                : 'bg-[#F5F2ED] text-[#7A7A66] border-[#E6E4DD]'
                            }`}>
                              <Cake className="w-3 h-3" />
                              <span>{formattedDate}</span>
                            </span>

                            <span className="text-[10px] font-bold text-[#7A7A66]">
                              {isToday ? (
                                <span className="text-[#5A5A40] font-extrabold flex items-center gap-0.5">
                                  <Sparkles className="w-3 h-3 text-[#D4A373]" /> Today!
                                </span>
                              ) : isUpcoming && daysAway !== null ? (
                                daysAway === 1 ? 'Tomorrow' : `In ${daysAway} days`
                              ) : (
                                isPassed ? 'Celebrated' : ''
                              )}
                            </span>
                          </div>

                          {/* Member Info */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full border border-[#E6E4DD] bg-[#FAF9F6] text-[#5A5A40] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                              {member.avatarUrl || localStorage.getItem(`avatar_${member.id}`) ? (
                                <img
                                  src={member.avatarUrl || localStorage.getItem(`avatar_${member.id}`) || ''}
                                  alt={member.name}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                member.name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-[#3D3D33] truncate">
                                {member.title}. {member.name}
                              </h4>
                              <p className="text-[10px] text-[#7A7A66] truncate">
                                {member.phone || member.email || 'Church Member'}
                              </p>
                            </div>
                          </div>

                          {/* Contact & Greeting Shortcuts */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#E6E4DD] text-xs">
                            <div className="flex items-center gap-1.5">
                              {member.phone ? (
                                <>
                                  <a
                                    href={`https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(
                                      `Happy Birthday ${member.title}. ${member.name}! May God grant you grace, joy, and blessings on your birthday! 🎂`
                                    )}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-1 bg-[#25D366] text-white hover:bg-[#20b859] rounded text-[10px] font-bold inline-flex items-center gap-1"
                                    title="Send WhatsApp greeting"
                                  >
                                    <MessageSquare className="w-2.5 h-2.5" />
                                    WhatsApp
                                  </a>
                                  <a
                                    href={`tel:${cleanPhone}`}
                                    className="p-1 bg-white hover:bg-[#FAF9F6] border border-[#E6E4DD] text-[#5A5A40] rounded"
                                    title="Call member"
                                  >
                                    <Phone className="w-3 h-3" />
                                  </a>
                                </>
                              ) : member.email ? (
                                <a
                                  href={`mailto:${member.email}?subject=${encodeURIComponent('Happy Birthday!')}`}
                                  className="px-2 py-1 bg-white hover:bg-[#FAF9F6] border border-[#E6E4DD] text-[#5A5A40] rounded text-[10px] font-bold inline-flex items-center gap-1"
                                >
                                  <Mail className="w-2.5 h-2.5" />
                                  Email
                                </a>
                              ) : (
                                <span className="text-[10px] text-[#7A7A66] italic">No phone/email</span>
                              )}
                            </div>

                            {onSelectMember && (
                              <button
                                onClick={() => onSelectMember(member)}
                                className="text-[10px] font-bold text-[#5A5A40] hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <span>Profile</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Charts Grid */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Custom SVG Bar Chart: Service-by-service averages */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E6E4DD] p-5 space-y-4 shadow-sm">
          <div className="border-b border-[#E6E4DD] pb-3">
            <h4 className="text-sm font-serif font-bold text-[#3D3D33]">
              Activity Attendance Benchmarking
            </h4>
            <p className="text-xs text-[#7A7A66]">
              Average attendance rate (%) sorted by program types
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {activityStats.length === 0 ? (
              <p className="text-center text-[#7A7A66] text-xs py-8">
                No activities configured.
              </p>
            ) : (
              activityStats.map((stat) => (
                <div key={stat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#3D3D33]">
                      {stat.name} <span className="font-normal text-[#7A7A66]">({stat.day})</span>
                    </span>
                    <span className="font-mono font-bold text-[#3D3D33]">{stat.rate}%</span>
                  </div>
                  {/* Progress bar styled bar chart */}
                  <div className="w-full h-3 bg-[#FAF9F6] rounded-full overflow-hidden border border-[#E6E4DD]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        stat.rate >= 90
                          ? 'bg-[#5A5A40]'
                          : stat.rate >= 80
                          ? 'bg-[#707052]'
                          : stat.rate >= 60
                          ? 'bg-[#D4A373]'
                          : stat.rate >= 50
                          ? 'bg-[#E1C4A5]'
                          : 'bg-[#C8A2A2]'
                      }`}
                      style={{ width: `${stat.rate}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#7A7A66] font-mono">
                    <span>Sessions held: {stat.held}</span>
                    <span>Remark: {stat.rate >= 90 ? 'Excellent' : stat.rate >= 80 ? 'Very Good' : stat.rate >= 60 ? 'Good' : stat.rate >= 50 ? 'Fair' : 'Poor'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Demographics / Ratios */}
        <div className="bg-white rounded-2xl border border-[#E6E4DD] p-5 space-y-4 shadow-sm">
          <div className="border-b border-[#E6E4DD] pb-3">
            <h4 className="text-sm font-serif font-bold text-[#3D3D33]">
              Congregation Composition
            </h4>
            <p className="text-xs text-[#7A7A66]">
              Title composition of registered members
            </p>
          </div>

          <div className="py-6 flex flex-col items-center justify-center space-y-5">
            {/* Split ring visualizer */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  className="stroke-[#D4A373]"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  className="stroke-[#5A5A40]"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 48}`}
                  strokeDashoffset={`${2 * Math.PI * 48 * (1 - broPct / 100)}`}
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-xs font-bold text-[#7A7A66]">Ratio</p>
                <p className="text-base font-serif font-bold text-[#3D3D33]">
                  {broCount}:{sisCount}
                </p>
              </div>
            </div>

            {/* Labels */}
            <div className="w-full grid grid-cols-2 gap-3 text-center border-t border-[#E6E4DD] pt-4">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#5A5A40] rounded-full inline-block" />
                  Bro ({broCount})
                </p>
                <p className="text-lg font-bold text-[#5A5A40]">{broPct}%</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#D4A373] rounded-full inline-block" />
                  Sis ({sisCount})
                </p>
                <p className="text-lg font-bold text-[#D4A373]">{sisPct}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Trends Line-chart widget */}
      <div className="bg-white rounded-2xl border border-[#E6E4DD] p-5 space-y-4 shadow-sm">
        <div className="border-b border-[#E6E4DD] pb-3 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-serif font-bold text-[#3D3D33]">
              Chronological Attendance Trend
            </h4>
            <p className="text-xs text-[#7A7A66]">
              Attendance rate of the last 5 registered service sessions
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-[#F5F2ED] text-[#5A5A40] border border-[#E6E4DD] rounded-full font-bold">
            Live Timeline
          </span>
        </div>

        {trendData.length === 0 ? (
          <p className="text-center text-[#7A7A66] text-xs py-8">
            No session logs taken yet. Take attendance to build timeline trends.
          </p>
        ) : (
          <div className="pt-2">
            <div className="grid grid-cols-5 gap-3">
              {trendData.map((session, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigateToEditSession && session.id && onNavigateToEditSession(session.id)}
                  className={`flex flex-col items-center space-y-2 group ${
                    onNavigateToEditSession ? 'cursor-pointer' : ''
                  }`}
                  title={onNavigateToEditSession ? 'Click to inspect or edit this attendance register' : session.name}
                >
                  <div className="w-full bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg h-36 flex flex-col justify-end p-1 group-hover:border-[#5A5A40] transition-colors shadow-2xs">
                    <div
                      className={`w-full rounded-md transition-all duration-500 flex items-center justify-center text-[10px] font-mono font-bold text-white ${
                        session.rate >= 90
                          ? 'bg-[#5A5A40]'
                          : session.rate >= 80
                          ? 'bg-[#707052]'
                          : session.rate >= 60
                          ? 'bg-[#D4A373]'
                          : 'bg-[#C8A2A2]'
                      }`}
                      style={{ height: `${Math.max(session.rate, 15)}%` }}
                    >
                      {session.rate}%
                    </div>
                  </div>
                  <div className="text-center space-y-0.5">
                    <p className="text-[10px] font-bold text-[#3D3D33] truncate max-w-[80px] group-hover:text-[#5A5A40] transition-colors" title={session.name}>
                      {session.name}
                    </p>
                    <p className="text-[9px] font-mono text-[#7A7A66]">
                      {session.date.split('-').slice(1).join('/')}
                    </p>
                    {onNavigateToEditSession && (
                      <span className="text-[9px] text-[#5A5A40] opacity-0 group-hover:opacity-100 font-bold block transition-opacity">
                        Edit
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

