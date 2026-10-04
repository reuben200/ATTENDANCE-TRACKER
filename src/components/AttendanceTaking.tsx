import React, { useState, useEffect } from 'react';
import { Member, Activity, AttendanceSession, AttendanceRecord } from '../types';
import {
  Calendar,
  ClipboardCheck,
  Clock,
  Check,
  X,
  ShieldAlert,
  ListFilter,
  AlertCircle,
  Heart,
  Phone,
  UserCheck,
  MessageSquare,
  Edit2,
  Edit3,
  Eye,
  Trash2,
  Sparkles
} from 'lucide-react';

interface AttendanceTakingProps {
  members: Member[];
  activities: Activity[];
  sessions: AttendanceSession[];
  onSaveSession: (activityId: string, date: string, records: AttendanceRecord[], editingSessionId?: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onUpdateMember?: (id: string, updates: Partial<Member>) => void;
  initialEditingSessionId?: string | null;
  onClearInitialEditingSessionId?: () => void;
}

export const AttendanceTaking: React.FC<AttendanceTakingProps> = ({
  members,
  activities,
  sessions,
  onSaveSession,
  onDeleteSession,
  onUpdateMember,
  initialEditingSessionId,
  onClearInitialEditingSessionId,
}) => {
  // Config selection state
  const [selectedActivityId, setSelectedActivityId] = useState(activities[0]?.id || '');
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Editing session state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(initialEditingSessionId || null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Outreach notes and filtering states
  const [editingNotesMemberId, setEditingNotesMemberId] = useState<string | null>(null);
  const [tempNotesText, setTempNotesText] = useState('');
  const [outreachFilter, setOutreachFilter] = useState<'all' | 'zero' | 'poor'>('all');

  // Form records state - maps memberId to Present / Absent
  // Visible members only
  const visibleMembers = members.filter((m) => m.isVisible);

  // We initialize status mappings. If a member is sick, they are "Present" by default
  const [recordsState, setRecordsState] = useState<Record<string, 'Present' | 'Absent'>>({});

  // Reset/Initialize sheet when selected options or members change
  const [sheetInitialized, setSheetInitialized] = useState(false);

  const initSheet = () => {
    const initial: Record<string, 'Present' | 'Absent'> = {};
    visibleMembers.forEach((m) => {
      // Rule: Sick members are assumed present
      if (m.isSick) {
        initial[m.id] = 'Present';
      } else {
        initial[m.id] = 'Present'; // Default everyone else to Present too for easy roll-call
      }
    });
    setRecordsState(initial);
    setSheetInitialized(true);
  };

  if (!sheetInitialized && visibleMembers.length > 0 && !editingSessionId) {
    initSheet();
  }

  // Load a saved session for editing
  const startEditingSession = (session: AttendanceSession) => {
    setEditingSessionId(session.id);
    setSelectedActivityId(session.activityId);
    setSessionDate(session.date);

    const updatedState: Record<string, 'Present' | 'Absent'> = {};
    visibleMembers.forEach((m) => {
      if (m.isSick) {
        updatedState[m.id] = 'Present';
      } else {
        const found = session.records.find((r) => r.memberId === m.id);
        updatedState[m.id] = found ? found.status : 'Present';
      }
    });

    setRecordsState(updatedState);
    setSheetInitialized(true);
    setSaveFeedback(null);

    // Scroll to top of rollcall view smoothly
    const container = document.getElementById('attendance-taking');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Cancel editing mode and revert to a new clean session
  const cancelEditingSession = () => {
    setEditingSessionId(null);
    if (onClearInitialEditingSessionId) {
      onClearInitialEditingSessionId();
    }
    setSessionDate(new Date().toISOString().split('T')[0]);
    initSheet();
    setSaveFeedback(null);
  };

  // Sync if external edit session requested (e.g. from Dashboard)
  useEffect(() => {
    if (initialEditingSessionId) {
      const target = sessions.find((s) => s.id === initialEditingSessionId);
      if (target) {
        startEditingSession(target);
      }
    }
  }, [initialEditingSessionId, sessions]);

  const handleStatusChange = (memberId: string, status: 'Present' | 'Absent') => {
    setRecordsState((prev) => ({
      ...prev,
      [memberId]: status,
    }));
  };

  // Bulk select logic
  const nonSickVisibleMembers = visibleMembers.filter((m) => !m.isSick);
  const isAllPresent = nonSickVisibleMembers.length > 0 && nonSickVisibleMembers.every(
    (m) => recordsState[m.id] === 'Present'
  );

  const handleBulkToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const shouldMarkPresent = e.target.checked;
    const updated = { ...recordsState };
    visibleMembers.forEach((m) => {
      if (!m.isSick) {
        updated[m.id] = shouldMarkPresent ? 'Present' : 'Absent';
      }
    });
    setRecordsState(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivityId) {
      alert('Please configure at least one activity first.');
      return;
    }

    const finalRecords: AttendanceRecord[] = visibleMembers.map((m) => ({
      memberId: m.id,
      status: m.isSick ? 'Present' : recordsState[m.id] || 'Present',
      isSickAtTime: m.isSick, // Capture their sickness state
    }));

    onSaveSession(selectedActivityId, sessionDate, finalRecords, editingSessionId || undefined);
    
    const actName = activities.find((a) => a.id === selectedActivityId)?.name || 'Service';
    const isEdit = Boolean(editingSessionId);
    setSaveFeedback(
      isEdit
        ? `Attendance register for ${actName} on ${sessionDate} was successfully updated with corrections!`
        : `Attendance register for ${actName} on ${sessionDate} saved successfully!`
    );

    // Re-initialize sheet
    setEditingSessionId(null);
    if (onClearInitialEditingSessionId) {
      onClearInitialEditingSessionId();
    }
    setSheetInitialized(false);
  };

  const selectedActivity = activities.find((a) => a.id === selectedActivityId);

  // Calculate 4-week sessions and poor attendance members for Outreach
  const last4WeeksSessions = sessions.filter((s) => {
    const sDate = new Date(s.date + 'T00:00:00');
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    fourWeeksAgo.setHours(0, 0, 0, 0);
    return sDate >= fourWeeksAgo && sDate <= today;
  });

  const totalSessionsCount = last4WeeksSessions.length;

  const poorAttendanceMembers = visibleMembers
    .map((member) => {
      let presentCount = 0;
      
      last4WeeksSessions.forEach((session) => {
        if (member.isSick) {
          presentCount++;
        } else {
          const record = session.records.find((r) => r.memberId === member.id);
          if (record) {
            if (record.isSickAtTime || record.status === 'Present') {
              presentCount++;
            }
          }
        }
      });

      const percentage = totalSessionsCount > 0 ? Math.round((presentCount / totalSessionsCount) * 100) : 100;
      
      return {
        member,
        presentCount,
        percentage,
      };
    })
    .filter((m) => {
      if (totalSessionsCount === 0) return false;
      
      if (outreachFilter === 'zero') {
        return m.percentage === 0;
      } else if (outreachFilter === 'poor') {
        return m.percentage > 0 && m.percentage < 50;
      }
      return m.percentage < 50;
    });

  const currentEditingSession = editingSessionId ? sessions.find((s) => s.id === editingSessionId) : null;
  const existingSessionForDate = !editingSessionId
    ? sessions.find((s) => s.activityId === selectedActivityId && s.date === sessionDate)
    : null;

  return (
    <div id="attendance-taking" className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-[#E6E4DD] pb-4">
        <div>
          <h2 className="text-xl font-serif font-bold tracking-tight text-[#3D3D33] flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#5A5A40]" />
            Roll Call & Attendance Entry
          </h2>
          <p className="text-sm text-[#7A7A66]">
            Mark attendance for church services, or select any previously saved register to review and correct mistakes.
          </p>
        </div>
      </div>

      {/* Save / Correction Success Notification */}
      {saveFeedback && (
        <div className="p-4 bg-[#FAF9F6] border-2 border-[#5A5A40] rounded-xl text-xs font-bold text-[#5A5A40] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1 bg-[#5A5A40] text-white rounded-md">
              <Check className="w-4 h-4" />
            </div>
            <span>{saveFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveFeedback(null)}
            className="text-[#7A7A66] hover:text-[#3D3D33] p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editing Mode Indicator Banner */}
      {currentEditingSession && (
        <div
          id="editing-register-banner"
          className="bg-[#FFF9F2] border-2 border-[#D4A373] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#D4A373] text-[#3D3D33] rounded-lg mt-0.5 shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#D4A373] text-[#3D3D33] text-[10px] font-extrabold uppercase px-2 py-0.5 rounded font-mono">
                  EDITING SAVED REGISTER
                </span>
                <h4 className="text-sm font-serif font-bold text-[#3D3D33]">
                  {currentEditingSession.activityName} — {currentEditingSession.date}
                </h4>
              </div>
              <p className="text-xs text-[#7A7A66] mt-1">
                You are currently correcting a previously saved attendance sheet. Change any member's status (Present/Absent), modify the date or service, and click <strong>"UPDATE SAVED REGISTER"</strong> to commit your changes.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="cancel-edit-register-banner-btn"
            onClick={cancelEditingSession}
            className="px-3 py-1.5 text-xs font-bold text-[#7A7A66] hover:text-[#3D3D33] bg-white border border-[#E6E4DD] rounded-lg hover:bg-[#FAF9F6] transition-colors cursor-pointer shadow-xs self-end md:self-auto shrink-0"
          >
            Cancel Editing
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Configure Sheet Session */}
        <div className="bg-[#F5F2ED] rounded-xl border border-[#E6E4DD] shadow-sm p-5 space-y-4 h-fit">
          <div className="flex items-center justify-between border-b border-[#E6E4DD] pb-2">
            <h3 className="text-base font-serif font-bold text-[#3D3D33] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#5A5A40]" />
              Session Details
            </h3>
            {editingSessionId && (
              <span className="text-[10px] font-bold text-[#D4A373] uppercase font-mono">
                Edit Mode
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#7A7A66] uppercase tracking-wider mb-1.5">
                Activity / Service
              </label>
              <select
                id="attendance-activity-select"
                value={selectedActivityId}
                onChange={(e) => {
                  setSelectedActivityId(e.target.value);
                  if (!editingSessionId) {
                    setSheetInitialized(false);
                  }
                }}
                className="w-full text-sm px-3 py-2 border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] bg-white cursor-pointer text-[#3D3D33]"
              >
                {activities.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.name} ({act.dayOfWeek})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#7A7A66] uppercase tracking-wider mb-1.5">
                Service Date
              </label>
              <input
                id="attendance-date-input"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full text-sm px-3.5 py-2 border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] bg-white text-[#3D3D33]"
              />
            </div>

            {/* Smart saved register detector prompt */}
            {existingSessionForDate && (
              <div className="bg-[#FFF9F2] border border-[#D4A373] rounded-lg p-3 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#D4A373] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#3D3D33]">Saved Register Found</p>
                    <p className="text-[#7A7A66] text-[11px] leading-relaxed mt-0.5">
                      A register for this service on <strong>{sessionDate}</strong> was already saved ({existingSessionForDate.records.filter((r) => r.status === 'Present' || r.isSickAtTime).length} marked present).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="load-existing-session-btn"
                  onClick={() => startEditingSession(existingSessionForDate)}
                  className="w-full py-1.5 px-2 bg-[#D4A373] hover:bg-[#c49261] text-[#3D3D33] font-bold text-xs rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Load & Edit This Saved Register
                </button>
              </div>
            )}

            {visibleMembers.length === 0 ? (
              <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-3.5 text-xs text-[#B25E5E] flex gap-2">
                <ShieldAlert className="w-4 h-4 text-[#B25E5E] shrink-0 mt-0.5" />
                <p>
                  No visible members are registered. Make sure at least one member has "Status" visibility toggled ON in the Member Registry.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  id="submit-attendance-btn"
                  type="submit"
                  className={`w-full py-2.5 px-4 rounded-lg transition-all text-xs font-bold tracking-wide flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                    editingSessionId
                      ? 'bg-[#D4A373] hover:bg-[#c49261] text-[#3D3D33]'
                      : 'bg-[#5A5A40] hover:bg-[#4E4E37] text-white'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {editingSessionId ? 'UPDATE SAVED REGISTER' : 'SAVE ATTENDANCE SHEET'}
                </button>

                {editingSessionId && (
                  <button
                    type="button"
                    onClick={cancelEditingSession}
                    className="w-full py-1.5 px-3 bg-white border border-[#E6E4DD] text-[#7A7A66] hover:text-[#3D3D33] rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>
            )}
          </form>

          {/* Sickness Clause Note */}
          <div className="bg-white border border-[#E6E4DD] rounded-lg p-3.5 text-xs text-[#7A7A66] space-y-1">
            <p className="font-bold text-[#3D3D33] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-[#5A5A40]" />
              Sickness Attendance Note
            </p>
            <p className="leading-relaxed">
              When a member is recorded as "Sick", the system automatically treats them as present for calculation percentage.
            </p>
          </div>
        </div>

        {/* Right Content: Attendance Sheet list */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E6E4DD] shadow-sm p-5 space-y-4">
          <div className="border-b border-[#E6E4DD] pb-3">
            <h3 className="text-base font-serif font-bold text-[#3D3D33]">
              Roll Call List
            </h3>
            {selectedActivity && (
              <p className="text-xs text-[#5A5A40] font-semibold mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#D4A373]" />
                Active Heading: {selectedActivity.name} — {sessionDate}
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table id="attendance-taking-table" className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E6E4DD] text-[11px] font-bold text-[#7A7A66] uppercase tracking-wider bg-[#FAF9F6]">
                  <th className="py-2.5 px-4 w-12">S/N</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Access Code</th>
                  <th className="py-2.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <input
                        id="bulk-select-present"
                        type="checkbox"
                        checked={isAllPresent}
                        onChange={handleBulkToggle}
                        className="w-3.5 h-3.5 rounded border-[#C8C8A9] text-[#5A5A40] focus:ring-[#5A5A40]/20 cursor-pointer accent-[#5A5A40]"
                      />
                      <label htmlFor="bulk-select-present" className="cursor-pointer font-bold select-none text-[11px] text-[#7A7A66] uppercase tracking-wider">
                        Status Selection (All Present)
                      </label>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E4DD]">
                {visibleMembers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-[#7A7A66] text-xs font-medium">
                      No visible members in sheet.
                    </td>
                  </tr>
                ) : (
                  visibleMembers.map((m, index) => {
                    const currentStatus = m.isSick ? 'Present' : recordsState[m.id] || 'Present';
                    return (
                      <tr key={m.id} id={`sheet-row-${m.id}`} className="hover:bg-[#FAF9F6]/50">
                        {/* Serial Number */}
                        <td className="py-3 px-4 text-xs font-mono text-[#7A7A66]">
                          {index + 1}
                        </td>

                        {/* Member Name */}
                        <td className="py-3 px-3">
                          <div>
                            <span className="text-xs font-bold text-[#3D3D33]">
                              {m.title}. {m.name}
                            </span>
                            {m.isSick && (
                              <span className="ml-2 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FAF9F6] text-[#5A5A40] border border-[#E6E4DD]">
                                Sick (Auto-Present)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Access Code */}
                        <td className="py-3 px-3 text-xs text-[#7A7A66] font-mono font-medium">
                          {m.accessCode}
                        </td>

                        {/* Toggle Status */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex rounded-md border border-[#E6E4DD] p-0.5 bg-[#FAF9F6]">
                            <button
                              id={`sheet-present-btn-${m.id}`}
                              type="button"
                              disabled={m.isSick}
                              onClick={() => handleStatusChange(m.id, 'Present')}
                              className={`px-3 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${
                                currentStatus === 'Present'
                                  ? 'bg-[#5A5A40] text-white shadow-sm'
                                  : 'text-[#7A7A66] hover:text-[#3D3D33]'
                              } ${m.isSick ? 'bg-[#FAF9F6] text-[#5A5A40] border border-[#E6E4DD] font-bold' : ''}`}
                            >
                              Present
                            </button>
                            <button
                              id={`sheet-absent-btn-${m.id}`}
                              type="button"
                              disabled={m.isSick}
                              onClick={() => handleStatusChange(m.id, 'Absent')}
                              className={`px-3 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${
                                currentStatus === 'Absent'
                                  ? 'bg-[#D4A373] text-white shadow-sm'
                                  : 'text-[#7A7A66] hover:text-[#3D3D33]'
                              } ${m.isSick ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Welfare Radar Panel */}
      <div id="care-outreach-radar" className="bg-white rounded-xl border border-[#E6E4DD] shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E4DD] pb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#B25E5E] fill-[#B25E5E]/20" />
            <div>
              <h3 className="text-base font-serif font-bold text-[#3D3D33]">
                Care & Welfare Notice (Last 4 Weeks)
              </h3>
              <p className="text-xs text-[#7A7A66]">
                Quickly flag, track, and record contact for members with low attendance.
              </p>
            </div>
          </div>
          
          {/* Filtering Toggles */}
          {totalSessionsCount > 0 && (
            <div className="flex items-center gap-1.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-0.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setOutreachFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${
                  outreachFilter === 'all'
                    ? 'bg-[#5A5A40] text-white'
                    : 'text-[#7A7A66] hover:text-[#3D3D33]'
                }`}
              >
                All Low ({
                  visibleMembers.filter(m => {
                    let presentCount = 0;
                    last4WeeksSessions.forEach(s => {
                      if (m.isSick) presentCount++;
                      else {
                        const rec = s.records.find(r => r.memberId === m.id);
                        if (rec && (rec.isSickAtTime || rec.status === 'Present')) presentCount++;
                      }
                    });
                    const pct = totalSessionsCount > 0 ? Math.round((presentCount / totalSessionsCount) * 100) : 100;
                    return pct < 50;
                  }).length
                })
              </button>
              <button
                type="button"
                onClick={() => setOutreachFilter('zero')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${
                  outreachFilter === 'zero'
                    ? 'bg-[#B25E5E] text-white'
                    : 'text-[#7A7A66] hover:text-[#3D3D33]'
                }`}
              >
                Zero (0%) ({
                  visibleMembers.filter(m => {
                    let presentCount = 0;
                    last4WeeksSessions.forEach(s => {
                      if (m.isSick) presentCount++;
                      else {
                        const rec = s.records.find(r => r.memberId === m.id);
                        if (rec && (rec.isSickAtTime || rec.status === 'Present')) presentCount++;
                      }
                    });
                    const pct = totalSessionsCount > 0 ? Math.round((presentCount / totalSessionsCount) * 100) : 100;
                    return pct === 0;
                  }).length
                })
              </button>
              <button
                type="button"
                onClick={() => setOutreachFilter('poor')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${
                  outreachFilter === 'poor'
                    ? 'bg-[#D4A373] text-white'
                    : 'text-[#7A7A66] hover:text-[#3D3D33]'
                }`}
              >
                {"Very Poor (<50%)"} ({
                  visibleMembers.filter(m => {
                    let presentCount = 0;
                    last4WeeksSessions.forEach(s => {
                      if (m.isSick) presentCount++;
                      else {
                        const rec = s.records.find(r => r.memberId === m.id);
                        if (rec && (rec.isSickAtTime || rec.status === 'Present')) presentCount++;
                      }
                    });
                    const pct = totalSessionsCount > 0 ? Math.round((presentCount / totalSessionsCount) * 100) : 100;
                    return pct > 0 && pct < 50;
                  }).length
                })
              </button>
            </div>
          )}
        </div>

        {totalSessionsCount === 0 ? (
          <div className="text-center py-8 text-[#7A7A66] text-xs bg-[#FAF9F6] border border-dashed border-[#E6E4DD] rounded-xl">
            No attendance sheets recorded in the last 4 weeks (28 days).
            <br />
            Create and save an attendance session to populate this Care Radar automatically!
          </div>
        ) : poorAttendanceMembers.length === 0 ? (
          <div className="text-center py-8 text-[#5A5A40] text-xs font-semibold bg-[#FAF9F6] border border-[#E6E4DD] rounded-xl flex flex-col items-center gap-2">
            <span className="text-lg">🎉</span>
            Excellent! Every active member in the congregation has standard attendance (50% or above) in the last 4 weeks.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {poorAttendanceMembers.map(({ member, presentCount, percentage }) => {
              const status = member.outreachStatus || 'none';
              const isEditingNote = editingNotesMemberId === member.id;

              let statusBadgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
              let statusLabel = 'No Action';
              
              if (status === 'pending') {
                statusBadgeClass = 'bg-red-50 text-red-600 border-red-200';
                statusLabel = 'Needs Outreach';
              } else if (status === 'contacted') {
                statusBadgeClass = 'bg-amber-50 text-amber-600 border-amber-200';
                statusLabel = 'Contacted';
              } else if (status === 'resolved') {
                statusBadgeClass = 'bg-green-50 text-green-600 border-green-200';
                statusLabel = 'Resolved';
              }

              return (
                <div
                  key={member.id}
                  id={`outreach-card-${member.id}`}
                  className="p-4 rounded-xl border border-[#E6E4DD] bg-[#FAF9F6]/30 hover:bg-[#FAF9F6]/50 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-[#3D3D33] font-serif">
                          {member.title}. {member.name}
                        </h4>
                        <p className="text-[10px] text-[#7A7A66] font-mono mt-0.5">
                          Code: {member.accessCode} • Status: {member.isSick ? 'Marked Sick' : 'Active'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded-lg ${
                          percentage === 0 ? 'bg-[#FDF2F2] text-[#B25E5E]' : 'bg-[#FFF9F2] text-[#D4A373]'
                        }`}>
                          {percentage}%
                        </span>
                        <p className="text-[9px] text-[#7A7A66] font-mono mt-0.5">
                          {presentCount}/{totalSessionsCount} sessions
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}>
                        {statusLabel}
                      </span>
                      {member.outreachNotes && (
                        <p className="text-[11px] text-[#5A5A40] italic line-clamp-1 bg-[#FAF9F6] px-1.5 py-0.5 rounded border border-[#E6E4DD]/60 flex-1">
                          "{member.outreachNotes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="pt-2 border-t border-[#E6E4DD]/60 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5 justify-between">
                      <span className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider">
                        Set Status:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => onUpdateMember && onUpdateMember(member.id, { outreachStatus: 'pending' })}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md border cursor-pointer transition-all ${
                            status === 'pending'
                              ? 'bg-[#B25E5E] text-white border-[#B25E5E]'
                              : 'bg-white text-[#B25E5E] border-[#FAD2D2] hover:bg-[#FDF2F2]'
                          }`}
                        >
                          Flag
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateMember && onUpdateMember(member.id, { outreachStatus: 'contacted' })}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md border cursor-pointer transition-all ${
                            status === 'contacted'
                              ? 'bg-[#D4A373] text-white border-[#D4A373]'
                              : 'bg-white text-[#D4A373] border-[#FAF0E6] hover:bg-[#FFF9F2]'
                          }`}
                        >
                          Contacted
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateMember && onUpdateMember(member.id, { outreachStatus: 'resolved' })}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md border cursor-pointer transition-all ${
                            status === 'resolved'
                              ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                              : 'bg-white text-[#5A5A40] border-[#E6E4DD] hover:bg-[#FAF9F6]'
                          }`}
                        >
                          Resolve
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateMember && onUpdateMember(member.id, { outreachStatus: 'none' })}
                          className="px-2 py-0.5 text-[10px] font-semibold rounded-md border border-[#E6E4DD] bg-white text-[#7A7A66] hover:bg-[#FAF9F6] cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Note Editor */}
                    <div className="bg-white rounded-lg p-2 border border-[#E6E4DD]">
                      {isEditingNote ? (
                        <div className="space-y-1.5">
                          <textarea
                            id={`outreach-note-input-${member.id}`}
                            value={tempNotesText}
                            onChange={(e) => setTempNotesText(e.target.value)}
                            placeholder="Add brief details (e.g. sick, traveling, called James)"
                            className="w-full text-xs p-1.5 border border-[#E6E4DD] rounded bg-white text-[#3D3D33] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                            rows={2}
                          />
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingNotesMemberId(null)}
                              className="px-2 py-1 text-[10px] font-semibold text-[#7A7A66] bg-white border border-[#E6E4DD] rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateMember) {
                                  onUpdateMember(member.id, { outreachNotes: tempNotesText });
                                }
                                setEditingNotesMemberId(null);
                              }}
                              className="px-2 py-1 text-[10px] font-bold text-white bg-[#5A5A40] rounded cursor-pointer"
                            >
                              Save Note
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-[10px] text-[#7A7A66] italic truncate max-w-[200px]">
                            {member.outreachNotes ? member.outreachNotes : "No outreach notes yet..."}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNotesMemberId(member.id);
                              setTempNotesText(member.outreachNotes || '');
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#5A5A40] hover:underline cursor-pointer shrink-0"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                            {member.outreachNotes ? 'Edit' : 'Add Note'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical Sessions Section */}
      <div className="bg-white rounded-xl border border-[#E6E4DD] shadow-sm p-5 space-y-4">
        <h3 className="text-base font-serif font-bold text-[#3D3D33] flex items-center gap-2 border-b border-[#E6E4DD] pb-2">
          <ListFilter className="w-4 h-4 text-[#5A5A40]" />
          Attendance History Logs ({sessions.length} sessions)
        </h3>

        <div className="overflow-x-auto">
          <table id="attendance-history-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E6E4DD] text-[11px] font-bold text-[#7A7A66] uppercase tracking-wider bg-[#FAF9F6]">
                <th className="py-2.5 px-4">Activity Name</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-center">Present Headcount</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E4DD] text-xs">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#7A7A66] font-medium">
                    No session logs found. Create your first attendance sheet above.
                  </td>
                </tr>
              ) : (
                [...sessions]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((session) => {
                    const presentCount = session.records.filter((r) => r.status === 'Present' || r.isSickAtTime).length;
                    const totalCount = session.records.length;
                    const isCurrentlyEditing = editingSessionId === session.id;
                    const isExpanded = expandedSessionId === session.id;

                    // Present & Absent member rosters for inspection
                    const presentMembers = session.records
                      .filter((r) => r.status === 'Present' || r.isSickAtTime)
                      .map((r) => {
                        const m = members.find((mem) => mem.id === r.memberId);
                        return { id: r.memberId, name: m ? `${m.title}. ${m.name}` : r.memberId, isSick: r.isSickAtTime };
                      });

                    const absentMembers = session.records
                      .filter((r) => r.status === 'Absent' && !r.isSickAtTime)
                      .map((r) => {
                        const m = members.find((mem) => mem.id === r.memberId);
                        return { id: r.memberId, name: m ? `${m.title}. ${m.name}` : r.memberId };
                      });

                    return (
                      <React.Fragment key={session.id}>
                        <tr
                          id={`session-row-${session.id}`}
                          className={`transition-colors ${
                            isCurrentlyEditing
                              ? 'bg-[#FFF9F2] font-semibold'
                              : 'hover:bg-[#FAF9F6]'
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-[#3D3D33]">
                            <div className="flex items-center gap-2">
                              {session.activityName}
                              {isCurrentlyEditing && (
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#D4A373] text-[#3D3D33] font-mono font-bold">
                                  In Edit
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-[#7A7A66]">
                            {session.date}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block px-2.5 py-0.5 rounded-full font-semibold bg-[#F5F2ED] text-[#5A5A40]">
                              {presentCount} / {totalCount} ({totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0}%)
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Roster preview toggle */}
                              <button
                                type="button"
                                id={`toggle-roster-btn-${session.id}`}
                                onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                                className={`text-[11px] px-2 py-1 rounded-md border transition-colors cursor-pointer flex items-center gap-1 font-medium ${
                                  isExpanded
                                    ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                                    : 'bg-white text-[#7A7A66] hover:text-[#3D3D33] border-[#E6E4DD] hover:bg-[#FAF9F6]'
                                }`}
                                title="View attendance roster"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{isExpanded ? 'Hide' : 'Roster'}</span>
                              </button>

                              {/* Edit Register Button */}
                              <button
                                type="button"
                                id={`edit-session-btn-${session.id}`}
                                onClick={() => startEditingSession(session)}
                                className={`text-[11px] px-2.5 py-1 rounded-md border transition-all cursor-pointer font-bold flex items-center gap-1 shadow-2xs ${
                                  isCurrentlyEditing
                                    ? 'bg-[#D4A373] text-[#3D3D33] border-[#D4A373]'
                                    : 'bg-[#5A5A40] text-white hover:bg-[#4E4E37] border-[#5A5A40]'
                                }`}
                                title="Edit this register in the roll call form"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>{isCurrentlyEditing ? 'Editing Now' : 'Edit Register'}</span>
                              </button>

                              {/* Delete Session Button */}
                              <button
                                type="button"
                                id={`delete-session-btn-${session.id}`}
                                onClick={() => {
                                  if (confirm(`Are you sure you want to permanently delete this attendance session for ${session.activityName} (${session.date})? This will update congregation averages.`)) {
                                    onDeleteSession(session.id);
                                    if (editingSessionId === session.id) {
                                      cancelEditingSession();
                                    }
                                  }
                                }}
                                className="text-xs text-[#B25E5E] hover:text-white hover:bg-[#B25E5E] p-1 rounded-md border border-[#FAD2D2] transition-colors cursor-pointer"
                                title="Delete attendance session"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Breakdown Drawer */}
                        {isExpanded && (
                          <tr className="bg-[#FAF9F6] border-b border-[#E6E4DD]">
                            <td colSpan={4} className="p-4 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6E4DD] pb-2">
                                <div className="flex items-center gap-2">
                                  <ClipboardCheck className="w-4 h-4 text-[#5A5A40]" />
                                  <h5 className="text-xs font-serif font-bold text-[#3D3D33]">
                                    Attendance Roster: {session.activityName} ({session.date})
                                  </h5>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => startEditingSession(session)}
                                  className="text-xs font-bold text-[#5A5A40] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Make Corrections to this Register
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                {/* Present Members */}
                                <div className="p-3 bg-white border border-[#E6E4DD] rounded-xl space-y-2 shadow-2xs">
                                  <div className="flex items-center justify-between border-b border-[#E6E4DD] pb-1.5">
                                    <span className="font-bold text-[#5A5A40] flex items-center gap-1.5">
                                      <Check className="w-3.5 h-3.5" />
                                      Present ({presentMembers.length})
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pt-1">
                                    {presentMembers.length === 0 ? (
                                      <span className="text-[11px] text-[#7A7A66] italic">No members marked present.</span>
                                    ) : (
                                      presentMembers.map((m) => (
                                        <span
                                          key={m.id}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[#FAF9F6] border border-[#E6E4DD] text-[#3D3D33]"
                                        >
                                          {m.name}
                                          {m.isSick && (
                                            <span className="text-[9px] text-[#5A5A40] font-bold bg-[#E6E4DD] px-1 rounded">
                                              Sick
                                            </span>
                                          )}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                </div>

                                {/* Absent Members */}
                                <div className="p-3 bg-white border border-[#E6E4DD] rounded-xl space-y-2 shadow-2xs">
                                  <div className="flex items-center justify-between border-b border-[#E6E4DD] pb-1.5">
                                    <span className="font-bold text-[#B25E5E] flex items-center gap-1.5">
                                      <X className="w-3.5 h-3.5" />
                                      Absent ({absentMembers.length})
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pt-1">
                                    {absentMembers.length === 0 ? (
                                      <span className="text-[11px] text-[#5A5A40] italic font-medium">
                                        Full attendance! No absent members recorded.
                                      </span>
                                    ) : (
                                      absentMembers.map((m) => (
                                        <span
                                          key={m.id}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[#FDF2F2] border border-[#FAD2D2] text-[#B25E5E]"
                                        >
                                          {m.name}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
