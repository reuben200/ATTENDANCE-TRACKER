import React, { useState } from 'react';
import { Member, UserRole } from '../types';
import {
  Key,
  User as UserIcon,
  ArrowRight,
  Info
} from 'lucide-react';

interface LoginPageProps {
  members: Member[];
  onLogin: (role: UserRole, memberId: string | null, rememberMe: boolean) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ members, onLogin }) => {
  const [surname, setSurname] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const enteredSurname = surname.trim().toLowerCase();
    const enteredCode = accessCode.trim().toUpperCase();

    if (!enteredSurname) {
      setError('Please enter your surname.');
      return;
    }
    if (!enteredCode) {
      setError('Please enter your 7-character Access Code.');
      return;
    }

    // Find member matching accessCode and check if name contains the surname
    const foundMember = members.find((m) => {
      const codeMatches = m.accessCode?.toUpperCase() === enteredCode;
      if (!codeMatches) return false;

      // Extract parts of member name and check if surname is present
      const nameParts = m.name.toLowerCase().split(/\s+/);
      return nameParts.includes(enteredSurname);
    });

    if (foundMember) {
      // Map database member role to app UI UserRole
      let resolvedRole: UserRole = 'Member';
      if (foundMember.role === 'admin') {
        resolvedRole = 'Admin';
      } else if (foundMember.role === 'secretary') {
        resolvedRole = 'Secretary';
      }

      onLogin(resolvedRole, foundMember.id, rememberMe);
    } else {
      setError(
        'Access denied. No record matches that combination of surname and Access Code. Please check spelling or contact the Church Secretary.'
      );
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8 md:py-12 bg-[#FAF9F6]">
      <div className="w-full max-w-md bg-[#FAF9F6] border border-[#E6E4DD] rounded-2xl p-6 md:p-8 shadow-xl space-y-6 relative overflow-hidden">
        
        {/* Subtle decorative top line with theme color */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#5A5A40]"></div>

        {/* Church Header branding */}
        <div className="text-center space-y-3 pt-2">
          <div className="mx-auto w-20 h-20 rounded-full border border-[#E6E4DD] bg-white p-1 shadow-sm overflow-hidden flex items-center justify-center">
            <img 
              src="/logo.jpg" 
              alt="ISOLO CHURCH OF CHRIST" 
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-serif font-bold text-[#3D3D33] tracking-wider uppercase">
              Isolo Church of Christ
            </h2>
            <p className="text-xs text-[#7A7A66] tracking-tight font-medium font-sans mt-0.5">
              Congregation Attendance & Registry Portal
            </p>
          </div>
        </div>

        {/* Informative banner */}
        <div className="bg-[#F5F2ED] border border-[#E6E4DD] rounded-xl p-3 flex gap-2.5 items-start">
          <Info className="w-4 h-4 text-[#5A5A40] shrink-0 mt-0.5" />
          <div className="text-[11px] text-[#7A7A66] leading-relaxed">
            Please log in with your <strong className="text-[#3D3D33]">Surname</strong> and unique <strong className="text-[#3D3D33]">Access Code</strong>. The system will load your personalized profile dashboard automatically.
          </div>
        </div>

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Surname field */}
          <div className="space-y-1.5">
            <label htmlFor="surnameInput" className="block text-xs font-bold text-[#7A7A66] uppercase tracking-wider">
              Surname (Last Name)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7A7A66]">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                id="surnameInput"
                type="text"
                required
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="E.g., Adebayo"
                className="w-full text-sm pl-10 pr-3.5 py-2.5 border border-[#E6E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] bg-white text-[#3D3D33] placeholder:text-gray-400 font-medium"
              />
            </div>
          </div>

          {/* Access Code field */}
          <div className="space-y-1.5">
            <label htmlFor="accessCodeInput" className="block text-xs font-bold text-[#7A7A66] uppercase tracking-wider">
              Member Access Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7A7A66]">
                <Key className="w-4 h-4" />
              </div>
              <input
                id="accessCodeInput"
                type="text"
                required
                maxLength={10}
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="E.g., JA72819"
                className="w-full text-sm font-mono uppercase tracking-widest pl-10 pr-3.5 py-2.5 border border-[#E6E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] bg-white text-[#3D3D33] placeholder:tracking-normal placeholder:font-sans"
              />
            </div>
          </div>

          {/* Remember Me Option */}
          <div className="pt-1">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-[#7A7A66] cursor-pointer select-none">
              <input
                id="rememberMeCheckbox"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-[#5A5A40] border-[#E6E4DD] rounded focus:ring-[#5A5A40]"
              />
              <span>Remember on this device</span>
            </label>
          </div>

          {error && (
            <div className="p-3 bg-[#FAF2F2] border border-[#E6D5D5] rounded-xl text-xs text-[#B25E5E] leading-relaxed">
              {error}
            </div>
          )}

          <button
            id="login-btn"
            type="submit"
            className="w-full py-2.5 px-4 bg-[#5A5A40] text-white rounded-xl hover:bg-[#4E4E37] transition-all text-xs font-bold tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow"
          >
            <span>SIGN IN TO PORTAL</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
