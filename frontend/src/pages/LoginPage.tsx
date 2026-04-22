import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useTranslation } from '../i18n/useTranslation';
import { Shield, Users, Image, Globe, Moon, Sun, Settings, Languages, X } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const setAuth = useAuthStore((state) => state.setAuth);
  const { theme, setTheme, language, setLanguage } = useThemeStore();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin 
      ? { username, password }
      : { 
          username, 
          password, 
          display_name: displayName || username
        };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || JSON.stringify(err) || 'Unknown error');
      }

      const { access_token } = await res.json();
      
      const meRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const user = await meRes.json();

      setAuth(access_token, user);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Shield, title: t.features.encryption.title, desc: t.features.encryption.desc },
    { icon: Users, title: t.features.groups.title, desc: t.features.groups.desc },
    { icon: Image, title: t.features.files.title, desc: t.features.files.desc },
    { icon: Globe, title: t.features.everywhere.title, desc: t.features.everywhere.desc },
  ];

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)]">
      {/* ===== LEFT SIDE - BRANDING ===== */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 via-transparent to-purple-500/5" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-[var(--accent)] rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full blur-[120px] animate-pulse delay-1000" />
        </div>
        
        <div className="relative z-10 max-w-lg w-full">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 mb-8 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--accent)] to-purple-400 bg-clip-text text-transparent">
              {t.app.name}
            </h1>
          </div>
          
          <div className="space-y-4 animate-slide-up">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              {t.app.tagline}
            </h2>
            <p className="text-[var(--text-secondary)] text-lg leading-relaxed">
              {t.app.description}
            </p>
          </div>

          {/* Features Grid */}
          <div className="mt-12 space-y-3">
            {features.map((feature, idx) => (
              <div 
                key={idx} 
                className="glass-card flex items-start gap-4 group transition-all duration-300 hover:scale-[1.02]"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--accent)]/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== RIGHT SIDE - AUTH FORM ===== */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-8 relative">
        {/* Settings Button */}
        <div className="absolute top-6 right-6 flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2.5 rounded-xl glass-button hover:scale-105 transition-transform"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setShowSettings(false)}
            />
            <div className="absolute top-20 right-6 glass-strong rounded-2xl p-5 w-72 z-50 animate-fade-in shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--text-primary)]">
                  {t.settings.title}
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded-lg hover:bg-[var(--bg-glass)] transition-colors"
                >
                  <X className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>
              
              <div className="space-y-5">
                {/* Theme Selector */}
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-2 block">
                    {t.settings.theme}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['dark', 'light', 'auto'] as const).map((themeName) => (
                      <button
                        key={themeName}
                        onClick={() => setTheme(themeName)}
                        className={`py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                          theme === themeName 
                            ? 'bg-[var(--accent)] text-white shadow-md' 
                            : 'glass-button'
                        }`}
                      >
                        {themeName === 'dark' && <Moon className="w-3 h-3" />}
                        {themeName === 'light' && <Sun className="w-3 h-3" />}
                        {themeName === 'auto' && <Settings className="w-3 h-3" />}
                        {t.settings[themeName]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language Selector */}
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-2 block">
                    {t.settings.language}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['ru', 'en'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={`py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                          language === lang 
                            ? 'bg-[var(--accent)] text-white shadow-md' 
                            : 'glass-button'
                        }`}
                      >
                        <Languages className="w-3 h-3" />
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Auth Form Container */}
        <div className="w-full max-w-md animate-slide-up">
          <div className="glass-strong rounded-2xl p-6 md:p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-center mb-6 text-[var(--text-primary)]">
              {isLogin ? t.app.welcome : t.app.register}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
              <div className="space-y-1">
                <label className="text-xs text-[var(--text-secondary)] ml-1">
                  {t.app.username}
                </label>
                <input
                  type="text"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input w-full"
                  required
                  minLength={3}
                  autoComplete="username"
                />
              </div>
              
              {/* Display Name (Register only) */}
              {!isLogin && (
                <div className="space-y-1 animate-fade-in">
                  <label className="text-xs text-[var(--text-secondary)] ml-1">
                    {t.app.displayName} <span className="opacity-60">({t.app.optional})</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t.app.displayNamePlaceholder || "John Doe"}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="glass-input w-full"
                    autoComplete="name"
                  />
                </div>
              )}
              
              {/* Password Field */}
              <div className="space-y-1">
                <label className="text-xs text-[var(--text-secondary)] ml-1">
                  {t.app.password}
                </label>
                <input
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full"
                  required
                  minLength={6}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-red-400 text-sm text-center bg-red-500/10 rounded-xl p-3 border border-red-500/20 animate-shake">
                  {typeof error === 'string' ? error : JSON.stringify(error)}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full bg-gradient-to-r from-[var(--accent)] to-purple-500 hover:from-[var(--accent-hover)] hover:to-purple-600 text-white py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t.app.loading}
                  </span>
                ) : (
                  isLogin ? t.app.login : t.app.register
                )}
              </button>
            </form>

            {/* Toggle Auth Mode */}
            <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
              {isLogin ? t.app.noAccount : t.app.haveAccount}{' '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setPassword('');
                }}
                className="text-[var(--accent)] hover:underline font-medium transition-colors"
              >
                {isLogin ? t.app.register : t.app.login}
              </button>
            </p>
          </div>

          {/* Footer Info */}
          <p className="text-center text-xs text-[var(--text-tertiary)] mt-6">
            {t.app.secureConnection}
          </p>
        </div>
      </div>
    </div>
  );
}