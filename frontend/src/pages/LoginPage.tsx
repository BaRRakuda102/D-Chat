import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { useTranslation } from '../i18n/useTranslation'
import { Shield, Users, Image, Globe, Moon, Sun, Settings, Languages } from 'lucide-react'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  const setAuth = useAuthStore((state) => state.setAuth)
  const { theme, setTheme, language, setLanguage } = useThemeStore()
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
    const body = isLogin 
      ? { username, password }
      : { username, password, display_name: displayName || username }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Error')
      }

      const { access_token } = await res.json()
      
      const meRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${access_token}` }
      })
      const user = await meRes.json()

      setAuth(access_token, user)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: Shield, title: t.features.encryption.title, desc: t.features.encryption.desc },
    { icon: Users, title: t.features.groups.title, desc: t.features.groups.desc },
    { icon: Image, title: t.features.files.title, desc: t.features.files.desc },
    { icon: Globe, title: t.features.everywhere.title, desc: t.features.everywhere.desc },
  ]

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] animate-fade-in">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 via-transparent to-purple-500/10" />
        
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--accent)] to-purple-400 bg-clip-text text-transparent">
              {t.app.name}
            </h1>
          </div>
          
          <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)]">
            {t.app.tagline}
          </h2>
          
          <p className="text-[var(--text-secondary)] text-lg mb-12 leading-relaxed">
            {t.app.description}
          </p>

          <div className="space-y-4">
            {features.map((feature, idx) => (
              <div 
                key={idx} 
                className="glass-card flex items-start gap-4 group cursor-default"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--accent)]/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 relative">
        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-6 right-6 glass-button !p-3"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute top-20 right-6 glass-strong rounded-2xl p-4 w-64 z-50 animate-fade-in">
            <h3 className="font-semibold mb-4 text-[var(--text-primary)]">{t.settings.title}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-[var(--text-secondary)] mb-2 block">{t.settings.theme}</label>
                <div className="flex gap-2">
                  {(['dark', 'light', 'auto'] as const).map((tname) => (
                    <button
                      key={tname}
                      onClick={() => setTheme(tname)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                        theme === tname 
                          ? 'bg-[var(--accent)] text-white shadow-lg' 
                          : 'glass-button !py-2 !px-0'
                      }`}
                    >
                      {t.settings[tname]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-[var(--text-secondary)] mb-2 block">{t.settings.language}</label>
                <div className="flex gap-2">
                  {(['ru', 'en'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
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
          </div>
        )}

        <div className="w-full max-w-md">
          <div className="glass-strong rounded-mac-lg p-8 animate-slide-up">
            <h2 className="text-2xl font-bold text-center mb-8 text-[var(--text-primary)]">
              {isLogin ? t.app.welcome : t.app.register}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder={t.app.username}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input w-full"
                  required
                  minLength={3}
                />
              </div>
              
              {!isLogin && (
                <div>
                  <input
                    type="text"
                    placeholder={t.app.displayName}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="glass-input w-full"
                  />
                </div>
              )}
              
              <div>
                <input
                  type="password"
                  placeholder={t.app.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '...' : isLogin ? t.app.login : t.app.register}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
              {isLogin ? t.app.noAccount : t.app.haveAccount}{' '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                }}
                className="text-[var(--accent)] hover:underline font-medium"
              >
                {isLogin ? t.app.register : t.app.login}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}