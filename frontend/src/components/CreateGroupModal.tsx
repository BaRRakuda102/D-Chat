import { useState, useEffect, useRef } from 'react';
import { X, Users, Plus, Minus, User, Hash, FileText, AlertCircle } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: (groupId?: string) => void;
}

export default function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  // Фокус на поле имени при открытии
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const addMember = () => {
    setMembers([...members, '']);
  };

  const removeMember = (idx: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== idx));
    }
  };

  const updateMember = (idx: number, value: string) => {
    const newMembers = [...members];
    newMembers[idx] = value;
    setMembers(newMembers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const trimmedName = name.trim();
    const validMembers = members.filter(m => m.trim());
    
    if (!trimmedName) {
      setError(t.group?.nameRequired || 'Group name is required');
      return;
    }
    
    if (validMembers.length === 0) {
      setError(t.group?.atLeastOneMember || 'Add at least one member');
      return;
    }
    
    setLoading(true);

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
          member_usernames: validMembers
        })
      });

      if (res.ok) {
        const data = await res.json();
        onCreated(data?.id);
        onClose();
      } else {
        const err = await res.json();
        setError(err.detail || t.group?.creationFailed || 'Failed to create group');
      }
    } catch {
      setError(t.group?.networkError || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validMembersCount = members.filter(m => m.trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="relative glass-strong rounded-2xl w-full max-w-md shadow-2xl animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--accent)]/5 to-purple-500/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {t.group?.create || 'Create Group'}
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

        {/* Body with scroll */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Group Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                <Hash className="w-4 h-4" />
                {t.group?.groupName || 'Group Name'} <span className="text-red-400">*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.group?.namePlaceholder || 'e.g., Game Night, Study Group'}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                required
                maxLength={50}
                disabled={loading}
              />
              <div className="flex justify-end">
                <span className="text-[10px] text-[var(--text-tertiary)]">{name.length}/50</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                {t.group?.description || 'Description'} <span className="text-[var(--text-tertiary)] text-xs">({t.common?.optional || 'optional'})</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.group?.descPlaceholder || 'What is this group about?'}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                maxLength={200}
                disabled={loading}
              />
            </div>

            {/* Members Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {t.group?.members || 'Members'} <span className="text-red-400">*</span>
                </label>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {validMembersCount} {t.group?.participants || 'participants'}
                </span>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {members.map((member, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <User className="w-4 h-4 text-[var(--text-tertiary)]" />
                      </div>
                      <input
                        type="text"
                        value={member}
                        onChange={(e) => updateMember(idx, e.target.value)}
                        placeholder={`${t.friend?.username || 'Username'} ${idx + 1}`}
                        className="w-full pl-10 pr-3 py-2 rounded-lg bg-[var(--bg-glass)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition-all"
                        disabled={loading}
                      />
                    </div>
                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMember(idx)}
                        className="p-2 rounded-lg hover:bg-red-500/10 transition-colors group"
                        aria-label="Remove member"
                      >
                        <Minus className="w-4 h-4 text-red-400 group-hover:text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={addMember}
                className="w-full py-2 rounded-lg glass-button text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
              >
                <Plus className="w-4 h-4" />
                {t.group?.addMember || 'Add Member'}
              </button>
              
              <p className="text-[10px] text-[var(--text-tertiary)] text-center">
                {t.group?.memberHint || 'Enter usernames of people to add'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl p-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>

        {/* Footer with buttons */}
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
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !name.trim() || validMembersCount === 0}
              className="flex-1 bg-gradient-to-r from-[var(--accent)] to-purple-500 hover:from-[var(--accent-hover)] hover:to-purple-600 text-white py-2.5 rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t.common?.creating || 'Creating...'}</span>
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Users className="w-4 h-4" />
                  {t.group?.create || 'Create Group'}
                </span>
              )}
            </button>
          </div>
          
          {/* Footer hint */}
          <p className="text-[10px] text-[var(--text-tertiary)] text-center mt-3">
            {t.group?.footerHint || 'Press ESC to close • Members can be added later'}
          </p>
        </div>
      </div>
    </div>
  );
}