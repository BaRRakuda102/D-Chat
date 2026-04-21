import { useState } from 'react'
import { X, Users, Plus, Minus } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'

interface CreateGroupModalProps {
  onClose: () => void
  onCreated: () => void
}

export default function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [members, setMembers] = useState([''])
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()

  const addMember = () => setMembers([...members, ''])
  const removeMember = (idx: number) => setMembers(members.filter((_, i) => i !== idx))
  const updateMember = (idx: number, val: string) => {
    const newMembers = [...members]
    newMembers[idx] = val
    setMembers(newMembers)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          member_usernames: members.filter(m => m.trim())
        })
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
      
      <div className="relative glass-strong rounded-mac-lg p-6 w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-mac">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Users className="w-6 h-6 text-[var(--accent)]" />
            {t.group?.create || 'Create Group'}
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
            placeholder={t.group?.name || 'Group name'}
            className="glass-input w-full"
            required
          />
          
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.group?.description || 'Description (optional)'}
            className="glass-input w-full"
          />

          <div className="space-y-2">
            <label className="text-sm text-[var(--text-secondary)]">{t.group?.members || 'Members'}</label>
            {members.map((member, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={member}
                  onChange={(e) => updateMember(idx, e.target.value)}
                  placeholder={`${t.friend?.username || 'Username'} ${idx + 1}`}
                  className="glass-input flex-1"
                />
                {idx > 0 && (
                  <button type="button" onClick={() => removeMember(idx)} className="glass-button !p-2 !rounded-lg text-red-400">
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addMember} className="glass-button !py-2 text-sm w-full">
              <Plus className="w-4 h-4 inline mr-2" />
              {t.group?.addMember || 'Add Member'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white py-3 rounded-xl font-medium shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? '...' : t.group?.create || 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  )
}