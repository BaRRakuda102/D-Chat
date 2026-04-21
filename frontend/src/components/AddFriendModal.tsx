import { useState } from 'react'
import { X, Search, UserPlus } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'

interface AddFriendModalProps {
  onClose: () => void
}

export default function AddFriendModal({ onClose }: AddFriendModalProps) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{success?: string; error?: string}>({})
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult({})

    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_username: username })
      })

      if (res.ok) {
        setResult({ success: t.friend?.requestSent || 'Request sent!' })
        setTimeout(() => onClose(), 1500)
      } else {
        const err = await res.json()
        setResult({ error: err.detail || 'Error' })
      }
    } catch {
      setResult({ error: 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative glass-strong rounded-mac-lg p-6 w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {t.friend?.addFriend || 'Add Friend'}
          </h2>
          <button onClick={onClose} className="glass-button !p-2 !rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t.friend?.enterUsername || 'Enter username'}
              className="glass-input w-full !pl-12 !py-3"
              required
            />
          </div>

          {result.success && (
            <div className="bg-green-500/10 text-green-400 rounded-xl p-3 text-sm text-center">
              {result.success}
            </div>
          )}
          {result.error && (
            <div className="bg-red-500/10 text-red-400 rounded-xl p-3 text-sm text-center">
              {result.error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white py-3 rounded-xl font-medium shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? '...' : <span className="flex items-center justify-center gap-2"><UserPlus className="w-5 h-5" /> {t.friend?.sendRequest || 'Send Request'}</span>}
          </button>
        </form>
      </div>
    </div>
  )
}