import { useState, useEffect, useRef } from 'react';
import { X, User, Camera, Check, UserCheck, UserX, Settings, Moon, Sun, Languages, Save, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useTranslation } from '../i18n/useTranslation';

interface ProfileModalProps {
  onClose: () => void;
}

interface FriendRequest {
  id: number;
  from_user: {
    id: number;
    username: string;
    display_name?: string;
  };
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, setAuth, token } = useAuthStore();
  const { theme, setTheme, language, setLanguage } = useThemeStore();
  const { t } = useTranslation();
  
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  
  const bioRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadProfile();
    fetchRequests();
  }, []);

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setBirthDate(data.birth_date || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/friends/requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          display_name: displayName,
          bio: bio.trim() || undefined,
          birth_date: birthDate || undefined,
          avatar_url: avatarUrl || undefined
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setAuth(token!, updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to save profile');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: number) => {
    try {
      await fetch(`/api/friends/requests/${requestId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchRequests();
    } catch (err) {
      console.error('Failed to accept request:', err);
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await fetch(`/api/friends/requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchRequests();
    } catch (err) {
      console.error('Failed to reject request:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="relative glass-strong rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl animate-slide-up flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--accent)]/5 to-purple-500/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {t.settings?.profile || 'Profile'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-glass)] transition-colors active:scale-95"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] px-6 shrink-0">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
              activeTab === 'profile'
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t.settings?.editProfile || 'Edit Profile'}
            </span>
            {activeTab === 'profile' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)] rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
              activeTab === 'settings'
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {t.settings?.title || 'Settings'}
            </span>
            {activeTab === 'settings' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)] rounded-full" />
            )}
          </button>
        </div>

        {/* Content with scroll */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      (displayName?.[0] || user?.username?.[0] || 'U')?.toUpperCase()
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[var(--accent)] text-white cursor-pointer hover:scale-110 transition-transform shadow-lg">
                    <Camera className="w-3 h-3" />
                    <input type="file" className="hidden" accept="image/*" />
                  </label>
                </div>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder={t.settings?.avatarUrl || 'Avatar URL (optional)'}
                  className="w-full max-w-xs px-4 py-2 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] text-center"
                />
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  {t.settings?.avatarHint || 'Enter image URL or click camera to upload'}
                </p>
              </div>

              {/* Profile Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1">
                    {t.app?.username || 'Username'}
                  </label>
                  <input
                    type="text"
                    value={user?.username || ''}
                    disabled
                    className="w-full px-4 py-2 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)] text-sm text-[var(--text-tertiary)] cursor-not-allowed"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1">
                    {t.app?.displayName || 'Display Name'}
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t.settings?.displayNamePlaceholder || 'How others see you'}
                    className="w-full px-4 py-2 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1">
                    {t.settings?.bio || 'Bio'}
                  </label>
                  <textarea
                    ref={bioRef}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={t.settings?.bioPlaceholder || 'Tell something about yourself...'}
                    className="w-full px-4 py-2 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                    rows={3}
                    maxLength={256}
                  />
                  <div className="flex justify-end">
                    <span className="text-[10px] text-[var(--text-tertiary)]">{bio.length}/256</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1">
                    {t.settings?.birthDate || 'Birth Date'}
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Friend Requests Section */}
              {requests.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[var(--accent)]" />
                    <h3 className="font-semibold text-[var(--text-primary)]">
                      {t.friend?.requests || 'Friend Requests'} 
                      <span className="ml-2 text-xs text-[var(--accent)]">({requests.length})</span>
                    </h3>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {requests.map(req => (
                      <div key={req.id} className="glass-card p-3 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)]/20 to-purple-500/20 flex items-center justify-center text-[var(--accent)] font-bold">
                            {req.from_user.display_name?.[0] || req.from_user.username[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-[var(--text-primary)]">
                              {req.from_user.display_name || req.from_user.username}
                            </p>
                            <p className="text-xs text-[var(--text-tertiary)]">@{req.from_user.username}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleAccept(req.id)}
                            className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 transition-colors active:scale-95"
                            title={t.friend?.accept || 'Accept'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors active:scale-95"
                            title={t.friend?.reject || 'Reject'}
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Theme Settings */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Moon className="w-5 h-5 text-[var(--accent)]" />
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    {t.settings?.appearance || 'Appearance'}
                  </h3>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-[var(--text-secondary)] block">
                    {t.settings?.theme || 'Theme'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['dark', 'light', 'auto'] as const).map((themeName) => (
                      <button
                        key={themeName}
                        onClick={() => setTheme(themeName)}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          theme === themeName 
                            ? 'bg-gradient-to-r from-[var(--accent)] to-purple-500 text-white shadow-md' 
                            : 'glass-button'
                        }`}
                      >
                        {themeName === 'dark' && <Moon className="w-4 h-4" />}
                        {themeName === 'light' && <Sun className="w-4 h-4" />}
                        {themeName === 'auto' && <Settings className="w-4 h-4" />}
                        {t.settings?.[themeName] || themeName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Language Settings */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Languages className="w-5 h-5 text-[var(--accent)]" />
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    {t.settings?.language || 'Language'}
                  </h3>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-[var(--text-secondary)] block">
                    {t.settings?.selectLanguage || 'Select your preferred language'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['ru', 'en'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          language === lang 
                            ? 'bg-gradient-to-r from-[var(--accent)] to-purple-500 text-white shadow-md' 
                            : 'glass-button'
                        }`}
                      >
                        {lang === 'ru' ? '🇷🇺 Русский' : '🇬🇧 English'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                  {t.settings?.accountInfo || 'Account Information'}
                </h3>
                <div className="glass-card p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">{t.app?.username || 'Username'}:</span>
                    <span className="text-[var(--text-primary)] font-mono">@{user?.username}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">{t.settings?.memberSince || 'Member since'}:</span>
                    <span className="text-[var(--text-primary)]">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl p-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20 mt-4">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer with Save Button (only in profile tab) */}
        {activeTab === 'profile' && (
          <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-glass)]/30 shrink-0">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl glass-button font-medium transition-all"
                disabled={loading}
              >
                {t.common?.cancel || 'Cancel'}
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className={`flex-1 py-2.5 rounded-xl font-medium shadow-md transition-all flex items-center justify-center gap-2 ${
                  saved 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                    : 'bg-gradient-to-r from-[var(--accent)] to-purple-500 hover:from-[var(--accent-hover)] hover:to-purple-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]`}
              >
                {saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    {t.settings?.saved || 'Saved!'}
                  </>
                ) : loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t.common?.saving || 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {t.settings?.save || 'Save Changes'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}