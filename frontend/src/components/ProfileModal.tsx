import { useState, useEffect } from 'react'
import { X, User, Camera, Check, UserCheck, UserX } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { useTranslation } from '../i18n/useTranslation'

interface ProfileModalProps {
  onClose: () => void
}

interface FriendRequest {
  id: number
  from_user: {
    id: number
    username: string
    display_name?: string
  }
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, setAuth, token } = useAuthStore()
  const { theme, setTheme, language, setLanguage } = useThemeStore()
  const { t } = useTranslation()
  
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [bio, setBio] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchRequests()
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const res = await fetch('/api/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      const data = await res.json()
      setDisplayName(data.display_name || '')
      setBio(data.bio || '')
      setBirthDate(data.birth_date || '')
      setAvatarUrl(data.avatar_url || '')
    }
  }

  const fetchRequests = async () => {
    const res = await fetch('/api/friends/requests', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      const data = await res.json()
      setRequests(data)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          display_name: displayName,
          bio,
          birth_date: birthDate,
          avatar_url: avatarUrl
        })
      })

      if (res.ok) {
        const updated = await res.json()
        setAuth(token!, updated)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (requestId: number) => {
    await fetch(`/api/friends/requests/${requestId}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    fetchRequests()
  }

  const handleReject = async (requestId: number) => {
    await fetch(`/api/friends/requests/${requestId}/reject`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    fetchRequests()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative glass-strong rounded-mac-lg w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-mac animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 glass-strong border-b border-[var(--border)] p-6 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <User className="w-6 h-6 text-[var(--accent)]" />
            {t.settings?.profile || 'Profile'}
          </h2>
          <button onClick={onClose} className="glass-button !p-2 !rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg relative overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                (user?.display_name?.[0] || user?.username?.[0])?.toUpperCase()
              )}
              <button className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6" />
              </button>
            </div>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder={t.settings?.avatarUrl || 'Avatar URL'}
              className="glass-input w-full max-w-xs text-center text-sm"
            />
          </div>

          {/* Profile Info */}
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">{t.app?.username || 'Username'}</label>
              <input type="text" value={user?.username || ''} disabled className="glass-input w-full opacity-50" />
            </div>
            
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">{t.app?.displayName || 'Display Name'}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="glass-input w-full"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">{t.settings?.bio || 'Bio'}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t.settings?.bioPlaceholder || 'Tell about yourself...'}
                className="glass-input w-full h-20 resize-none"
                maxLength={256}
              />
            </div>

            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">{t.settings?.birthDate || 'Birth Date'}</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="glass-input w-full"
              />
            </div>
          </div>

          {/* Friend Requests */}
          {requests.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[var(--accent)]" />
                {t.friend?.requests || 'Friend Requests'} ({requests.length})
              </h3>
              {requests.map(req => (
                <div key={req.id} className="glass-card !p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] font-bold">
                      {req.from_user.display_name?.[0] || req.from_user.username[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[var(--text-primary)]">
                        {req.from_user.display_name || req.from_user.username}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">@{req.from_user.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(req.id)}
                      className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center hover:bg-green-500/30 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Settings */}
          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <h3 className="font-semibold text-[var(--text-primary)]">{t.settings?.title || 'Settings'}</h3>
            
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-2 block">{t.settings?.theme || 'Theme'}</label>
              <div className="flex gap-2">
                {(['dark', 'light', 'auto'] as const).map((tname) => (
                  <button
                    key={tname}
                    onClick={() => setTheme(tname)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                      theme === tname 
                        ? 'bg-[var(--accent)] text-white shadow-lg' 
                        : 'glass-button !py-2 !px-0'
                    }`}
                  >
                    {t.settings?.[tname] || tname}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-2 block">{t.settings?.language || 'Language'}</label>
              <div className="flex gap-2">
                {(['ru', 'en'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                      language === lang 
                        ? 'bg-[var(--accent)] text-white shadow-lg' 
                        : 'glass-button !py-2 !px-0'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={loading}
            className={`w-full py-3 rounded-xl font-medium shadow-lg transition-all ${
              saved 
                ? 'bg-green-500 text-white' 
                : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white'
            } disabled:opacity-50`}
          >
            {saved ? '✓ Saved!' : loading ? '...' : t.settings?.save || 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}