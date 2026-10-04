import { useState, useEffect } from 'react';
import { Member, Activity, AttendanceSession, UserRole, AttendanceRecord, MemberTitle, HouseFellowshipNotice } from './types';
import { LoginPage } from './components/LoginPage';
import { AdminDashboard } from './components/AdminDashboard';
import { MemberManagement } from './components/MemberManagement';
import { AttendanceTaking } from './components/AttendanceTaking';
import { MemberDetails } from './components/MemberDetails';
import { SettingsPage } from './components/SettingsPage';
import { GoogleSyncPanel } from './components/GoogleSyncPanel';
import { NoticeboardCard } from './components/NoticeboardCard';
import { getCachedToken, syncToSpreadsheet, initAuth } from './utils/googleWorkspace';
import {
  getMembersFromFirestore,
  addMemberToFirestore,
  updateMemberInFirestore,
  deleteMemberFromFirestore,
  getActivitiesFromFirestore,
  addActivityToFirestore,
  updateActivityInFirestore,
  deleteActivityFromFirestore,
  getSessionsFromFirestore,
  addSessionToFirestore,
  updateSessionInFirestore,
  deleteSessionFromFirestore,
  getHouseFellowshipNoticeFromFirestore,
  saveHouseFellowshipNoticeInFirestore
} from './lib/firebase';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Settings,
  User,
  Shield,
  Activity as ActivityIcon,
  HelpCircle,
  Clock,
  Heart,
  LogOut,
  Key,
  Download,
  Smartphone,
  Sparkles,
  Share2,
  X
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  // --- 1. State Initialization with Real Firestore sync ---
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [notice, setNotice] = useState<HouseFellowshipNotice | null>(null);
  const [loading, setLoading] = useState(true);

  // Real Authentic Role & Portal Access State
  const [currentRole, setCurrentRole] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem('church_user_role') || sessionStorage.getItem('church_user_role');
    return saved ? (saved as UserRole) : null;
  });
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(() => {
    return localStorage.getItem('church_user_member_id') || sessionStorage.getItem('church_user_member_id');
  });

  // --- PWA Installation Support ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if app is already running as standalone (installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // Check if dismissed in this browser session
    const isDismissed = localStorage.getItem('pwa_install_prompt_dismissed') === 'true';
    if (isDismissed) {
      return;
    }

    // Detect if device is iOS (iPhone/iPad/iPod)
    const iosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iosDevice);

    if (iosDevice) {
      // iOS doesn't support 'beforeinstallprompt', so we proactively prompt with manual guide
      // Wait slightly after launch to make it feel natural
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default prompt
      e.preventDefault();
      // Stash the event
      setDeferredPrompt(e);
      // Show the beautiful prompt after 3 seconds so they see the app load first
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // Toggle step-by-step instructions for Apple Safari users
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    // Trigger the native installation flow
    deferredPrompt.prompt();

    // Await user's selection
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User installation choice outcome: ${outcome}`);

    // Clean up
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismissPrompt = () => {
    setShowInstallPrompt(false);
    // Persist user dismissal choice
    localStorage.setItem('pwa_install_prompt_dismissed', 'true');
  };

  // --- Real-Time Sync & Initialization from Firestore ---
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Step 1: Fetch collections from Firestore
        const [dbMembers, dbActivities, dbSessions, dbNotice] = await Promise.all([
          getMembersFromFirestore(),
          getActivitiesFromFirestore(),
          getSessionsFromFirestore(),
          getHouseFellowshipNoticeFromFirestore()
        ]);

        // Step 3: Populate React client state
        setMembers(dbMembers);
        setActivities(dbActivities);
        setSessions(dbSessions);
        setNotice(dbNotice);
      } catch (err) {
        console.error('Error fetching data from Firestore:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpdateNotice = async (updatedNotice: HouseFellowshipNotice) => {
    try {
      await saveHouseFellowshipNoticeInFirestore(updatedNotice);
      setNotice(updatedNotice);
    } catch (err) {
      console.error('Error updating noticeboard notice:', err);
      throw err;
    }
  };

  const handleLogin = (role: UserRole, memberId: string | null, rememberMe: boolean) => {
    setCurrentRole(role);
    setSelectedMemberId(memberId);
    if (rememberMe) {
      localStorage.setItem('church_user_role', role);
      if (memberId) {
        localStorage.setItem('church_user_member_id', memberId);
      }
      sessionStorage.removeItem('church_user_role');
      sessionStorage.removeItem('church_user_member_id');
    } else {
      sessionStorage.setItem('church_user_role', role);
      if (memberId) {
        sessionStorage.setItem('church_user_member_id', memberId);
      }
      localStorage.removeItem('church_user_role');
      localStorage.removeItem('church_user_member_id');
    }
  };

  const handleSignOut = () => {
    setCurrentRole(null);
    setSelectedMemberId(null);
    setSelectedDetailMember(null);
    localStorage.removeItem('church_user_role');
    localStorage.removeItem('church_user_member_id');
    sessionStorage.removeItem('church_user_role');
    sessionStorage.removeItem('church_user_member_id');
  };

  // Navigation state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'registry' | 'rollcall' | 'settings'>('dashboard');
  const [selectedDetailMember, setSelectedDetailMember] = useState<Member | null>(null);
  const [sessionToEditId, setSessionToEditId] = useState<string | null>(null);

  // --- Google Auth Initialization ---
  useEffect(() => {
    initAuth();
  }, []);

  // --- Google Sheets Real-Time Sync Effect ---
  useEffect(() => {
    const spreadsheetId = localStorage.getItem('google_spreadsheet_id');
    const realTimeSyncEnabled = localStorage.getItem('google_realtime_sync') !== 'false';
    const token = getCachedToken();
    if (token && spreadsheetId && realTimeSyncEnabled && !loading) {
      syncToSpreadsheet(token, spreadsheetId, members, activities, sessions).catch((e) => {
        console.error('Real-Time Sync Error:', e);
      });
    }
  }, [members, activities, sessions, loading]);

  // Adjust view when role changes
  useEffect(() => {
    if (currentRole === 'Member') {
      setSelectedDetailMember(null); // Managed by direct viewport binding
    } else {
      // Return to dashboard when switching to Admin/Secretary
      setActiveTab('dashboard');
    }
  }, [currentRole]);

  // --- 3. Member Handlers ---
  const handleAddMember = async (
    title: MemberTitle,
    name: string,
    isSick: boolean,
    isVisible: boolean,
    birthday?: string,
    phone?: string,
    email?: string,
    address?: string
  ) => {
    // Generate unique 7-digit alphanumeric code
    let accessCode = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let isUnique = false;
    while (!isUnique) {
      let code = '';
      for (let i = 0; i < 7; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (!members.some((m) => m.accessCode === code)) {
        accessCode = code;
        isUnique = true;
      }
    }

    const newMember: Member = {
      id: `m_${Date.now()}`,
      title,
      name,
      isSick,
      isVisible,
      role: 'member',
      accessCode,
      birthday: birthday || '',
      phone: phone || '',
      email: email || '',
      address: address || '',
    };

    try {
      await addMemberToFirestore(newMember);
      setMembers((prev) => [...prev, newMember]);
    } catch (err) {
      console.error('Error adding member to firestore:', err);
    }
  };

  const handleUpdateMember = async (id: string, updates: Partial<Member>) => {
    try {
      await updateMemberInFirestore(id, updates);
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
      );
      // Sync in-view details if the edited member is currently viewed
      if (selectedDetailMember && selectedDetailMember.id === id) {
        setSelectedDetailMember((prev) => (prev ? { ...prev, ...updates } : null));
      }
    } catch (err) {
      console.error('Error updating member in firestore:', err);
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      await deleteMemberFromFirestore(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      if (selectedDetailMember && selectedDetailMember.id === id) {
        setSelectedDetailMember(null);
      }
    } catch (err) {
      console.error('Error deleting member from firestore:', err);
    }
  };

  // --- 4. Activity Handlers ---
  const handleAddActivity = async (name: string, dayOfWeek: string) => {
    const newAct: Activity = {
      id: `a_${Date.now()}`,
      name,
      dayOfWeek,
    };
    try {
      await addActivityToFirestore(newAct);
      setActivities((prev) => [...prev, newAct]);
    } catch (err) {
      console.error('Error adding activity to firestore:', err);
    }
  };

  const handleUpdateActivity = async (id: string, name: string, dayOfWeek: string) => {
    try {
      await updateActivityInFirestore(id, { name, dayOfWeek });
      setActivities((prev) =>
        prev.map((a) => (a.id === id ? { ...a, name, dayOfWeek } : a))
      );
    } catch (err) {
      console.error('Error updating activity in firestore:', err);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      await deleteActivityFromFirestore(id);
      setActivities((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Error deleting activity from firestore:', err);
    }
  };

  // --- 5. Attendance Session Handlers ---
  const handleSaveSession = async (
    activityId: string,
    date: string,
    records: AttendanceRecord[],
    editingSessionId?: string
  ) => {
    const activity = activities.find((a) => a.id === activityId);
    if (!activity) return;

    // Use explicit editingSessionId if editing, or match an existing session on same activity and date, or generate new id
    let targetSessionId = editingSessionId;
    if (!targetSessionId) {
      const existing = sessions.find((s) => s.activityId === activityId && s.date === date);
      targetSessionId = existing ? existing.id : `s_${Date.now()}`;
    }

    const newSession: AttendanceSession = {
      id: targetSessionId,
      activityId,
      activityName: activity.name,
      date,
      records,
    };

    try {
      await addSessionToFirestore(newSession);
      setSessions((prev) => {
        const existingIndex = prev.findIndex((s) => s.id === targetSessionId);
        if (existingIndex >= 0) {
          const copy = [...prev];
          copy[existingIndex] = newSession;
          return copy;
        } else {
          return [...prev, newSession];
        }
      });
    } catch (err) {
      console.error('Error saving session to firestore:', err);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSessionFromFirestore(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error('Error deleting session from firestore:', err);
    }
  };

  // --- 6. Active Member lookup for simulated Member viewpoint ---
  const activeSimulatedMember = members.find((m) => m.id === selectedMemberId);

  // --- 7. Layout and View Filtering ---
  const renderTabNavigation = () => {
    if (currentRole === 'Member') return null; // No tabs for members

    const tabs = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'registry', label: 'Member Registry', icon: Users },
      { id: 'rollcall', label: 'Take Attendance', icon: ClipboardCheck },
    ];

    // Settings page is Admin ONLY
    if (currentRole === 'Admin') {
      tabs.push({ id: 'settings', label: 'Settings', icon: Settings });
    }

    return (
      <div className="flex border-b border-[#E6E4DD] bg-[#FAF9F6] shadow-sm overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && !selectedDetailMember;
          return (
            <button
              key={tab.id}
              id={`tab-nav-${tab.id}`}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedDetailMember(null);
              }}
              className={`flex items-center gap-2 py-4 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-[#5A5A40] text-[#5A5A40] bg-white font-bold'
                  : 'border-transparent text-[#7A7A66] hover:text-[#3D3D33] hover:bg-[#FAF9F6]/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center items-center px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-[#E6E4DD] border-t-[#5A5A40] rounded-full animate-spin mx-auto"></div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#5A5A40] font-sans">
              Connecting to Registry
            </h3>
            <p className="text-xs text-[#7A7A66] font-sans">
              Synchronizing with real-time church cloud database...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentRole) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#3D3D33] font-sans flex flex-col antialiased">
        <LoginPage
          members={members}
          onLogin={handleLogin}
        />
        <footer className="bg-white border-t border-[#E6E4DD] py-5 text-center mt-auto">
          <p className="text-xs text-[#7A7A66] font-sans">
            Isolo Church of Christ Attendance Tracker • Secure Local Congregation Management • Standard UTC Time Sandbox
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#3D3D33] font-sans flex flex-col antialiased">
      {/* 1. Real Authenticated Header */}
      <header id="header-auth" className="bg-[#5A5A40] text-white border-b border-[#4E4E37] px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#4E4E37] rounded-lg border border-white/10 w-10 h-10 overflow-hidden flex items-center justify-center">
            <img 
              src="/pwa_icon_512.jpg" 
              alt="Isolo Logo" 
              className="w-full h-full object-cover rounded-md"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-xs md:text-sm font-serif font-bold tracking-wider text-white">
              ISOLO CHURCH OF CHRIST
            </h1>
            <p className="text-[10px] md:text-xs font-sans text-[#C8C8A9] tracking-tight font-medium">
              Attendance & Registry Tracker Portal
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-[#4E4E37]/50 pt-2 sm:pt-0">
          {/* User Role Badge */}
          <div className="flex items-center gap-2">
            {currentRole === 'Admin' && (
              <span className="flex items-center gap-1.5 bg-[#D4A373] text-[#3D3D33] px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                <Shield className="w-3.5 h-3.5" />
                Admin Workspace
              </span>
            )}
            {currentRole === 'Secretary' && (
              <span className="flex items-center gap-1.5 bg-white text-[#5A5A40] px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                <Key className="w-3.5 h-3.5" />
                Secretary Workspace
              </span>
            )}
            {currentRole === 'Member' && activeSimulatedMember && (
              <span className="flex items-center gap-1.5 bg-[#4E4E37] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border border-white/5">
                <User className="w-3.5 h-3.5 text-[#D4A373]" />
                {activeSimulatedMember.title}. {activeSimulatedMember.name} (Member)
              </span>
            )}
          </div>

          {/* Sign Out Button */}
          <button
            id="sign-out-btn"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 bg-[#4E4E37] hover:bg-[#3D3D33] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide text-white transition-all cursor-pointer shadow-sm animate-pulse-subtle"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* 2. Primary Navigation Tabs (Only for Admin & Secretary) */}
      {renderTabNavigation()}

      {/* 3. Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">

        {/* Render Viewport */}
        {currentRole === 'Member' ? (
          // Authenticated Member View: ONLY can access their own record
          activeSimulatedMember ? (
            <div className="space-y-4">
              <div className="bg-[#5A5A40] text-white p-5 rounded-2xl shadow-sm space-y-1">
                <h3 className="text-lg font-serif font-bold">
                  Welcome back, {activeSimulatedMember.title}. {activeSimulatedMember.name}!
                </h3>
                <p className="text-xs text-[#FAF9F6]/90 leading-relaxed">
                  You are logged into your personalized Member dashboard. You have exclusive access to review your attendance details, performance indexes, and sick records.
                </p>
              </div>

              <NoticeboardCard
                members={members}
                notice={notice}
                onUpdateNotice={handleUpdateNotice}
                currentRole={currentRole}
                currentActorName={`${activeSimulatedMember.title}. ${activeSimulatedMember.name}`}
                onUpdateMember={handleUpdateMember}
              />

              <MemberDetails
                member={activeSimulatedMember}
                activities={activities}
                sessions={sessions}
                onUpdateMember={handleUpdateMember}
                isMemberOnlyView={true}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E6E4DD] p-12 text-center text-[#7A7A66] text-sm font-medium space-y-4">
              <p>Your member profile could not be retrieved from the active congregation registry.</p>
              <button
                onClick={() => {
                  setCurrentRole(null);
                  setSelectedMemberId(null);
                }}
                className="inline-flex items-center gap-1.5 bg-[#5A5A40] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#4E4E37]"
              >
                Return to Login
              </button>
            </div>
          )
        ) : (
          // Admin & Secretary Workspace views
          <div className="space-y-4">
            {selectedDetailMember ? (
              // Shared Member details subview
              <MemberDetails
                member={selectedDetailMember}
                activities={activities}
                sessions={sessions}
                onBack={() => setSelectedDetailMember(null)}
                onUpdateMember={handleUpdateMember}
                isMemberOnlyView={false}
              />
            ) : (
              // Standard primary tabs
              <>
                {activeTab === 'dashboard' && (
                  <div className="space-y-6">
                    <NoticeboardCard
                      members={members}
                      notice={notice}
                      onUpdateNotice={handleUpdateNotice}
                      currentRole={currentRole}
                      currentActorName={
                        activeSimulatedMember
                          ? `${activeSimulatedMember.title}. ${activeSimulatedMember.name}`
                          : undefined
                      }
                      onUpdateMember={handleUpdateMember}
                    />

                    <AdminDashboard
                      members={members}
                      activities={activities}
                      sessions={sessions}
                      onSelectMember={(m) => setSelectedDetailMember(m)}
                      onUpdateMember={handleUpdateMember}
                      onNavigateToEditSession={(sessionId) => {
                        setSessionToEditId(sessionId);
                        setActiveTab('rollcall');
                        setSelectedDetailMember(null);
                      }}
                    />
                    {currentRole === 'Admin' && (
                      <GoogleSyncPanel
                        members={members}
                        activities={activities}
                        sessions={sessions}
                        onImportData={(imported) => {
                          setMembers(imported.members);
                          setActivities(imported.activities);
                          setSessions(imported.sessions);
                        }}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'registry' && (
                  <MemberManagement
                    members={members}
                    onAddMember={handleAddMember}
                    onUpdateMember={handleUpdateMember}
                    onDeleteMember={handleDeleteMember}
                    onSelectMember={(m) => setSelectedDetailMember(m)}
                  />
                )}

                {activeTab === 'rollcall' && (
                  <AttendanceTaking
                    members={members}
                    activities={activities}
                    sessions={sessions}
                    onSaveSession={handleSaveSession}
                    onDeleteSession={handleDeleteSession}
                    onUpdateMember={handleUpdateMember}
                    initialEditingSessionId={sessionToEditId}
                    onClearInitialEditingSessionId={() => setSessionToEditId(null)}
                  />
                )}

                {activeTab === 'settings' && currentRole === 'Admin' && (
                  <SettingsPage
                    activities={activities}
                    onAddActivity={handleAddActivity}
                    onUpdateActivity={handleUpdateActivity}
                    onDeleteActivity={handleDeleteActivity}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* 4. Footer */}
      <footer className="bg-white border-t border-[#E6E4DD] py-5 text-center mt-auto">
        <p className="text-xs text-[#7A7A66] font-sans">
          Isolo Church of Christ Attendance Tracker • Secure Local Congregation Management • Standard UTC Time Sandbox
        </p>
      </footer>

      {/* PWA Installation Prompt Panel */}
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            id="pwa-install-banner"
            className="fixed bottom-0 left-0 w-full md:bottom-6 md:right-6 md:left-auto md:w-96 bg-white border-t md:border border-[#E6E4DD] md:rounded-2xl shadow-2xl p-5 z-50 font-sans"
          >
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-[#FAF9F6] rounded-xl border border-[#E6E4DD] text-[#5A5A40] shrink-0 animate-pulse">
                <Smartphone className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-serif font-bold text-[#3D3D33] flex items-center gap-1.5">
                    Install App <Sparkles className="w-3.5 h-3.5 text-[#D4A373]" />
                  </h3>
                  <button
                    onClick={handleDismissPrompt}
                    className="p-1 hover:bg-[#FAF9F6] rounded-full text-[#7A7A66] hover:text-[#3D3D33] transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-[#7A7A66] mt-1.5 leading-relaxed">
                  Add <strong>Isolo Attendance Tracker</strong> to your home screen for quick offline access, instant load times, and a full-screen experience.
                </p>

                {showIOSInstructions ? (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 p-3 bg-[#FAF9F6] border border-[#E6E4DD] rounded-xl text-[11px] text-[#3D3D33] space-y-2 leading-relaxed"
                  >
                    <p className="font-bold text-[#5A5A40] text-[10px] uppercase tracking-wider">
                      Safari iOS Manual Steps:
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 text-[#5A5A40]">
                      <li>
                        Tap the <strong>Share</strong> button <Share2 className="w-3.5 h-3.5 inline mx-1 text-[#5A5A40]" /> in Safari.
                      </li>
                      <li>
                        Scroll down and select <strong>Add to Home Screen</strong>.
                      </li>
                      <li>
                        Tap <strong>Add</strong> in the top-right corner.
                      </li>
                    </ol>
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={handleInstallClick}
                      className="flex-1 bg-[#5A5A40] hover:bg-[#4E4E37] text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {isIOS ? 'Show Guide' : 'Install now'}
                    </button>
                    <button
                      onClick={handleDismissPrompt}
                      className="flex-1 bg-white hover:bg-[#FAF9F6] border border-[#E6E4DD] text-[#7A7A66] hover:text-[#3D3D33] text-xs font-bold py-2 px-3 rounded-lg text-center transition-all cursor-pointer"
                    >
                      Maybe later
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
