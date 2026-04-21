import { useState } from 'react'
import { X, Radio } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'

interface CreateChannelModalProps {
  onClose: () => void
  onCreated: () => void
}

export default function CreateChannelModal({ onClose, onCreated }: CreateChannelModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      })

      if (res.ok) {
        onCreated()
        onClose()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative glass-strong rounded-mac-lg p-6 w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Radio className="w-6 h-6 text-[var(--accent)]" />
            {t.channel?.create || 'Create Channel'}
          </h2>
          <button onClick={onClose} className="glass-button !p-2 !rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.channel?.name || 'Channel name'}
            className="glass-input w-full"
            required
          />
          
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.channel?.description || 'Description (optional)'}
            className="glass-input w-full"
          />

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white py-3 rounded-xl font-medium shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? '...' : t.channel?.create || 'Create Channel'}
          </button>
        </form>
      </div>
    </div>
  )
}