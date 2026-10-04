import React, { useState, useEffect } from 'react';
import { Member, Activity, AttendanceSession } from '../types';
import {
  googleSignIn,
  logout,
  createSpreadsheet,
  syncToSpreadsheet,
  importFromSpreadsheet,
  createCalendarEvent,
} from '../utils/googleWorkspace';
import {
  Cloud,
  RefreshCw,
  FileSpreadsheet,
  Calendar,
  CheckCircle,
  Loader2,
  ExternalLink,
  AlertTriangle,
  ArrowRightLeft,
  Settings,
  HelpCircle
} from 'lucide-react';

interface GoogleSyncPanelProps {
  members: Member[];
  activities: Activity[];
  sessions: AttendanceSession[];
  onImportData: (data: { members: Member[]; activities: Activity[]; sessions: AttendanceSession[] }) => void;
  onSyncTriggered?: () => void;
}

export const GoogleSyncPanel: React.FC<GoogleSyncPanelProps> = ({
  members,
  activities,
  sessions,
  onImportData,
  onSyncTriggered
}) => {
  const [user, setUser] = useState<{ email: string; displayName: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sheets state
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem('google_spreadsheet_id');
  });
  const [realTimeSync, setRealTimeSync] = useState<boolean>(() => {
    const saved = localStorage.getItem('google_realtime_sync');
    return saved !== 'false'; // defaults to true
  });

  // Calendar event state
  const [selectedActivityId, setSelectedActivityId] = useState(activities[0]?.id || '');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [eventUrl, setEventUrl] = useState<string | null>(null);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  useEffect(() => {
    // Automatically login on load if we have cached token & user
    const savedToken = localStorage.getItem('google_access_token');
    const savedUser = localStorage.getItem('google_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setMsg({ type: 'success', text: `Connected successfully to Google account: ${res.user.email}` });
        
        // Notify parent of updated token
        if (onSyncTriggered) onSyncTriggered();
      }
    } catch (err: any) {
      console.error(err);
      setMsg({ type: 'error', text: err.message || 'Google Sign-In failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      setUser(null);
      setToken(null);
      setMsg({ type: 'success', text: 'Disconnected from Google account.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Logout failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSheet = async () => {
    if (!token) {
      setMsg({ type: 'error', text: 'Please sign in to Google first.' });
      return;
    }
    setSyncing(true);
    setMsg(null);
    try {
      const sheetId = await createSpreadsheet(token);
      setSpreadsheetId(sheetId);
      localStorage.setItem('google_spreadsheet_id', sheetId);

      // Immediately sync current local state to the new sheet
      await syncToSpreadsheet(token, sheetId, members, activities, sessions);
      setMsg({
        type: 'success',
        text: 'New Google Sheet database created and synced successfully!'
      });
    } catch (err: any) {
      console.error(err);
      setMsg({ type: 'error', text: err.message || 'Failed to create spreadsheet.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleManualSync = async () => {
    if (!token) {
      setMsg({ type: 'error', text: 'Please sign in to Google first.' });
      return;
    }
    if (!spreadsheetId) {
      setMsg({ type: 'error', text: 'No Google Sheet connected. Create or connect one first.' });
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to replace Google Sheet data with your local attendance records? This will update Members, Activities, and Sessions.'
    );
    if (!confirmed) return;

    setSyncing(true);
    setMsg(null);
    try {
      await syncToSpreadsheet(token, spreadsheetId, members, activities, sessions);
      setMsg({ type: 'success', text: 'Google Sheet successfully updated with local records!' });
    } catch (err: any) {
      console.error(err);
      setMsg({ type: 'error', text: err.message || 'Failed to sync spreadsheet.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleImport = async () => {
    if (!token) {
      setMsg({ type: 'error', text: 'Please sign in to Google first.' });
      return;
    }
    if (!spreadsheetId) {
      setMsg({ type: 'error', text: 'No Google Sheet connected. Create or connect one first.' });
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to IMPORT spreadsheet data? This will overwrite your local church registry and attendance sessions.'
    );
    if (!confirmed) return;

    setSyncing(true);
    setMsg(null);
    try {
      const imported = await importFromSpreadsheet(token, spreadsheetId);
      onImportData(imported);
      setMsg({
        type: 'success',
        text: `Import complete! Loaded ${imported.members.length} members, ${imported.activities.length} services, and ${imported.sessions.length} sessions from Google Sheets.`
      });
    } catch (err: any) {
      console.error(err);
      setMsg({ type: 'error', text: err.message || 'Import failed. Check sheet structure.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleRealTime = () => {
    const newValue = !realTimeSync;
    setRealTimeSync(newValue);
    localStorage.setItem('google_realtime_sync', String(newValue));
    setMsg({
      type: 'success',
      text: newValue
        ? 'Real-Time Sync Enabled! Any edits will automatically update the Google Sheet.'
        : 'Real-Time Sync Disabled.'
    });
  };

  const handleScheduleEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setMsg({ type: 'error', text: 'Please sign in to Google first to access Calendar.' });
      return;
    }
    const activity = activities.find((a) => a.id === selectedActivityId);
    if (!activity) {
      setMsg({ type: 'error', text: 'Please select a valid activity/service.' });
      return;
    }

    const startISO = `${eventDate}T${startTime}:00`;
    const endISO = `${eventDate}T${endTime}:00`;

    setSyncing(true);
    setEventUrl(null);
    try {
      const url = await createCalendarEvent(token, {
        summary: `Isolo Church of Christ - ${activity.name}`,
        description: `Scheduled ${activity.name}. Recurrence day: ${activity.dayOfWeek}. This activity is synchronized with the congregation's attendance entry tracker system.`,
        startDateTime: startISO,
        endDateTime: endISO,
      });
      setEventUrl(url);
      setMsg({
        type: 'success',
        text: `Successfully scheduled "${activity.name}" on Google Calendar!`
      });
    } catch (err: any) {
      console.error(err);
      setMsg({ type: 'error', text: err.message || 'Failed to schedule Calendar event.' });
    } finally {
      setSyncing(false);
    }
  };

  // Keep selectedActivityId in sync if activities list loads
  useEffect(() => {
    if (activities.length > 0 && !selectedActivityId) {
      setSelectedActivityId(activities[0].id);
    }
  }, [activities, selectedActivityId]);

  return (
    <div id="google-sync-panel" className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-2xl p-5 md:p-6 space-y-6">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E6E4DD]">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#5A5A40]/10 text-[#5A5A40] rounded-xl">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-[#3D3D33] flex items-center gap-2">
              Google Workspace Real-Time Sync
            </h3>
            <p className="text-xs text-[#7A7A66]">
              Sync congregation registers, services, attendance records to Google Sheets, and schedule calendar events.
            </p>
          </div>
        </div>

        {/* Auth Button */}
        <div>
          {user ? (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs font-bold text-[#3D3D33]">{user.displayName || 'Authorized User'}</p>
                <p className="text-[10px] text-[#7A7A66]">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="py-1.5 px-3 bg-white text-[#B25E5E] border border-[#FAD2D2] rounded-lg hover:bg-[#FDF2F2] text-xs font-bold transition-all cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleLogin}
                disabled={loading}
                className="gsi-material-button flex items-center gap-2 border border-[#E6E4DD] rounded-lg py-1.5 px-3 bg-white hover:bg-[#FAF9F6] text-xs font-bold text-[#3D3D33] transition-all cursor-pointer shadow-sm animate-pulse-subtle"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                )}
                <span>Sign in with Google</span>
              </button>

              {isInIframe && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 border border-[#C8C8A9] rounded-lg py-1.5 px-3 bg-[#FAF9F6] text-[#5A5A40] hover:bg-[#EAE6DF] text-xs font-bold transition-all cursor-pointer shadow-sm"
                  title="Open application in a new standalone tab to avoid iframe popup blocks"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in New Tab
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notifications / Logs */}
      {msg && (
        <div
          className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs leading-relaxed ${
            msg.type === 'success'
              ? 'bg-[#EBF7EE] text-[#2E6B40] border-[#C3ECD1]'
              : 'bg-[#FDF2F2] text-[#B25E5E] border-[#FAD2D2]'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#2E6B40]" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#B25E5E]" />
          )}
          <div className="space-y-2 flex-1">
            <div>{msg.text}</div>
            {msg.type === 'error' && (msg.text.includes('closed') || msg.text.includes('iframe') || msg.text.includes('popup')) && (
              <div className="pt-1.5">
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-[#B25E5E] hover:bg-[#9E4D4D] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open App in New Tab & Sign In
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Section A: Google Sheets Engine */}
        <div className="bg-white border border-[#E6E4DD] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E6E4DD] pb-2">
            <FileSpreadsheet className="w-4 h-4 text-[#5A5A40]" />
            <h4 className="text-xs font-bold text-[#3D3D33] uppercase tracking-wider">
              Google Sheets Synchronization
            </h4>
          </div>

          {!user ? (
            <div className="py-6 text-center text-xs text-[#7A7A66] space-y-2">
              <p>Authorize Google credentials above to set up real-time Google Sheets tracking.</p>
              <p className="text-[10px] italic">Access is granted strictly with explicit permission.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Spreadsheet Status */}
              <div className="text-xs space-y-1.5 p-3.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg">
                <div className="flex justify-between">
                  <span className="text-[#7A7A66]">Spreadsheet Status:</span>
                  <strong className={spreadsheetId ? 'text-[#2E6B40]' : 'text-[#D4A373]'}>
                    {spreadsheetId ? 'Connected' : 'Not Connected'}
                  </strong>
                </div>
                {spreadsheetId && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-[#7A7A66] overflow-hidden text-ellipsis whitespace-nowrap">
                      ID: <span className="font-mono">{spreadsheetId}</span>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#5A5A40] hover:underline font-bold"
                      >
                        Open Spreadsheet <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Rows */}
              <div className="flex flex-col sm:flex-row gap-2">
                {!spreadsheetId ? (
                  <button
                    onClick={handleCreateSheet}
                    disabled={syncing}
                    className="flex-1 py-2 px-3 bg-[#5A5A40] text-white rounded-lg hover:bg-[#4E4E37] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                    Create New Spreadsheet
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleManualSync}
                      disabled={syncing}
                      className="flex-1 py-2 px-3 bg-[#FAF9F6] text-[#3D3D33] border border-[#E6E4DD] rounded-lg hover:bg-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-[#5A5A40]" />}
                      Sync To Sheet
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={syncing}
                      className="flex-1 py-2 px-3 bg-[#FAF9F6] text-[#3D3D33] border border-[#E6E4DD] rounded-lg hover:bg-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5 text-[#5A5A40]" />}
                      Import From Sheet
                    </button>
                  </>
                )}
              </div>

              {/* Real time toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-[#E6E4DD] text-xs">
                <span className="text-[#3D3D33] font-medium">Real-Time Syncing (Autosave edits)</span>
                <button
                  onClick={handleToggleRealTime}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    realTimeSync ? 'bg-[#5A5A40]' : 'bg-[#E6E4DD]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      realTimeSync ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section B: Google Calendar Scheduling */}
        <div className="bg-white border border-[#E6E4DD] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E6E4DD] pb-2">
            <Calendar className="w-4 h-4 text-[#5A5A40]" />
            <h4 className="text-xs font-bold text-[#3D3D33] uppercase tracking-wider">
              Google Calendar Activities Scheduler
            </h4>
          </div>

          {!user ? (
            <div className="py-6 text-center text-xs text-[#7A7A66] space-y-2">
              <p>Authorize Google credentials above to schedule services directly on your Google Calendar.</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#7A7A66]">
              Please create congregational activities/services first in Settings.
            </div>
          ) : (
            <form onSubmit={handleScheduleEvent} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider mb-1">
                    Select Activity/Service
                  </label>
                  <select
                    value={selectedActivityId}
                    onChange={(e) => setSelectedActivityId(e.target.value)}
                    className="w-full text-xs border border-[#E6E4DD] rounded-lg p-2 bg-[#FAF9F6] text-[#3D3D33]"
                  >
                    {activities.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.dayOfWeek})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full text-xs border border-[#E6E4DD] rounded-lg p-2 bg-[#FAF9F6] text-[#3D3D33]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider mb-1">
                    Start Time (UTC)
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full text-xs border border-[#E6E4DD] rounded-lg p-2 bg-[#FAF9F6] text-[#3D3D33]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider mb-1">
                    End Time (UTC)
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full text-xs border border-[#E6E4DD] rounded-lg p-2 bg-[#FAF9F6] text-[#3D3D33]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={syncing}
                className="w-full py-2 px-3 bg-[#5A5A40] text-white rounded-lg hover:bg-[#4E4E37] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                Schedule Church Activity on Calendar
              </button>

              {eventUrl && (
                <div className="text-center pt-1.5">
                  <a
                    href={eventUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#2E6B40] hover:underline text-xs font-bold"
                  >
                    Open Scheduled Event on Google Calendar <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </form>
          )}
        </div>

      </div>

      {/* Disclaimer on Security / Permissions */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-xl p-3.5 text-[11px] text-[#7A7A66] leading-relaxed flex gap-2.5">
        <HelpCircle className="w-4 h-4 text-[#D4A373] mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-bold text-[#3D3D33] mb-0.5">User Consent & Data Security Policy</p>
          <p>
            Any operation that updates, modifies, or schedules data is done strictly with permission from the app's users.
            Data is securely synchronized directly into the authenticated user's private Google Drive spreadsheets and Google Calendar.
            No persistent data is sent to external servers.
          </p>
        </div>
      </div>
    </div>
  );
};
