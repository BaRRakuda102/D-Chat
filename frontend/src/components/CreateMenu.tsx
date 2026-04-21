import { useState } from 'react'
import { Plus, UserPlus, Users, Radio, X } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'

interface CreateMenuProps {
  onAddFriend: () => void
  onCreateGroup: () => void
  onCreateChannel: () => void
}

export default function CreateMenu({ onAddFriend, onCreateGroup, onCreateChannel }: CreateMenuProps) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()

  const items = [
    { icon: UserPlus, label: t.menu?.addFriend || 'Add Friend', action: () => { onAddFriend(); setOpen(false) } },
    { icon: Users, label: t.menu?.createGroup || 'Create Group', action: () => { onCreateGroup(); setOpen(false) } },
    { icon: Radio, label: t.menu?.createChannel || 'Create Channel', action: () => { onCreateChannel(); setOpen(false) } },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
      >
        {open ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-12 left-0 glass-strong rounded-2xl p-2 w-56 z-50 animate-fade-in space-y-1">
            {items.map((item, idx) => (
              <button
                key={idx}
                onClick={item.action}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg-glass)] transition-all text-left"
              >
                <item.icon className="w-5 h-5 text-[var(--accent)]" />
                <span className="text-sm text-[var(--text-primary)]">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}