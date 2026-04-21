import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { useThemeStore } from '../store/themeStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { useTranslation } from '../i18n/useTranslation'
import { format } from 'date-fns'
import { LogOut, Send, Search, Menu, Settings, Moon, Sun, Globe } from 'lucide-react'

export default function ChatPage() {
  const { token, user, logout } = useAuthStore()
  const { chats, activeChat, messages, setChats, setActiveChat, setMessages } = useChatStore()
  const { theme, setTheme, language, setLanguage } = useThemeStore()
  const { sendMessage, sendTyping } = useWebSocket()
  const { t } = useTranslation()
  
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeout = useRef<NodeJS.Timeout>()

  useEffect(() => {
    fetch('/api/chats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setChats(data))
  }, [token])

  useEffect(() => {
    if (!activeChat) return
    fetch(`/api/chats/${activeChat}/messages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setMessages(activeChat, data))
  }, [activeChat, token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeChat])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !activeChat) return
    sendMessage(activeChat, input.trim())
    setInput('')
  }

  const handleTyping = () => {
    if (activeChat) {
      sendTyping(activeChat)
      clearTimeout(typingTimeout.current)
      typingTimeout.current = setTimeout(() => {}, 5000)
    }
  }

  const filteredChats = chats.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const activeMessages = activeChat ? messages[activeChat] || [] : []
  const activeChatData = chats.find(c => c.id === activeChat)

  return (
    <div className="h-screen flex bg-[var(--bg-primary)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 glass-sidebar flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
                {user?.display_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm text-[var(--text-primary)]">{user?.display_name || user?.username}</p>
                <p className="text-xs text-[var(--accent)]">{t.chat.online}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="glass-button !p-2 !rounded-lg"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button 
                onClick={logout}
                className="glass-button !p-2 !rounded-lg hover:bg-red-500/20 hover:text-red-400"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="glass-strong rounded-xl p-3 mb-3 animate-fade-in space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">{t.settings.theme}</span>
                <div className="flex gap-1">
                  <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-[var(--accent)] text-white' : 'glass-button !p-1.5'}`}>
                    <Moon className="w-3 h-3" />
                  </button>
                  <button onClick={() => setTheme('light')} className={`p-1.5 rounded-lg ${theme === 'light' ? 'bg-[var(--accent)] text-white' : 'glass-button !p-1.5'}`}>
                    <Sun className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">{t.settings.language}</span>
                <div className="flex gap-1">
                  <button onClick={() => setLanguage('ru')} className={`px-2 py-1 rounded-lg text-xs ${language === 'ru' ? 'bg-[var(--accent)] text-white' : 'glass-button !px-2 !py-1'}`}>RU</button>
                  <button onClick={() => setLanguage('en')} className={`px-2 py-1 rounded-lg text-xs ${language === 'en' ? 'bg-[var(--accent)] text-white' : 'glass-button !px-2 !py-1'}`}>EN</button>
                </div>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder={t.chat.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input w-full !pl-10"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto scrollbar-mac p-2 space-y-1">
          {filteredChats.map(chat => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                activeChat === chat.id 
                  ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/20' 
                  : 'hover:bg-[var(--bg-glass)] border border-transparent'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent)]/20 to-purple-500/20 flex items-center justify-center text-[var(--accent)] font-bold text-lg shrink-0">
                {chat.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="font-medium text-sm text-[var(--text-primary)] truncate">{chat.name}</span>
                  {chat.last_message && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {format(new Date(chat.last_message.timestamp), 'HH:mm')}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {chat.last_message ? `${chat.last_message.sender_name}: ${chat.last_message.content}` : 'No messages'}
                  </p>
                  {chat.unread_count > 0 && (
                    <span className="bg-[var(--accent)] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[var(--bg-primary)]">
        {activeChat ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 glass border-b border-[var(--border)] flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)]/20 to-purple-500/20 flex items-center justify-center text-[var(--accent)] font-bold">
                {activeChatData?.name[0].toUpperCase()}
              </div>
              <div>
                <h2 className="font-semibold text-[var(--text-primary)]">{activeChatData?.name}</h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  {activeChatData?.participants.length} {language === 'ru' ? 'участников' : 'participants'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-mac p-6 space-y-4">
              {activeMessages.map((msg, idx) => {
                const isMe = msg.sender_id === user?.id
                const showDate = idx === 0 || 
                  new Date(msg.timestamp).toDateString() !== 
                  new Date(activeMessages[idx-1]?.timestamp).toDateString()

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="text-center my-6">
                        <span className="glass px-4 py-1.5 rounded-full text-[11px] text-[var(--text-secondary)]">
                          {format(new Date(msg.timestamp), 'MMMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`message-bubble ${isMe ? 'message-out' : 'message-in'}`}>
                        {!isMe && (
                          <p className="text-xs text-[var(--accent)] font-medium mb-1">
                            {msg.sender_name}
                          </p>
                        )}
                        <p className="text-[var(--text-primary)] leading-relaxed">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1.5">
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {format(new Date(msg.timestamp), 'HH:mm')}
                          </span>
                          {isMe && (
                            <svg className="w-3 h-3 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 glass border-t border-[var(--border)]">
              <div className="flex gap-3 items-center max-w-4xl mx-auto">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    handleTyping()
                  }}
                  placeholder={t.chat.typeMessage}
                  className="glass-input flex-1 !py-3"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="w-11 h-11 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center glass-card max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)]/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-[var(--accent)]" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">
                {language === 'ru' ? 'Выберите чат' : 'Select a chat'}
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {language === 'ru' ? 'Начните общение с друзьями' : 'Start messaging with friends'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}