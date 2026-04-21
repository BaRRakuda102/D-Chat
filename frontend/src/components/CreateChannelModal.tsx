import { useState, useEffect, useRef } from 'react';
import { X, Radio, Hash, FileText, AlertCircle, Megaphone } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface CreateChannelModalProps {
  onClose: () => void;
  onCreated: (channelId?: string) => void;
}

export default function CreateChannelModal({ onClose, onCreated }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t.channel?.nameRequired || 'Channel name is required');
      return;
    }
    
    setLoading(true);

    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: trimmedName, 
          description: description.trim() || undefined 
        })
      });

      if (res.ok) {
        const data = await res.json();
        onCreated(data?.id);
        onClose();
      } else {
        const err = await res.json();
        setError(err.detail || t.channel?.creationFailed || 'Failed to create channel');
      }
    } catch {
      setError(t.channel?.networkError || 'Network error. Please try again.');
    } finally {
      setLoading(false);
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
      <div className="relative glass-strong rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--accent)]/5 to-purple-500/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {t.channel?.create || 'Create Channel'}
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

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/10">
              <Megaphone className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {t.channel?.info || 'Channels are public spaces where anyone can join and follow updates. Perfect for announcements, communities, or topic-based discussions.'}
                </p>
              </div>
            </div>

            {/* Channel Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                <Hash className="w-4 h-4" />
                {t.channel?.channelName || 'Channel Name'} <span className="text-red-400">*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.channel?.namePlaceholder || 'e.g., announcements, tech-news, gaming'}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                required
                maxLength={50}
                disabled={loading}
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  {t.channel?.nameHint || 'Lowercase letters, numbers, and hyphens only'}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">{name.length}/50</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                {t.channel?.description || 'Description'} <span className="text-[var(--text-tertiary)] text-xs">({t.common?.optional || 'optional'})</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.channel?.descPlaceholder || 'What is this channel about? Who is it for?'}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all resize-none"
                rows={3}
                maxLength={500}
                disabled={loading}
              />
              <div className="flex justify-end">
                <span className="text-[10px] text-[var(--text-tertiary)]">{description.length}/500</span>
              </div>
            </div>

            {/* Preview Section */}
            {name.trim() && (
              <div className="space-y-2 pt-2 animate-fade-in">
                <p className="text-xs text-[var(--text-tertiary)]">{t.channel?.preview || 'Preview'}:</p>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)]">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)]/20 to-purple-500/20 flex items-center justify-center">
                    <Radio className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        #{name.trim().toLowerCase().replace(/\s+/g, '-')}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]">
                        {t.channel?.public || 'public'}
                      </span>
                    </div>
                    {description && (
                      <p className="text-xs text-[var(--text-tertiary)] truncate">
                        {description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl p-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
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
                disabled={loading || !name.trim()}
                className="flex-1 bg-gradient-to-r from-[var(--accent)] to-purple-500 hover:from-[var(--accent-hover)] hover:to-purple-600 text-white py-2.5 rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t.common?.creating || 'Creating...'}</span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Radio className="w-4 h-4" />
                    {t.channel?.create || 'Create Channel'}
                  </span>
                )}
              </button>
            </div>

            {/* Footer Hint */}
            <p className="text-[10px] text-[var(--text-tertiary)] text-center">
              {t.channel?.footerHint || 'Press ESC to close • Channel names must be unique'}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}