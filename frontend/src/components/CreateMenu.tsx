import { useState, useEffect, useRef } from 'react';
import { Plus, UserPlus, Users, Radio, X, MessageCircle } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface CreateMenuProps {
  onAddFriend: () => void;
  onCreateGroup: () => void;
  onCreateChannel: () => void;
}

export default function CreateMenu({ 
  onAddFriend, 
  onCreateGroup, 
  onCreateChannel 
}: CreateMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // Закрытие при клике вне меню
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Закрытие при Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const menuItems = [
    { 
      icon: UserPlus, 
      label: t.menu?.addFriend || 'Add Friend', 
      description: t.menu?.addFriendDesc || 'Start a private chat',
      action: () => { 
        onAddFriend(); 
        setIsOpen(false); 
      },
      color: 'from-emerald-500 to-teal-500'
    },
    { 
      icon: Users, 
      label: t.menu?.createGroup || 'Create Group', 
      description: t.menu?.createGroupDesc || 'Chat with multiple friends',
      action: () => { 
        onCreateGroup(); 
        setIsOpen(false); 
      },
      color: 'from-blue-500 to-indigo-500'
    },
    { 
      icon: Radio, 
      label: t.menu?.createChannel || 'Create Channel', 
      description: t.menu?.createChannelDesc || 'Broadcast to many',
      action: () => { 
        onCreateChannel(); 
        setIsOpen(false); 
      },
      color: 'from-purple-500 to-pink-500'
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      {/* Кнопка-триггер */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 rounded-xl bg-gradient-to-r from-[var(--accent)] to-purple-500 
          hover:from-[var(--accent-hover)] hover:to-purple-600 text-white 
          flex items-center justify-center shadow-lg hover:shadow-xl 
          transition-all duration-200 active:scale-95
          ${isOpen ? 'rotate-45' : 'rotate-0'}`}
        aria-label={isOpen ? 'Close menu' : 'Open create menu'}
        aria-expanded={isOpen}
      >
        <Plus className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-0' : 'rotate-0'}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-12 left-0 z-50 animate-slide-down">
          <div className="glass-strong rounded-2xl p-2 min-w-[240px] shadow-2xl border border-[var(--border)]">
            <div className="px-3 py-2 mb-1 border-b border-[var(--border)]">
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                {t.menu?.title || 'Create new'}
              </p>
            </div>
            
            <div className="space-y-1">
              {menuItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={item.action}
                  className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl 
                    hover:bg-[var(--bg-glass)] transition-all duration-150 
                    group text-left"
                >
                  {/* Иконка с градиентом */}
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${item.color} 
                    flex items-center justify-center shadow-md group-hover:scale-110 
                    transition-transform duration-200 shrink-0`}>
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                  
                  {/* Текст */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-[var(--text-primary)]">
                      {item.label}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] truncate">
                      {item.description}
                    </div>
                  </div>
                  
                  {/* Стрелка-индикатор */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Footer hint */}
            <div className="px-3 py-2 mt-1 border-t border-[var(--border)]">
              <p className="text-[10px] text-[var(--text-tertiary)] text-center">
                {t.menu?.hint || 'Press ESC to close'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}