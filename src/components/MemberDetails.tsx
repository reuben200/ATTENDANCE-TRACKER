import React, { useState } from 'react';
import { Member, Activity, AttendanceSession } from '../types';
import { calculateMemberStats, getRemark } from '../utils';
import {
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  User,
  Upload,
  Trash2,
  Heart,
  HeartOff,
  Download,
  Pencil,
  Check,
  X,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Edit3,
} from 'lucide-react';

interface MemberDetailsProps {
  member: Member;
  activities: Activity[];
  sessions: AttendanceSession[];
  onBack?: () => void;
  onUpdateMember?: (id: string, updates: Partial<Member>) => void;
  isMemberOnlyView?: boolean;
}

export const MemberDetails: React.FC<MemberDetailsProps> = ({
  member,
  activities,
  sessions,
  onBack,
  onUpdateMember,
  isMemberOnlyView = false,
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    return member.avatarUrl || localStorage.getItem(`avatar_${member.id}`) || null;
  });
  const [isUploading, setIsUploading] = useState(false);
  
  const [isEditingBirthday, setIsEditingBirthday] = useState(false);
  const [bDayMonth, setBDayMonth] = useState('');
  const [bDayDay, setBDayDay] = useState('');

  const [isEditingContact, setIsEditingContact] = useState(false);
  const [phone, setPhone] = useState(member.phone || '');
  const [email, setEmail] = useState(member.email || '');
  const [address, setAddress] = useState(member.address || '');
  const [notes, setNotes] = useState(member.outreachNotes || '');

  const handleStartEditBirthday = () => {
    if (member.birthday && member.birthday.includes('-')) {
      const [mm, dd] = member.birthday.split('-');
      setBDayMonth(mm);
      setBDayDay(dd);
    } else {
      setBDayMonth('');
      setBDayDay('');
    }
    setIsEditingBirthday(true);
  };

  const handleSaveBirthday = () => {
    if (onUpdateMember) {
      if (bDayMonth && bDayDay) {
        onUpdateMember(member.id, { birthday: `${bDayMonth}-${bDayDay}` });
      } else {
        onUpdateMember(member.id, { birthday: '' });
      }
    }
    setIsEditingBirthday(false);
  };

  const handleStartEditContact = () => {
    setPhone(member.phone || '');
    setEmail(member.email || '');
    setAddress(member.address || '');
    setNotes(member.outreachNotes || '');
    setIsEditingContact(true);
  };

  const handleSaveContact = () => {
    if (onUpdateMember) {
      onUpdateMember(member.id, {
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        outreachNotes: notes.trim(),
      });
    }
    setIsEditingContact(false);
  };

  React.useEffect(() => {
    setAvatarUrl(member.avatarUrl || localStorage.getItem(`avatar_${member.id}`) || null);
  }, [member.id, member.avatarUrl]);

  // Generate statistics
  const stats = calculateMemberStats(member, activities, sessions);

  // Chronological sessions sorted with latest first
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        localStorage.setItem(`avatar_${member.id}`, base64String);
        setAvatarUrl(base64String);
        setIsUploading(false);
        if (onUpdateMember) {
          onUpdateMember(member.id, { avatarUrl: base64String });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    localStorage.removeItem(`avatar_${member.id}`);
    setAvatarUrl(null);
    if (onUpdateMember) {
      onUpdateMember(member.id, { avatarUrl: '' });
    }
  };

  const handleExportIndividualCSV = () => {
    const headers = ['Date', 'Service/Activity', 'Attendance Status', 'Method/Notes'];
    const rows = sortedSessions.map((session) => {
      const record = session.records.find((r) => r.memberId === member.id);
      let statusText = 'Absent';
      let note = '';

      if (member.isSick) {
        statusText = 'Present (Excused)';
        note = 'Globally marked as Sick (Auto-Excused)';
      } else if (record) {
        if (record.isSickAtTime) {
          statusText = 'Present (Excused)';
          note = 'Excused as Sick at session time';
        } else if (record.status === 'Present') {
          statusText = 'Present';
          note = 'Recorded Present';
        } else {
          statusText = 'Absent';
          note = 'Recorded Absent';
        }
      } else {
        statusText = 'Absent';
        note = 'No record found';
      }

      return [session.date, session.activityName, statusText, note];
    });

    const csvContent = [headers, ...rows]
      .map((e) => e.map((val) => `"${(val || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${member.title || ''}_${(member.name || '').replace(/\s+/g, '_')}_Attendance_History.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const percentColor = (pct: number) => {
    if (pct >= 90) return 'text-[#5A5A40]';
    if (pct >= 80) return 'text-[#5A5A40]';
    if (pct >= 60) return 'text-[#D4A373]';
    if (pct >= 50) return 'text-[#D4A373]';
    return 'text-[#B25E5E]';
  };

  const percentBg = (pct: number) => {
    if (pct >= 90) return 'bg-[#FAF9F6] text-[#5A5A40] border-[#E6E4DD]';
    if (pct >= 80) return 'bg-[#FAF9F6] text-[#5A5A40] border-[#E6E4DD]';
    if (pct >= 60) return 'bg-[#F5F2ED] text-[#D4A373] border-[#E6E4DD]';
    if (pct >= 50) return 'bg-[#F5F2ED] text-[#D4A373] border-[#E6E4DD]';
    return 'bg-[#FDF2F2] text-[#B25E5E] border-[#FAD2D2]';
  };

  return (
    <div id="member-details-container" className="space-y-6">
      {/* Navigation & Header */}
      {!isMemberOnlyView && onBack && (
        <button
          id="member-details-back-btn"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#7A7A66] hover:text-[#5A5A40] hover:bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Registry
        </button>
      )}

      {/* Main Profile Info Card */}
      <div className="bg-white rounded-2xl border border-[#E6E4DD] shadow-sm p-6 relative overflow-hidden">
        {/* Subtle decorative mesh */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FAF9F6] rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />

        {/* Top Right Overall Combined Percentage - EXTREMELY LARGE TEXT */}
        <div className="absolute top-6 right-6 text-right">
          <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-widest">
            Combined Attendance
          </p>
          <p
            id="combined-percentage-display"
            className={`text-5xl md:text-6xl font-extrabold tracking-tighter mt-1 ${percentColor(
              stats.combinedPercentage
            )}`}
          >
            {stats.combinedPercentage}%
          </p>
          <span
            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 border ${percentBg(
              stats.combinedPercentage
            )}`}
          >
            {stats.combinedPercentage >= 90
              ? 'Excellent Standard'
              : stats.combinedPercentage >= 80
              ? 'Very Good Standard'
              : stats.combinedPercentage >= 60
              ? 'Good Standard'
              : stats.combinedPercentage >= 50
              ? 'Satisfactory'
              : 'Requires Improvement'}
          </span>
        </div>

        {/* Left Side: Avatar & Name */}
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Profile Image & Uploader */}
          <div className="relative group shrink-0">
            {avatarUrl ? (
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#E6E4DD] relative">
                <img
                  id="member-uploaded-avatar"
                  src={avatarUrl}
                  alt={member.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {onUpdateMember && (
                  <button
                    id="delete-avatar-btn"
                    onClick={handleRemoveAvatar}
                    className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer text-xs font-bold"
                  >
                    <Trash2 className="w-4 h-4 text-[#B25E5E]" />
                  </button>
                )}
              </div>
            ) : (
              // Image avatar fallback with default color if no uploaded image
              <div
                id="member-avatar-fallback"
                className="w-24 h-24 rounded-2xl border-2 border-[#E6E4DD] flex items-center justify-center font-bold text-3xl shrink-0 bg-[#F5F2ED] text-[#5A5A40] shadow-inner"
              >
                {member.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            {/* Custom Image Upload Form Overlay */}
            {onUpdateMember && (
              <label
                id="avatar-upload-label"
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-[#5A5A40] hover:bg-[#4E4E37] text-white rounded-lg flex items-center justify-center shadow-md cursor-pointer border border-[#4E4E37] transition-transform hover:scale-105"
                title="Upload Profile Image"
              >
                <Upload className="w-3.5 h-3.5" />
                <input
                  id="avatar-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Name and Meta */}
          <div className="space-y-2 max-w-[calc(100%-120px)]">
            <h3 className="text-2xl font-serif font-bold tracking-tight text-[#3D3D33] leading-none">
              {member.title}. {member.name}
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FAF9F6] text-[#7A7A66] border border-[#E6E4DD]">
                <User className="w-3 h-3 text-[#7A7A66]" />
                Role: {member.role.toUpperCase()}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#FAF9F6] text-[#5A5A40] border border-[#E6E4DD]">
                Access Code: {member.accessCode}
              </span>

              {isEditingBirthday ? (
                <div className="flex items-center gap-1 bg-[#FAF9F6] border border-[#E6E4DD] rounded-full px-2 py-0.5 text-xs">
                  <span className="mr-1">🎂</span>
                  <select
                    id="member-details-birthday-month"
                    value={bDayMonth}
                    onChange={(e) => setBDayMonth(e.target.value)}
                    className="bg-transparent border-none text-xs focus:ring-0 focus:outline-none p-0 cursor-pointer font-semibold text-[#5A5A40]"
                  >
                    <option value="">Month</option>
                    {Array.from({ length: 12 }, (_, i) => {
                      const m = String(i + 1).padStart(2, '0');
                      const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      return <option key={m} value={m}>{names[i]}</option>;
                    })}
                  </select>
                  <span className="text-gray-300">/</span>
                  <select
                    id="member-details-birthday-day"
                    value={bDayDay}
                    onChange={(e) => setBDayDay(e.target.value)}
                    className="bg-transparent border-none text-xs focus:ring-0 focus:outline-none p-0 cursor-pointer font-semibold text-[#5A5A40]"
                  >
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => {
                      const d = String(i + 1).padStart(2, '0');
                      return <option key={d} value={d}>{i + 1}</option>;
                    })}
                  </select>
                  <button
                    id="save-birthday-btn"
                    onClick={handleSaveBirthday}
                    className="ml-1 text-emerald-600 hover:text-emerald-700 p-0.5 cursor-pointer"
                    title="Save Birthday"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    id="cancel-birthday-btn"
                    onClick={() => setIsEditingBirthday(false)}
                    className="text-rose-600 hover:text-rose-700 p-0.5 cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FAF9F6] text-[#5A5A40] border border-[#E6E4DD]">
                  <span>🎂 Birthday: {member.birthday ? (() => {
                    const [mm, dd] = member.birthday.split('-');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const mIdx = parseInt(mm, 10) - 1;
                    return mIdx >= 0 && mIdx < 12 ? `${monthNames[mIdx]} ${parseInt(dd, 10)}` : member.birthday;
                  })() : 'Not Set'}</span>
                  {onUpdateMember && (
                    <button
                      id="edit-birthday-inline-btn"
                      onClick={handleStartEditBirthday}
                      className="ml-1 text-[#7A7A66] hover:text-[#5A5A40] p-0.5 cursor-pointer"
                      title="Edit Birthday"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              )}

              {/* Sickness logic trigger */}
              {onUpdateMember && (
                <button
                  id={`toggle-sick-details-btn-${member.id}`}
                  onClick={() => onUpdateMember(member.id, { isSick: !member.isSick })}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border cursor-pointer transition-all ${
                    member.isSick
                      ? 'bg-[#FDF2F2] text-[#B25E5E] border-[#FAD2D2] font-bold'
                      : 'bg-white text-[#7A7A66] border-[#E6E4DD] hover:bg-[#FAF9F6]'
                  }`}
                >
                  {member.isSick ? (
                    <>
                      <Heart className="w-3 h-3 text-[#B25E5E] fill-[#B25E5E]" />
                      Status: Sick (Auto-Present)
                    </>
                  ) : (
                    <>
                      <HeartOff className="w-3 h-3 text-[#7A7A66]" />
                      Status: Active & Healthy
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-[11px] font-mono text-[#7A7A66]">
              Unique ID: {member.id} • Visibility: {member.isVisible ? 'Visible in sheet' : 'Hidden from sheet'}
            </p>
          </div>
        </div>
      </div>

      {/* Member Contact & Pastoral Information Card */}
      <div className="bg-white rounded-2xl border border-[#E6E4DD] shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E6E4DD] pb-3">
          <h4 className="text-base font-serif font-bold text-[#3D3D33] flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#5A5A40]" />
            Contact & Pastoral Care Information
          </h4>
          {onUpdateMember && !isEditingContact && (
            <button
              onClick={handleStartEditContact}
              className="text-xs font-bold text-[#5A5A40] hover:bg-[#FAF9F6] border border-[#C8C8A9] px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Contact
            </button>
          )}
        </div>

        {!isEditingContact ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Phone Block */}
            <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#E6E4DD] space-y-1.5">
              <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#5A5A40]" />
                Phone Number
              </p>
              <p className="font-mono font-semibold text-sm text-[#3D3D33]">
                {member.phone || <span className="text-[#7A7A66] font-sans font-normal italic text-xs">No phone number recorded</span>}
              </p>
              {member.phone && (
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={`tel:${member.phone.replace(/[^0-9+]/g, '')}`}
                    className="px-2.5 py-1 bg-white hover:bg-[#5A5A40] hover:text-white text-[#5A5A40] border border-[#C8C8A9] rounded text-[11px] font-bold transition-colors"
                  >
                    Call
                  </a>
                  <a
                    href={`https://wa.me/${member.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Hello ${member.title}. ${member.name}, greetings from Church of Christ!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 bg-[#25D366] text-white hover:bg-[#20b859] rounded text-[11px] font-bold transition-colors"
                  >
                    WhatsApp
                  </a>
                </div>
              )}
            </div>

            {/* Email Block */}
            <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#E6E4DD] space-y-1.5">
              <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#5A5A40]" />
                Email Address
              </p>
              <p className="font-semibold text-sm text-[#3D3D33] truncate">
                {member.email || <span className="text-[#7A7A66] font-sans font-normal italic text-xs">No email address recorded</span>}
              </p>
              {member.email && (
                <div className="pt-1">
                  <a
                    href={`mailto:${member.email}`}
                    className="px-2.5 py-1 bg-white hover:bg-[#5A5A40] hover:text-white text-[#5A5A40] border border-[#C8C8A9] rounded text-[11px] font-bold transition-colors inline-block"
                  >
                    Send Email
                  </a>
                </div>
              )}
            </div>

            {/* Address Block */}
            <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#E6E4DD] space-y-1.5">
              <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#7A7A66]" />
                Residence / Location
              </p>
              <p className="text-xs text-[#3D3D33]">
                {member.address || <span className="text-[#7A7A66] italic">No residential address specified</span>}
              </p>
            </div>

            {/* Pastoral Notes if present */}
            {member.outreachNotes && (
              <div className="md:col-span-3 bg-[#FAF9F6] p-3.5 rounded-xl border border-[#E6E4DD] space-y-1">
                <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider">
                  Pastoral Care / Welfare Notes
                </p>
                <p className="text-xs text-[#3D3D33] italic">
                  "{member.outreachNotes}"
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#5A5A40] space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#7A7A66] uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 801 234 5678"
                  className="w-full text-xs px-3 py-1.5 bg-white border border-[#E6E4DD] rounded-lg focus:outline-none focus:border-[#5A5A40]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#7A7A66] uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="member@example.com"
                  className="w-full text-xs px-3 py-1.5 bg-white border border-[#E6E4DD] rounded-lg focus:outline-none focus:border-[#5A5A40]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#7A7A66] uppercase mb-1">Residential Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Residential location, house fellowship center"
                className="w-full text-xs px-3 py-1.5 bg-white border border-[#E6E4DD] rounded-lg focus:outline-none focus:border-[#5A5A40]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#7A7A66] uppercase mb-1">Pastoral / Sickness / Care Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Health status notes, pastoral visit details..."
                className="w-full text-xs px-3 py-1.5 bg-white border border-[#E6E4DD] rounded-lg focus:outline-none focus:border-[#5A5A40]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E4DD]">
              <button
                type="button"
                onClick={() => setIsEditingContact(false)}
                className="px-3 py-1.5 text-xs text-[#7A7A66] hover:bg-[#E6E4DD] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveContact}
                className="px-4 py-1.5 bg-[#5A5A40] text-white text-xs font-bold rounded-lg hover:bg-[#4E4E37] flex items-center gap-1 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                Save Contact Info
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Individual Attendance Activity Summary */}
      <div className="bg-white rounded-2xl border border-[#E6E4DD] shadow-sm p-6 space-y-4">
        <h4 className="text-base font-serif font-bold text-[#3D3D33] flex items-center gap-2">
          <Award className="w-4 h-4 text-[#5A5A40]" />
          Attendance Breakdown by Activity Type
        </h4>

        <div className="overflow-x-auto">
          <table id="member-attendance-breakdown" className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E6E4DD] text-[11px] font-bold text-[#7A7A66] uppercase tracking-wider bg-[#FAF9F6]">
                <th className="py-3 px-4">Activity</th>
                <th className="py-3 px-3 text-center">Sessions Held</th>
                <th className="py-3 px-3 text-center">Sessions Present</th>
                <th className="py-3 px-3 text-center">% Attendance</th>
                <th className="py-3 px-4">Performance Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E4DD] text-xs">
              {stats.summaries.map((summary) => {
                const isVeryHigh = summary.percentage >= 90;
                const isHigh = summary.percentage >= 80;
                const isMedium = summary.percentage >= 60;
                const isFair = summary.percentage >= 50;

                let badgeColor = 'bg-[#FDF2F2] text-[#B25E5E] border-[#FAD2D2]';
                if (isVeryHigh) badgeColor = 'bg-[#FAF9F6] text-[#5A5A40] border-[#E6E4DD]';
                else if (isHigh) badgeColor = 'bg-[#FAF9F6] text-[#5A5A40] border-[#E6E4DD]';
                else if (isMedium) badgeColor = 'bg-[#F5F2ED] text-[#D4A373] border-[#E6E4DD]';
                else if (isFair) badgeColor = 'bg-[#F5F2ED] text-[#D4A373] border-[#E6E4DD]';

                return (
                  <tr key={summary.activityId} id={`breakdown-row-${summary.activityId}`} className="hover:bg-[#FAF9F6]/30">
                    {/* Activity */}
                    <td className="py-3.5 px-4 font-bold text-[#3D3D33]">
                      {summary.activityName}
                    </td>

                    {/* No. Held */}
                    <td className="py-3.5 px-3 text-center font-semibold text-[#7A7A66]">
                      {summary.noHeld}
                    </td>

                    {/* No. Present */}
                    <td className="py-3.5 px-3 text-center font-semibold text-[#3D3D33]">
                      {summary.noPresent}
                    </td>

                    {/* % Attendance */}
                    <td className="py-3.5 px-3 text-center font-extrabold font-mono text-[#3D3D33]">
                      {summary.noHeld > 0 ? `${summary.percentage}%` : '—'}
                    </td>

                    {/* Remark */}
                    <td className="py-3.5 px-4">
                      {summary.noHeld > 0 ? (
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                          {summary.remark}
                        </span>
                      ) : (
                        <span className="text-[#7A7A66] font-medium italic">
                          No sessions recorded yet
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Chronological Session Attendance Log */}
      <div className="bg-white rounded-2xl border border-[#E6E4DD] shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E4DD] pb-3">
          <div>
            <h4 className="text-base font-serif font-bold text-[#3D3D33] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#5A5A40]" />
              Detailed Attendance History Log
            </h4>
            <p className="text-xs text-[#7A7A66]">
              Chronological log of held church services and recorded presence.
            </p>
          </div>
          <button
            onClick={handleExportIndividualCSV}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#5A5A40] bg-[#FAF9F6] hover:bg-[#EAE6DF] border border-[#C8C8A9] rounded-xl transition-all cursor-pointer shadow-sm"
            title="Export individual attendance history to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export History (CSV)
          </button>
        </div>

        {sortedSessions.length === 0 ? (
          <div className="text-center py-8 text-[#7A7A66] text-xs">
            No history recorded yet for this member.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E6E4DD] text-[11px] font-bold text-[#7A7A66] uppercase tracking-wider bg-[#FAF9F6]">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-3">Service / Activity</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4">Excused/Sick Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E4DD] text-xs">
                {sortedSessions.map((session) => {
                  const record = session.records.find((r) => r.memberId === member.id);
                  let statusLabel = 'Absent';
                  let statusBadgeClass = 'bg-[#FDF2F2] text-[#B25E5E] border-[#FAD2D2]';
                  let detail = '—';

                  if (member.isSick) {
                    statusLabel = 'Excused (Sick)';
                    statusBadgeClass = 'bg-[#FDF2F2] text-[#D4A373] border-[#FAD2D2]';
                    detail = 'Auto-excused (Globally marked as sick)';
                  } else if (record) {
                    if (record.isSickAtTime) {
                      statusLabel = 'Excused (Sick)';
                      statusBadgeClass = 'bg-[#FAF9F6] text-[#D4A373] border-[#E6E4DD]';
                      detail = 'Excused at session time';
                    } else if (record.status === 'Present') {
                      statusLabel = 'Present';
                      statusBadgeClass = 'bg-[#FAF9F6] text-[#5A5A40] border-[#E6E4DD]';
                    } else {
                      statusLabel = 'Absent';
                      statusBadgeClass = 'bg-[#FDF2F2] text-[#B25E5E] border-[#FAD2D2]';
                    }
                  }

                  return (
                    <tr key={session.id} className="hover:bg-[#FAF9F6]/30">
                      <td className="py-3 px-4 font-mono font-medium text-[#7A7A66]">
                        {session.date}
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#3D3D33]">
                        {session.activityName}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#7A7A66] italic">
                        {detail}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
