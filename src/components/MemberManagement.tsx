import React, { useState } from 'react';
import { Member, MemberTitle } from '../types';
import {
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  UserPlus,
  Check,
  X,
  Users,
  Search,
  CheckSquare,
  Square,
  HelpCircle,
  Copy,
  FileText,
} from 'lucide-react';
import { getAvatarColor } from '../utils';

const parseCSV = (text: string, defaultTitle: MemberTitle): Array<{ title: MemberTitle; name: string }> => {
  const lines = text.split(/\r?\n/);
  const results: Array<{ title: MemberTitle; name: string }> = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Skip potential header rows
    const lowerLine = line.toLowerCase();
    if (
      lowerLine === 'title,name' ||
      lowerLine === 'honorific,name' ||
      lowerLine === 'prefix,name' ||
      lowerLine === 'prefix,fullname' ||
      lowerLine === 'prefix,full name' ||
      lowerLine === 'title,fullname' ||
      lowerLine === 'title,full name' ||
      (lowerLine.startsWith('title') && lowerLine.includes('name'))
    ) {
      continue;
    }

    // Attempt to split by comma
    const parts = line.split(',');
    
    let parsedTitle: MemberTitle = defaultTitle;
    let parsedName = '';

    if (parts.length >= 2) {
      // Could be "Bro, John Doe" or "John Doe, Bro"
      const part0 = parts[0].trim();
      const part1 = parts[1].trim();

      const p0Lower = part0.toLowerCase();
      const p1Lower = part1.toLowerCase();

      if (p0Lower === 'bro' || p0Lower === 'brother') {
        parsedTitle = 'Bro';
        parsedName = parts.slice(1).join(',').trim();
      } else if (p0Lower === 'sis' || p0Lower === 'sister') {
        parsedTitle = 'Sis';
        parsedName = parts.slice(1).join(',').trim();
      } else if (p1Lower === 'bro' || p1Lower === 'brother') {
        parsedTitle = 'Bro';
        parsedName = parts.slice(0, 1).join(',').trim();
      } else if (p1Lower === 'sis' || p1Lower === 'sister') {
        parsedTitle = 'Sis';
        parsedName = parts.slice(0, 1).join(',').trim();
      } else {
        // Just commas inside the name, or no clear prefix. Use first part or combine?
        parsedName = line.trim();
      }
    } else {
      // No comma. Check if line starts with prefix (e.g. "Bro John Doe" or "Bro. John Doe")
      const firstWord = line.split(/\s+/)[0]?.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") || "";
      const firstWordLower = firstWord.toLowerCase();
      if (firstWordLower === 'bro' || firstWordLower === 'brother') {
        parsedTitle = 'Bro';
        parsedName = line.substring(line.indexOf(firstWord) + firstWord.length).trim();
      } else if (firstWordLower === 'sis' || firstWordLower === 'sister') {
        parsedTitle = 'Sis';
        parsedName = line.substring(line.indexOf(firstWord) + firstWord.length).trim();
      } else {
        parsedName = line;
      }
    }

    // Clean up parsed name (remove redundant prefix if still present, e.g. "Bro. " or "Sis. ")
    parsedName = parsedName.replace(/^(bro|brother|sis|sister)[.\s]+/i, '').trim();

    // Final validation
    if (parsedName) {
      results.push({
        title: parsedTitle,
        name: parsedName,
      });
    }
  }

  return results;
};

interface MemberManagementProps {
  members: Member[];
  onAddMember: (
    title: MemberTitle,
    name: string,
    isSick: boolean,
    isVisible: boolean,
    birthday?: string,
    phone?: string,
    email?: string,
    address?: string
  ) => void;
  onUpdateMember: (id: string, updates: Partial<Member>) => void;
  onDeleteMember: (id: string) => void;
  onSelectMember: (member: Member) => void;
}

