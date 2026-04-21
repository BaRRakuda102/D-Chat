import { useState, useEffect, useRef } from 'react';
import { X, Search, UserPlus, CheckCircle, AlertCircle, User } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface AddFriendModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddFriendModal({ onClose, onSuccess }: AddFriendModalProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type?: 'success' | 'error'; message?: string }>({});
  const [recentSearch, setRecentSearch] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  // Фокус на input при открытии
  useEffect(() => {
    inputRef.current?.focus();
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
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername) return;
    
    setLoading(true);
    setResult({});

    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_username: trimmedUsername })
      });

      if (res.ok) {
        setResult({ 
          type: 'success', 
          message: t.friend?.requestSent || 'Friend request sent successfully!' 
        });
        
        // Сохраняем в недавние поиски
        setRecentSearch(prev => 
          [trimmedUsername, ...prev.filter(u => u !== trimmedUsername)].slice(0, 3)
        );
        
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        const err = await res.json();
        setResult({ 
          type: 'error', 
          message: err.detail || t.friend?.requestFailed || 'Failed to send request' 
        });
      }
    } catch {
      setResult({ 
        type: 'error', 
        message: t.friend?.networkError || 'Network error. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecentClick = (recentUsername: string) => {
    setUsername(recentUsername);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="relative glass-strong rounded-2xl w-full max-w-md shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--accent)]/5 to-purple-500/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {t.friend?.addFriend || 'Add Friend'}
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
            {/* Description */}
            <p className="text-sm text-[var(--text-secondary)] text-center">
              {t.friend?.description || 'Enter the username of the person you want to add to your friends list.'}
            </p>

            {/* Input Field */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Search className="w-5 h-5 text-[var(--text-tertiary)]" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.friend?.enterUsername || 'Username'}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                required
                minLength={3}
                autoComplete="off"
                disabled={loading}
              />
              {/* Character counter */}
              {username.length > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-tertiary)]">
                  {username.length}
                </div>
              )}
            </div>

            {/* Recent Searches */}
            {recentSearch.length > 0 && !username && (
              <div className="space-y-2">
                <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {t.friend?.recent || 'Recent'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentSearch.map((recent, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleRecentClick(recent)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-glass)] text-xs text-[var(--text-secondary)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors"
                    >
                      {recent}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Result Message */}
            {result.message && (
              <div className={`flex items-center gap-2 rounded-xl p-3 text-sm ${
                result.type === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {result.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                )}
                <span>{result.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl glass-button font-medium transition-all"
              >
                {t.common?.cancel || 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="flex-1 bg-gradient-to-r from-[var(--accent)] to-purple-500 hover:from-[var(--accent-hover)] hover:to-purple-600 text-white py-2.5 rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t.common?.sending || 'Sending...'}</span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    {t.friend?.sendRequest || 'Send Request'}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Hint */}
        <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--bg-glass)]/30">
          <p className="text-[10px] text-[var(--text-tertiary)] text-center">
            {t.friend?.hint || 'Press ESC to close • Username must be at least 3 characters'}
          </p>
        </div>
      </div>
    </div>
  );
}