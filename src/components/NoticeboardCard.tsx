import React, { useState } from 'react';
import { Member, HouseFellowshipNotice, UserRole } from '../types';
import { getWeekBirthdaySummary } from '../utils';
import {
  Cake,
  Calendar,
  Clock,
  MapPin,
  User,
  Edit3,
  Megaphone,
  Check,
  X,
  Sparkles,
  Bell,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageSquare,
  Gift,
  Copy,
} from 'lucide-react';

// Helper to convert date to YYYY-MM-DD
const toYYYYMMDD = (dateStr: string): string => {
  if (!dateStr) return '';
  const reg = /^\d{4}-\d{2}-\d{2}$/;
  if (reg.test(dateStr)) return dateStr;
  
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  } catch (e) {}
  
  return '';
};

// Helper to format date nicely for human display
const formatDateNicely = (dateStr: string): string => {
  if (!dateStr) return '';
  const reg = /^\d{4}-\d{2}-\d{2}$/;
  if (reg.test(dateStr)) {
    try {
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
  }
  return dateStr;
};

interface NoticeboardCardProps {
  members: Member[];
  notice: HouseFellowshipNotice | null;
  onUpdateNotice: (notice: HouseFellowshipNotice) => Promise<void>;
  currentRole: UserRole;
  currentActorName?: string; // name of logged-in admin or secretary
  onUpdateMember?: (id: string, updates: Partial<Member>) => void;
}

export const NoticeboardCard: React.FC<NoticeboardCardProps> = ({
  members,
  notice,
  onUpdateNotice,
  currentRole,
  currentActorName,
  onUpdateMember,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [topic, setTopic] = useState(notice?.topic || '');
  const [date, setDate] = useState(toYYYYMMDD(notice?.date || ''));
  const [time, setTime] = useState(notice?.time || '5:00 PM');
  const [host, setHost] = useState(notice?.host || 'To be Announced');
  const [address, setAddress] = useState(notice?.address || '');
  const [hostPhone, setHostPhone] = useState(notice?.hostPhone || '');
  const [hostMemberId, setHostMemberId] = useState<string | null>(notice?.hostMemberId || null);
  const [prefillFeedback, setPrefillFeedback] = useState<{
    memberName: string;
    hasAddress: boolean;
    hasPhone: boolean;
  } | null>(null);
  const [syncMemberToDb, setSyncMemberToDb] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const [weekOffset, setWeekOffset] = useState(0);

  // Initialize form fields when notice loads or editing starts
  React.useEffect(() => {
    if (notice) {
      setTopic(notice.topic || '');
      setDate(toYYYYMMDD(notice.date));
      setTime(notice.time || '5:00 PM');
      setHost(notice.host || 'To be Announced');
      setAddress(notice.address || '');
      setHostPhone(notice.hostPhone || '');
      setHostMemberId(notice.hostMemberId || null);
    }
  }, [notice, isEditing]);

  const canEdit = currentRole === 'Admin' || currentRole === 'Secretary';

  // Automatically pre-fill host address and details from congregation database
  const handleHostSelect = (selectedHostValue: string) => {
    setTopic(selectedHostValue);

    if (!selectedHostValue) {
      setHostMemberId(null);
      setPrefillFeedback(null);
      return;
    }

    // Match member from database by formatted title+name or raw name or ID
    const matched = members.find(
      (m) =>
        `${m.title}. ${m.name}` === selectedHostValue ||
        m.name === selectedHostValue ||
        m.id === selectedHostValue
    );

    if (matched) {
      setHostMemberId(matched.id);

      const hasAddr = Boolean(matched.address && matched.address.trim());
      const hasPh = Boolean(matched.phone && matched.phone.trim());

      // Auto-fill address from member record if available
      if (hasAddr) {
        setAddress(matched.address!.trim());
      }

      // Auto-fill phone from member record if available
      if (hasPh) {
        setHostPhone(matched.phone!.trim());
      }

      setPrefillFeedback({
        memberName: `${matched.title}. ${matched.name}`,
        hasAddress: hasAddr,
        hasPhone: hasPh,
      });
    } else {
      setHostMemberId(null);
      setPrefillFeedback(null);
    }
  };

  // Calculate Birthdays for the selected week
  const weekSummary = getWeekBirthdaySummary(members, weekOffset, 'monday');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !date.trim() || !time.trim() || !host.trim() || !address.trim()) {
      alert('Please fill out all house fellowship fields (Host, Date, Time, Moderator, and Address)');
      return;
    }

    setSaving(true);
    try {
      const updated: HouseFellowshipNotice = {
        id: 'house_fellowship',
        topic: topic.trim(),
        date: date.trim(),
        time: time.trim(),
        host: host.trim(),
        address: address.trim(),
        hostPhone: hostPhone.trim(),
        hostMemberId: hostMemberId || undefined,
        lastUpdatedBy: currentActorName || currentRole,
      };
      await onUpdateNotice(updated);

      // If requested, synchronize any newly entered address or phone back to the member in database
      if (syncMemberToDb && hostMemberId && onUpdateMember) {
        onUpdateMember(hostMemberId, {
          address: address.trim(),
          ...(hostPhone.trim() ? { phone: hostPhone.trim() } : {}),
        });
      }

      setIsEditing(false);
      setPrefillFeedback(null);
    } catch (err) {
      console.error('Failed to update noticeboard:', err);
      alert('Failed to save notice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="noticeboard-card" className="bg-white rounded-2xl border border-[#C8C8A9] shadow-md overflow-hidden flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[#E6E4DD]">
      
      {/* SECTION 1: BIRTHDAY NOTIFICATIONS FOR THE WEEK */}
      <div className="flex-1 p-5 space-y-3.5 bg-gradient-to-br from-[#FAF9F6] to-white">
        
        {/* Header & Week Range Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#FDF2F2] border border-[#FAD2D2] rounded-lg text-[#B25E5E]">
              <Cake className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-serif font-bold text-[#3D3D33] tracking-tight">
                  {weekOffset === 0 ? 'Birthdays This Week' : weekOffset === 1 ? 'Birthdays Next Week' : 'Birthdays (Weekly)'}
                </h4>
                <span className="text-[10px] px-2 py-0.5 font-bold rounded-full bg-[#5A5A40]/10 text-[#5A5A40]">
                  {weekSummary.celebrants.length} {weekSummary.celebrants.length === 1 ? 'Celebrant' : 'Celebrants'}
                </span>
              </div>
              <p className="text-[10px] text-[#7A7A66] font-medium">
                {weekSummary.formattedRange}
              </p>
            </div>
          </div>

          {/* Week Navigation Controls */}
          <div className="flex items-center gap-1 self-start sm:self-auto">
            {weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="text-[10px] font-bold text-[#5A5A40] hover:text-[#3D3D33] px-2 py-0.5 bg-[#F5F2ED] hover:bg-[#E6E4DD] rounded-md transition-colors cursor-pointer mr-1"
                title="Jump to current week"
              >
                This Week
              </button>
            )}
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-1 text-[#7A7A66] hover:text-[#3D3D33] hover:bg-[#E6E4DD] rounded-md transition-colors cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-1 text-[#7A7A66] hover:text-[#3D3D33] hover:bg-[#E6E4DD] rounded-md transition-colors cursor-pointer"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 7-Day Mini Calendar Strip */}
        <div className="grid grid-cols-7 gap-1 bg-[#F5F2ED]/60 p-1.5 rounded-xl border border-[#E6E4DD]/80">
          {weekSummary.days.map((day) => {
            const hasCelebrant = weekSummary.celebrants.some((c) => c.dayInfo.mmDd === day.mmDd);
            const isToday = day.isToday;
            return (
              <div
                key={day.mmDd}
                className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-lg text-center transition-all ${
                  isToday
                    ? 'bg-[#5A5A40] text-white shadow-xs'
                    : hasCelebrant
                    ? 'bg-[#FDF2F2] border border-[#FAD2D2] text-[#B25E5E]'
                    : 'bg-white/60 text-[#7A7A66]'
                }`}
              >
                <span className={`text-[9px] uppercase font-bold ${isToday ? 'text-white/80' : ''}`}>
                  {day.shortDayName[0]}
                </span>
                <span className={`text-xs font-bold leading-tight ${isToday ? 'text-white' : 'text-[#3D3D33]'}`}>
                  {day.dayNumber}
                </span>
                {hasCelebrant && (
                  <span className="text-[8px] leading-none pt-0.5" title="Birthday Celebrant!">
                    🎂
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Weekly Celebrants List */}
        {weekSummary.celebrants.length > 0 ? (
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {weekSummary.celebrants.map(({ member, dayInfo }) => {
              const isToday = dayInfo.isToday;
              const isTomorrow = dayInfo.isTomorrow;
              const isPassed = dayInfo.daysDiff < 0;

              return (
                <div
                  key={member.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isToday
                      ? 'bg-[#FDF2F2] border-[#FAD2D2] shadow-xs'
                      : isTomorrow
                      ? 'bg-[#FAF9F6] border-[#C8C8A9]'
                      : 'bg-white border-[#E6E4DD]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isToday
                            ? 'bg-[#B25E5E] text-white ring-2 ring-[#B25E5E]/20'
                            : 'bg-[#5A5A40] text-white'
                        }`}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-[#3D3D33]">
                            {member.title}. {member.name}
                          </p>
                          {/* Status Badge */}
                          {isToday && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#B25E5E] text-white">
                              <Sparkles className="w-2.5 h-2.5" />
                              Today!
                            </span>
                          )}
                          {isTomorrow && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#D4A373] text-white">
                              <Bell className="w-2.5 h-2.5" />
                              Tomorrow
                            </span>
                          )}
                          {!isToday && !isTomorrow && (
                            <span className="text-[9px] font-semibold text-[#7A7A66] bg-[#F5F2ED] px-1.5 py-0.5 rounded">
                              {dayInfo.dayName} ({dayInfo.formattedDate})
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-[#7A7A66]">
                          {dayInfo.formattedFullDate} •{' '}
                          {isToday
                            ? 'Celebrating Today! 🎉'
                            : isTomorrow
                            ? 'Birthday Tomorrow'
                            : isPassed
                            ? 'Celebrated earlier this week'
                            : `In ${dayInfo.daysDiff} days`}
                        </p>
                      </div>
                    </div>

                    {/* Celebration outreach shortcuts */}
                    {member.phone && (
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={`https://wa.me/${member.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Happy Birthday ${member.title}. ${member.name}! 🎂🎉 Wishing you God's richest blessings, joy, and peace as you celebrate your birthday on ${dayInfo.formattedFullDate}! - From Church of Christ`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-[#25D366] text-white hover:bg-[#20b859] rounded-lg transition-colors"
                          title="Send WhatsApp Birthday Greeting"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`tel:${member.phone.replace(/[^0-9+]/g, '')}`}
                          className="p-1.5 bg-white hover:bg-[#5A5A40] hover:text-white text-[#5A5A40] border border-[#C8C8A9] rounded-lg transition-colors"
                          title="Call Member"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center space-y-2 bg-[#FAF9F6]/50 rounded-xl border border-dashed border-[#E6E4DD]">
            <p className="text-xs font-semibold text-[#7A7A66]">
              No birthdays in the week of {weekSummary.formattedRange}.
            </p>
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5A5A40] hover:text-[#3D3D33] bg-white border border-[#C8C8A9] px-2.5 py-1 rounded-lg transition-all shadow-xs cursor-pointer"
            >
              Check Next Week <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* SECTION 2: HOUSE FELLOWSHIP NOTICEBOARD */}
      <div className="flex-1 p-5 space-y-4 bg-gradient-to-br from-white to-[#FAF9F6]">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg text-[#5A5A40]">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-serif font-bold text-[#3D3D33] tracking-tight">
                Next House Fellowship Notice
              </h4>
              <p className="text-[10px] text-[#7A7A66] font-medium">
                Official bulletin board managed by the Secretary
              </p>
            </div>
          </div>

          {canEdit && !isEditing && (
            <button
              id="edit-fellowship-notice-btn"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-[#5A5A40] bg-[#F5F2ED] hover:bg-[#E6E4DD] border border-[#C8C8A9] rounded-lg transition-all cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              Update Bulletin
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[9px] font-bold text-[#7A7A66] uppercase tracking-wider">
                  Host (Select Member)
                </label>
                {prefillFeedback && (
                  <span className="text-[10px] text-[#5A5A40] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#D4A373]" />
                    Database Pre-fill Active
                  </span>
                )}
              </div>
              <select
                id="notice-topic-select"
                value={topic}
                onChange={(e) => handleHostSelect(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-[#E6E4DD] rounded-lg bg-white text-[#3D3D33] focus:outline-none focus:border-[#5A5A40] cursor-pointer"
                required
              >
                <option value="">-- Select Host Member --</option>
                {members.map((m) => (
                  <option key={m.id} value={`${m.title}. ${m.name}`}>
                    {m.title}. {m.name} ({m.role.toUpperCase()}) {m.address ? `• ${m.address}` : '• (No address recorded)'}
                  </option>
                ))}
              </select>

              {/* Informational badge when member is selected */}
              {prefillFeedback && (
                <div className="mt-1.5 p-2 bg-[#FAF9F6] border border-[#C8C8A9] rounded-lg text-[11px] text-[#5A5A40] flex flex-col sm:flex-row sm:items-center justify-between gap-1 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D4A373] shrink-0" />
                    <span>
                      {prefillFeedback.hasAddress
                        ? `Address pre-filled from database for ${prefillFeedback.memberName}`
                        : `No address on file in database for ${prefillFeedback.memberName}. Enter below to save.`}
                    </span>
                  </div>
                  {prefillFeedback.hasPhone && (
                    <span className="text-[10px] text-[#7A7A66] font-mono">
                      Phone: {hostPhone}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-[#7A7A66] uppercase tracking-wider mb-1">
                  Date (Calendar Picker)
                </label>
                <input
                  id="notice-date-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-[#E6E4DD] rounded-lg bg-white text-[#3D3D33] focus:outline-none focus:border-[#5A5A40]"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#7A7A66] uppercase tracking-wider mb-1">
                  Time
                </label>
                <input
                  id="notice-time-input"
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="e.g. 5:00 PM"
                  className="w-full text-xs px-2.5 py-1.5 border border-[#E6E4DD] rounded-lg bg-white text-[#3D3D33] focus:outline-none focus:border-[#5A5A40]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-[#7A7A66] uppercase tracking-wider mb-1">
                  Moderator
                </label>
                <select
                  id="notice-host-select"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-[#E6E4DD] rounded-lg bg-white text-[#3D3D33] focus:outline-none focus:border-[#5A5A40] cursor-pointer"
                  required
                >
                  <option value="To be Announced">To be Announced</option>
                  {members.map((m) => (
                    <option key={m.id} value={`${m.title}. ${m.name}`}>
                      {m.title}. {m.name} ({m.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-[#7A7A66] uppercase tracking-wider mb-1">
                  Host Contact Phone
                </label>
                <div className="relative">
                  <input
                    id="notice-host-phone-input"
                    type="tel"
                    value={hostPhone}
                    onChange={(e) => setHostPhone(e.target.value)}
                    placeholder="e.g. +234 802 345 6789"
                    className="w-full text-xs pl-7 pr-2.5 py-1.5 border border-[#E6E4DD] rounded-lg bg-white text-[#3D3D33] focus:outline-none focus:border-[#5A5A40]"
                  />
                  <Phone className="w-3.5 h-3.5 text-[#7A7A66] absolute left-2 top-2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-[#7A7A66] uppercase tracking-wider mb-1">
                Fellowship Center Physical Address (Pre-Filled)
              </label>
              <div className="relative">
                <input
                  id="notice-address-input"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter full physical residential address or fellowship venue"
                  className="w-full text-xs pl-7 pr-2.5 py-1.5 border border-[#E6E4DD] rounded-lg bg-white text-[#3D3D33] focus:outline-none focus:border-[#5A5A40]"
                  required
                />
                <MapPin className="w-3.5 h-3.5 text-[#7A7A66] absolute left-2 top-2 pointer-events-none" />
              </div>
            </div>

            {/* Sync address to member database checkbox */}
            {hostMemberId && onUpdateMember && (
              <div className="flex items-center gap-2 pt-1 bg-[#FAF9F6] p-2 rounded-lg border border-[#E6E4DD]">
                <input
                  id="sync-member-address-checkbox"
                  type="checkbox"
                  checked={syncMemberToDb}
                  onChange={(e) => setSyncMemberToDb(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[#C8C8A9] text-[#5A5A40] focus:ring-[#5A5A40]/20 cursor-pointer accent-[#5A5A40]"
                />
                <label htmlFor="sync-member-address-checkbox" className="text-[11px] text-[#5A5A40] select-none cursor-pointer">
                  Update this address and phone in host's member database record
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E4DD]">
              <button
                id="cancel-notice-btn"
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setPrefillFeedback(null);
                }}
                className="px-3 py-1.5 text-[10px] font-bold text-[#7A7A66] hover:bg-[#F5F2ED] border border-[#E6E4DD] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="save-notice-btn"
                type="submit"
                disabled={saving}
                className="px-3 py-1.5 text-[10px] font-bold text-white bg-[#5A5A40] hover:bg-[#4E4E37] rounded-lg flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Check className="w-3 h-3" />
                {saving ? 'Saving...' : 'Save Notice'}
              </button>
            </div>
          </form>
        ) : notice ? (
          <div className="space-y-3.5">
            <div className="bg-[#FAF9F6] border border-[#E6E4DD] p-3 rounded-xl shadow-inner space-y-1">
              <span className="text-[9px] font-extrabold uppercase bg-[#5A5A40] text-white px-1.5 py-0.5 rounded font-mono">
                Host
              </span>
              <h5 className="text-sm font-bold text-[#3D3D33] pt-0.5">
                {notice.topic}
              </h5>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex items-start gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#5A5A40] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-bold uppercase text-[#7A7A66] tracking-wider">Date</p>
                  <p className="text-xs font-bold text-[#3D3D33]">{formatDateNicely(notice.date)}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-[#5A5A40] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-bold uppercase text-[#7A7A66] tracking-wider">Time</p>
                  <p className="text-xs font-bold text-[#3D3D33]">{notice.time}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <User className="w-3.5 h-3.5 text-[#5A5A40] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-bold uppercase text-[#7A7A66] tracking-wider">Moderator</p>
                  <p className="text-xs font-bold text-[#3D3D33]">{notice.host || 'To be Announced'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#5A5A40] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[9px] font-bold uppercase text-[#7A7A66] tracking-wider">Address</p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(notice.address);
                        setCopiedAddress(true);
                        setTimeout(() => setCopiedAddress(false), 2000);
                      }}
                      className="text-[9px] font-bold text-[#5A5A40] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                      title="Copy address"
                    >
                      <Copy className="w-2.5 h-2.5" />
                      {copiedAddress ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs font-bold text-[#3D3D33] line-clamp-2" title={notice.address}>
                    {notice.address}
                  </p>
                </div>
              </div>
            </div>

            {/* Host phone contact row if available */}
            {notice.hostPhone && (
              <div className="pt-2 border-t border-[#E6E4DD]/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-[#7A7A66]">
                  <Phone className="w-3.5 h-3.5 text-[#5A5A40]" />
                  <span className="text-[11px] font-medium">Host Phone:</span>
                  <span className="font-mono font-bold text-[#3D3D33]">{notice.hostPhone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${notice.hostPhone.replace(/\s+/g, '')}`}
                    className="px-2 py-0.5 text-[10px] font-bold text-[#5A5A40] bg-[#FAF9F6] border border-[#E6E4DD] rounded hover:bg-[#F5F2ED] transition-colors"
                  >
                    Call
                  </a>
                  <a
                    href={`https://wa.me/${notice.hostPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 text-[10px] font-bold text-white bg-[#25D366] rounded hover:bg-[#20ba5a] transition-colors"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            )}

            {notice.lastUpdatedBy && (
              <p className="text-[9px] text-[#7A7A66] text-right font-mono italic">
                Last updated by: {notice.lastUpdatedBy}
              </p>
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-xs text-[#7A7A66]">No active House Fellowship notice available.</p>
          </div>
        )}
      </div>
    </div>
  );
};