export const MemberManagement: React.FC<MemberManagementProps> = ({
  members,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onSelectMember,
}) => {
  // Add Form Tab Selection
  const [activeFormTab, setActiveFormTab] = useState<'single' | 'bulk'>('single');

  // Single Add Form State
  const [title, setTitle] = useState<MemberTitle>('Bro');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isSick, setIsSick] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');

  // Bulk Add Form State
  const [bulkText, setBulkText] = useState('');
  const [bulkDefaultTitle, setBulkDefaultTitle] = useState<MemberTitle>('Bro');
  const [bulkIsSick, setBulkIsSick] = useState(false);
  const [bulkIsVisible, setBulkIsVisible] = useState(true);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<MemberTitle>('Bro');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'member' | 'admin' | 'secretary'>('member');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBirthMonth, setEditBirthMonth] = useState('');
  const [editBirthDay, setEditBirthDay] = useState('');

  // Search/Filter State
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a name');
      return;
    }
    const bday = birthMonth && birthDay ? `${birthMonth}-${birthDay}` : undefined;
    onAddMember(
      title,
      name.trim(),
      isSick,
      isVisible,
      bday,
      phone.trim() || undefined,
      email.trim() || undefined,
      address.trim() || undefined
    );
    // Reset form
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setIsSick(false);
    setIsVisible(true);
    setBirthMonth('');
    setBirthDay('');
    // Set default title back to Bro
    setTitle('Bro');
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseCSV(bulkText, bulkDefaultTitle);
    if (parsed.length === 0) {
      alert('No valid members found in your text. Please verify formatting.');
      return;
    }

    parsed.forEach((m) => {
      onAddMember(m.title, m.name, bulkIsSick, bulkIsVisible);
    });

    setBulkText('');
    setBulkIsSick(false);
    setBulkIsVisible(true);
    alert(`Successfully imported ${parsed.length} members!`);
  };

  const parsedBulkMembers = parseCSV(bulkText, bulkDefaultTitle);

  const handleStartEdit = (member: Member) => {
    setEditingId(member.id);
    setEditTitle(member.title);
    setEditName(member.name);
    setEditRole(member.role || 'member');
    if (member.birthday && member.birthday.length === 5) {
      const [mm, dd] = member.birthday.split('-');
      setEditBirthMonth(mm);
      setEditBirthDay(dd);
    } else {
      setEditBirthMonth('');
      setEditBirthDay('');
    }
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) {
      alert('Name cannot be empty');
      return;
    }
    const bday = editBirthMonth && editBirthDay ? `${editBirthMonth}-${editBirthDay}` : '';
    onUpdateMember(id, {
      title: editTitle,
      name: editName.trim(),
      role: editRole,
      birthday: bday || '',
    });
    setEditingId(null);
  };

  const filteredMembers = members.filter((m) =>
    `${m.title} ${m.name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="member-management" className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-[#E6E4DD] pb-4">
        <div>
          <h2 className="text-xl font-serif font-bold tracking-tight text-[#3D3D33] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#5A5A40]" />
            Member Registry
          </h2>
          <p className="text-sm text-[#7A7A66]">
            Add, update, search, and manage members. Toggle active status or record sickness.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Create/Add Member */}
        <div className="bg-[#F5F2ED] rounded-xl border border-[#E6E4DD] shadow-sm p-5 space-y-4 h-fit">
          <div className="border-b border-[#E6E4DD] pb-2">
            <h3 className="text-base font-serif font-bold text-[#3D3D33] flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-[#5A5A40]" />
              Add Member Panel
            </h3>

            {/* Mode Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-white border border-[#E6E4DD] rounded-lg">
              <button
                id="tab-single-form"
                type="button"
                onClick={() => setActiveFormTab('single')}
                className={`py-1.5 px-3 text-xs font-bold rounded-md text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeFormTab === 'single'
                    ? 'bg-[#5A5A40] text-white shadow-sm'
                    : 'text-[#7A7A66] hover:bg-[#FAF9F6] hover:text-[#5A5A40]'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Single
              </button>
              <button
                id="tab-bulk-form"
                type="button"
                onClick={() => setActiveFormTab('bulk')}
                className={`py-1.5 px-3 text-xs font-bold rounded-md text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeFormTab === 'bulk'
                    ? 'bg-[#5A5A40] text-white shadow-sm'
                    : 'text-[#7A7A66] hover:bg-[#FAF9F6] hover:text-[#5A5A40]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Bulk CSV
              </button>
            </div>
          </div>

          {activeFormTab === 'single' ? (
            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* Sis / Bro selection */}
              <div>
                <label className="block text-xs font-bold text-[#7A7A66] uppercase tracking-wider mb-1.5">
                  Member Title
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="prefix-btn-bro"
                    type="button"
                    onClick={() => setTitle('Bro')}
                    className={`py-1.5 px-3 text-xs font-semibold rounded-md border text-center transition-all cursor-pointer ${
                      title === 'Bro'
                        ? 'bg-[#5A5A40] border-[#5A5A40] text-white font-bold shadow-sm'
                        : 'border-[#E6E4DD] text-[#7A7A66] bg-white hover:bg-[#FAF9F6]'
                    }`}
                  >
                    Bro (Brother)
                  </button>
                  <button
                    id="prefix-btn-sis"
                    type="button"
                    onClick={() => setTitle('Sis')}
                    className={`py-1.5 px-3 text-xs font-semibold rounded-md border text-center transition-all cursor-pointer ${
                      title === 'Sis'
                        ? 'bg-[#5A5A40] border-[#5A5A40] text-white font-bold shadow-sm'
                        : 'border-[#E6E4DD] text-[#7A7A66] bg-white hover:bg-[#FAF9F6]'
                    }`}
                  >
                    Sis (Sister)
                  </button>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-xs font-bold text-[#7A7A66] uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  id="member-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Firstname Lastname"
                  className="w-full text-sm px-3.5 py-2 border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] bg-white text-[#3D3D33] transition-colors"
                />
              </div>

              {/* Phone & Email Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#7A7A66] uppercase tracking-wider mb-1.5">
                    Phone (Optional)
                  </label>
                  <input
                    id="member-phone-input"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 801 234 5678"
                    className="w-full text-xs px-3 py-2 border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] bg-white text-[#3D3D33]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#7A7A66] uppercase tracking-wider mb-1.5">
                    Email (Optional)
                  </label>
                  <input
                    id="member-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full text-xs px-3 py-2 border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] bg-white text-[#3D3D33]"
                  />
                </div>
              </div>

              {/* Residential Location */}
              <div>
                <label className="block text-xs font-bold text-[#7A7A66] uppercase tracking-wider mb-1.5">
                  Residential Location / Center (Optional)
                </label>
                <input
                  id="member-address-input"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., Center A, Ikoyi"
                  className="w-full text-xs px-3 py-2 border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] bg-white text-[#3D3D33]"
                />
              </div>

              {/* Birthday Selection */}
              <div>
                <label className="block text-xs font-bold text-[#7A7A66] uppercase tracking-wider mb-1.5">
                  Birthday (Month & Day - Optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    id="member-birthday-month"
                    value={birthMonth}
                    onChange={(e) => {
                      setBirthMonth(e.target.value);
                      if (!e.target.value) setBirthDay('');
                    }}
                    className="text-xs font-semibold px-3 py-2 border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] bg-white text-[#3D3D33] cursor-pointer"
                  >
                    <option value="">Month</option>
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>

                  <select
                    id="member-birthday-day"
                    value={birthDay}
                    disabled={!birthMonth}
                    onChange={(e) => setBirthDay(e.target.value)}
                    className="text-xs font-semibold px-3 py-2 border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] bg-white text-[#3D3D33] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => {
                      const dayStr = String(i + 1).padStart(2, '0');
                      return (
                        <option key={dayStr} value={dayStr}>
                          {i + 1}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Flags (Sick / Visible) */}
              <div className="space-y-2.5 pt-2 border-t border-[#E6E4DD]">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-[#3D3D33] cursor-pointer select-none">
                  <input
                    id="member-sick-checkbox"
                    type="checkbox"
                    checked={isSick}
                    onChange={(e) => setIsSick(e.target.checked)}
                    className="w-4 h-4 text-[#5A5A40] border-[#E6E4DD] rounded focus:ring-[#5A5A40]"
                  />
                  <span>Currently Sick / Unwell</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-semibold text-[#3D3D33] cursor-pointer select-none">
                  <input
                    id="member-visible-checkbox"
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => setIsVisible(e.target.checked)}
                    className="w-4 h-4 text-[#5A5A40] border-[#E6E4DD] rounded focus:ring-[#5A5A40]"
                  />
                  <span>Show in Attendance lists (Default)</span>
                </label>
              </div>

              <button
                id="add-member-submit"
                type="submit"
                className="w-full mt-2 py-2.5 px-4 bg-[#5A5A40] text-white rounded-lg hover:bg-[#4E4E37] transition-all text-xs font-bold tracking-wide flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                ADD NEW MEMBER
              </button>
            </form>
          ) : (
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              {/* Default Title Choice */}
              <div>
                <label className="block text-xs font-bold text-[#7A7A66] uppercase tracking-wider mb-1.5">
                  Fallback Prefix
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="bulk-prefix-bro"
                    type="button"
                    onClick={() => setBulkDefaultTitle('Bro')}
                    className={`py-1.5 px-3 text-xs font-semibold rounded-md border text-center transition-all cursor-pointer ${
                      bulkDefaultTitle === 'Bro'
                        ? 'bg-[#5A5A40] border-[#5A5A40] text-white font-bold shadow-sm'
                        : 'border-[#E6E4DD] text-[#7A7A66] bg-white hover:bg-[#FAF9F6]'
                    }`}
                  >
                    Bro (Brother)
                  </button>
                  <button
                    id="bulk-prefix-sis"
                    type="button"
                    onClick={() => setBulkDefaultTitle('Sis')}
                    className={`py-1.5 px-3 text-xs font-semibold rounded-md border text-center transition-all cursor-pointer ${
                      bulkDefaultTitle === 'Sis'
                        ? 'bg-[#5A5A40] border-[#5A5A40] text-white font-bold shadow-sm'
                        : 'border-[#E6E4DD] text-[#7A7A66] bg-white hover:bg-[#FAF9F6]'
                    }`}
                  >
                    Sis (Sister)
                  </button>
                </div>
                <p className="text-[10px] text-[#7A7A66] mt-1.5">
                  Applied to rows that don&apos;t specify a prefix (e.g. &quot;Bro&quot; or &quot;Sis&quot;).
                </p>
              </div>

              {/* Textarea for CSV */}
              <div>
                <label className="block text-xs font-bold text-[#7A7A66] uppercase tracking-wider mb-1.5">
                  Pasted CSV / Member List
                </label>
                <textarea
                  id="bulk-csv-textarea"
                  rows={5}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Bro, John Doe&#10;Sis, Jane Smith&#10;Arthur Pendragon&#10;Sister, Sarah Jenkins"
                  className="w-full text-xs font-mono p-3 border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] bg-white text-[#3D3D33] transition-colors resize-y leading-relaxed"
                />
              </div>

              {/* Live Parsed Preview */}
              {parsedBulkMembers.length > 0 && (
                <div className="space-y-1.5 bg-white border border-[#E6E4DD] rounded-lg p-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#7A7A66]">
                    <span>Parsed Preview</span>
                    <span className="text-[#5A5A40] bg-[#FAF9F6] border border-[#E6E4DD] px-1.5 py-0.5 rounded">
                      {parsedBulkMembers.length} member{parsedBulkMembers.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="max-h-28 overflow-y-auto divide-y divide-[#FAF9F6] text-[11px] font-medium pr-1 custom-scrollbar">
                    {parsedBulkMembers.map((m, idx) => (
                      <div key={idx} className="py-1 flex items-center justify-between">
                        <span className="text-[#3D3D33]">
                          <strong className="text-[#7A7A66]">{m.title}.</strong> {m.name}
                        </span>
                        <span className="text-[9px] uppercase px-1 rounded bg-[#F5F2ED] text-[#5A5A40] border border-[#E6E4DD] font-bold">
                          Valid
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flags (Sick / Visible) */}
              <div className="space-y-2.5 pt-2 border-t border-[#E6E4DD]">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-[#3D3D33] cursor-pointer select-none">
                  <input
                    id="bulk-sick-checkbox"
                    type="checkbox"
                    checked={bulkIsSick}
                    onChange={(e) => setBulkIsSick(e.target.checked)}
                    className="w-4 h-4 text-[#5A5A40] border-[#E6E4DD] rounded focus:ring-[#5A5A40]"
                  />
                  <span>All Currently Sick / Unwell</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-semibold text-[#3D3D33] cursor-pointer select-none">
                  <input
                    id="bulk-visible-checkbox"
                    type="checkbox"
                    checked={bulkIsVisible}
                    onChange={(e) => setBulkIsVisible(e.target.checked)}
                    className="w-4 h-4 text-[#5A5A40] border-[#E6E4DD] rounded focus:ring-[#5A5A40]"
                  />
                  <span>Show in Attendance lists (Default)</span>
                </label>
              </div>

              <button
                id="bulk-import-submit"
                type="submit"
                disabled={parsedBulkMembers.length === 0}
                className={`w-full mt-2 py-2.5 px-4 rounded-lg transition-all text-xs font-bold tracking-wide flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                  parsedBulkMembers.length > 0
                    ? 'bg-[#5A5A40] text-white hover:bg-[#4E4E37]'
                    : 'bg-[#FAF9F6] text-[#C8C8A9] border border-[#E6E4DD] cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" />
                IMPORT {parsedBulkMembers.length > 0 ? `${parsedBulkMembers.length} ` : ''}MEMBERS
              </button>
            </form>
          )}
        </div>

        {/* Right Content: Members Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E6E4DD] shadow-sm p-5 space-y-4">
          {/* Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E6E4DD]">
            <h3 className="text-base font-serif font-bold text-[#3D3D33]">
              Active Registry ({members.length})
            </h3>
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A66]" />
              <input
                id="member-search-input"
                type="text"
                placeholder="Search member name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A5A40] bg-[#FAF9F6] text-[#3D3D33]"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table id="members-registry-table" className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E6E4DD] text-[11px] font-bold text-[#7A7A66] uppercase tracking-wider bg-[#FAF9F6]">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-3">Access Code</th>
                  <th className="py-3 px-3 text-center">Sick?</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E4DD]">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#7A7A66] text-xs font-medium">
                      No matching members found.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      id={`member-row-${member.id}`}
                      className="hover:bg-[#FAF9F6]/40 group transition-colors"
                    >
                      {/* Name Col */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar clickable to Member Details */}
                          <button
                            id={`member-avatar-btn-${member.id}`}
                            onClick={() => onSelectMember(member)}
                            className="w-8 h-8 rounded-full border border-[#E6E4DD] flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer transition-transform hover:scale-105 bg-[#F5F2ED] text-[#5A5A40] overflow-hidden"
                            title="View attendance details"
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
                          </button>

                          {editingId === member.id ? (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <select
                                  id={`edit-member-prefix-${member.id}`}
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value as MemberTitle)}
                                  className="text-xs font-bold px-1.5 py-1 border border-[#E6E4DD] rounded focus:outline-none bg-white cursor-pointer text-[#3D3D33]"
                                >
                                  <option value="Bro">Bro</option>
                                  <option value="Sis">Sis</option>
                                </select>
                                <input
                                  id={`edit-member-name-input-${member.id}`}
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="text-xs font-semibold px-2 py-1 border border-[#5A5A40] rounded focus:outline-none max-w-[130px] text-[#3D3D33] bg-white"
                                />
                                <select
                                  id={`edit-member-role-${member.id}`}
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value as 'member' | 'admin' | 'secretary')}
                                  className="text-xs font-medium px-1.5 py-1 border border-[#E6E4DD] rounded focus:outline-none bg-white cursor-pointer text-[#5A5A40] uppercase tracking-wider font-bold"
                                >
                                  <option value="member">MEMBER</option>
                                  <option value="admin">ADMIN</option>
                                  <option value="secretary">SECRETARY</option>
                                </select>
                              </div>
                              {/* Birthday dropdowns in Edit Mode */}
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-[#7A7A66] font-bold">🎂 Birthday:</span>
                                <select
                                  id={`edit-birthday-month-${member.id}`}
                                  value={editBirthMonth}
                                  onChange={(e) => {
                                    setEditBirthMonth(e.target.value);
                                    if (!e.target.value) setEditBirthDay('');
                                  }}
                                  className="text-[10px] font-bold px-1.5 py-0.5 border border-[#E6E4DD] rounded focus:outline-none bg-white cursor-pointer text-[#3D3D33]"
                                >
                                  <option value="">Month</option>
                                  <option value="01">Jan</option>
                                  <option value="02">Feb</option>
                                  <option value="03">Mar</option>
                                  <option value="04">Apr</option>
                                  <option value="05">May</option>
                                  <option value="06">Jun</option>
                                  <option value="07">Jul</option>
                                  <option value="08">Aug</option>
                                  <option value="09">Sep</option>
                                  <option value="10">Oct</option>
                                  <option value="11">Nov</option>
                                  <option value="12">Dec</option>
                                </select>
                                <select
                                  id={`edit-birthday-day-${member.id}`}
                                  value={editBirthDay}
                                  disabled={!editBirthMonth}
                                  onChange={(e) => setEditBirthDay(e.target.value)}
                                  className="text-[10px] font-bold px-1.5 py-0.5 border border-[#E6E4DD] rounded focus:outline-none bg-white cursor-pointer text-[#3D3D33] disabled:opacity-50"
                                >
                                  <option value="">Day</option>
                                  {Array.from({ length: 31 }, (_, i) => {
                                    const dayStr = String(i + 1).padStart(2, '0');
                                    return (
                                      <option key={dayStr} value={dayStr}>
                                        {i + 1}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            </div>
                          ) : (
                            <button
                              id={`member-name-link-${member.id}`}
                              onClick={() => onSelectMember(member)}
                              className="text-left cursor-pointer group-hover:text-[#5A5A40] transition-colors"
                            >
                              <p className="text-xs font-bold text-[#3D3D33]">
                                {member.title}. {member.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-mono text-[#7A7A66] capitalize">
                                  Role: {member.role}
                                </span>
                                {member.birthday && (
                                  <span className="text-[9px] bg-[#FAF9F6] text-[#5A5A40] border border-[#E6E4DD] px-1 py-0.5 rounded font-bold inline-flex items-center gap-0.5">
                                    🎂 {(() => {
                                      const [mm, dd] = member.birthday.split('-');
                                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                      const mIdx = parseInt(mm, 10) - 1;
                                      return mIdx >= 0 && mIdx < 12 ? `${monthNames[mIdx]} ${parseInt(dd, 10)}` : member.birthday;
                                    })()}
                                  </span>
                                )}
                              </div>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Access Code Col */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(member.accessCode);
                            alert(`Access code ${member.accessCode} copied to clipboard!`);
                          }}
                          className="font-mono text-xs bg-[#F5F2ED] hover:bg-[#FAF9F6] border border-[#E6E4DD] text-[#5A5A40] font-semibold px-2 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors"
                          title="Click to copy access code"
                        >
                          <Copy className="w-3 h-3 text-[#7A7A66]" />
                          {member.accessCode}
                        </button>
                      </td>

                      {/* Sick Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          id={`toggle-sick-btn-${member.id}`}
                          onClick={() => onUpdateMember(member.id, { isSick: !member.isSick })}
                          className="p-1 hover:bg-[#FAF9F6] rounded inline-flex items-center justify-center transition-colors text-[#7A7A66] cursor-pointer"
                          title={member.isSick ? 'Set as healthy' : 'Set as sick'}
                        >
                          {member.isSick ? (
                            <CheckSquare className="w-4 h-4 text-[#B25E5E]" />
                          ) : (
                            <Square className="w-4 h-4 text-[#E6E4DD]" />
                          )}
                        </button>
                      </td>

                      {/* Visibility Eye Icon Status */}
                      <td className="py-3 px-3 text-center">
                        <button
                          id={`toggle-visibility-btn-${member.id}`}
                          onClick={() => onUpdateMember(member.id, { isVisible: !member.isVisible })}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            member.isVisible
                              ? 'text-[#5A5A40] hover:bg-[#FAF9F6]'
                              : 'text-[#7A7A66] hover:bg-[#FAF9F6]'
                          }`}
                          title={
                            member.isVisible
                              ? 'Visible (Shown on attendance sheet)'
                              : 'Hidden (Omitted from attendance sheet)'
                          }
                        >
                          {member.isVisible ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {editingId === member.id ? (
                            <>
                              <button
                                id={`save-member-btn-${member.id}`}
                                onClick={() => handleSaveEdit(member.id)}
                                className="p-1.5 text-[#5A5A40] hover:bg-[#FAF9F6] rounded-md transition-colors border border-[#E6E4DD] cursor-pointer font-bold"
                                title="Save changes"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`cancel-member-btn-${member.id}`}
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-[#7A7A66] hover:bg-[#FAF9F6] rounded-md transition-colors border border-[#E6E4DD] cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                id={`edit-member-btn-${member.id}`}
                                onClick={() => handleStartEdit(member)}
                                className="p-1.5 text-[#7A7A66] hover:text-[#5A5A40] hover:bg-[#FAF9F6] border border-transparent hover:border-[#E6E4DD] rounded-md transition-all cursor-pointer opacity-75 group-hover:opacity-100"
                                title="Edit member"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`delete-member-btn-${member.id}`}
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Are you sure you want to remove "${member.title}. ${member.name}"? All past individual logs for this member will be lost.`
                                    )
                                  ) {
                                    onDeleteMember(member.id);
                                  }
                                }}
                                className="p-1.5 text-[#7A7A66] hover:text-[#B25E5E] hover:bg-[#FDF2F2] border border-transparent hover:border-[#FAD2D2] rounded-md transition-all cursor-pointer opacity-75 group-hover:opacity-100"
                                title="Delete member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
