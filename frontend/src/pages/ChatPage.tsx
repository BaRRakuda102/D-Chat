import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useThemeStore } from '../store/themeStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTranslation } from '../i18n/useTranslation';
import { format } from 'date-fns';
import { LogOut, Send, Search, User, Users, Plus } from 'lucide-react';
import CreateMenu from '../components/CreateMenu';
import AddFriendModal from '../components/AddFriendModal';
import CreateGroupModal from '../components/CreateGroupModal';
import CreateChannelModal from '../components/CreateChannelModal';
import ProfileModal from '../components/ProfileModal';

export default function ChatPage() {
  const { token, user, logout } = useAuthStore();
  const { 
    chats, 
    activeChat, 
    messages, 
    setChats, 
    setActiveChat, 
    setMessages 
  } = useChatStore();
  const { language } = useThemeStore();
  const { sendMessage, sendTyping } = useWebSocket();
  const { t } = useTranslation();
  
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Загрузка чатов
  useEffect(() => {
    fetch('/api/chats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setChats(data));
  }, [token, setChats]);

  // Загрузка сообщений
  useEffect(() => {
    if (!activeChat) return;
    fetch(`/api/chats/${activeChat}/messages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setMessages(activeChat, data));
  }, [activeChat, token, setMessages]);

  // Авто-скролл
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeChat) return;
    sendMessage(activeChat, input.trim());
    setInput('');
  };

  const handleTyping = () => {
    if (!activeChat) return;
    sendTyping(activeChat);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {}, 5000);
  };

  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeMessages = activeChat ? messages[activeChat] || [] : [];
  const activeChatData = chats.find(chat => chat.id === activeChat);

  return (
    <div className="h-screen flex bg-[var(--bg-primary)] overflow-hidden">
      {/* ===== SIDEBAR ===== */}
      <div className="w-80 flex flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)]/50">
        {/* Header - User Info */}
        <div className="p-4 border-b border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowProfile(true)}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center text-white font-semibold shadow-md transition-transform hover:scale-105 active:scale-95"
              >
                {user?.display_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}
              </button>
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-[var(--text-primary)]">
                  {user?.display_name || user?.username}
                </span>
                <span className="text-xs text-[var(--accent)]">
                  {t.chat.online}
                </span>
              </div>
            </div>
            
            <div className="flex gap-1">
              <button
                onClick={() => setShowProfile(true)}
                className="p-2 rounded-lg hover:bg-[var(--bg-glass)] transition-colors"
                title={t.profile?.title || 'Profile'}
              >
                <User className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-red-500/10 transition-colors group"
                title={t.chat.logout || 'Logout'}
              >
                <LogOut className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-red-400" />
              </button>
            </div>
          </div>

          {/* Search & Create Row */}
          <div className="flex gap-2">
            <CreateMenu 
              onAddFriend={() => setShowAddFriend(true)}
              onCreateGroup={() => setShowCreateGroup(true)}
              onCreateChannel={() => setShowCreateChannel(true)}
            />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder={t.chat.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-glass)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Users className="w-12 h-12 text-[var(--text-tertiary)] mb-3 opacity-50" />
              <p className="text-sm text-[var(--text-secondary)]">
                {search ? t.chat.noResults : t.chat.noChats}
              </p>
              {!search && (
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="mt-3 flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  {t.chat.createFirstChat}
                </button>
              )}
            </div>
          ) : (
            filteredChats.map(chat => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-200 group ${
                  activeChat === chat.id 
                    ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/20' 
                    : 'hover:bg-[var(--bg-glass)] border border-transparent'
                }`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent)]/20 to-purple-500/20 flex items-center justify-center text-[var(--accent)] font-bold text-lg shrink-0">
                  {chat.name[0].toUpperCase()}
                </div>
                
                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-medium text-sm text-[var(--text-primary)] truncate">
                      {chat.name}
                    </span>
                    {chat.last_message && (
                      <span className="text-[10px] text-[var(--text-tertiary)] shrink-0 ml-2">
                        {format(new Date(chat.last_message.timestamp), 'HH:mm')}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {chat.last_message 
                        ? `${chat.last_message.sender_name}: ${chat.last_message.content}`
                        : t.chat.noMessages}
                    </p>
                    {chat.unread_count > 0 && (
                      <span className="bg-[var(--accent)] text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center shrink-0">
                        {chat.unread_count > 99 ? '99+' : chat.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ===== CHAT AREA ===== */}
      <div className="flex-1 flex flex-col">
        {activeChat && activeChatData ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]/30 flex items-center gap-4 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)]/20 to-purple-500/20 flex items-center justify-center text-[var(--accent)] font-bold">
                {activeChatData.name[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-[var(--text-primary)]">
                  {activeChatData.name}
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  {activeChatData.participants?.length || 0} {t.chat.participants}
                </p>
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {activeMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Send className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-[var(--text-secondary)]">
                      {t.chat.noMessagesYet}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      {t.chat.startConversation}
                    </p>
                  </div>
                </div>
              ) : (
                activeMessages.map((msg, idx) => {
                  const isMe = msg.sender_id === user?.id;
                  const showDate = idx === 0 || 
                    new Date(msg.timestamp).toDateString() !== 
                    new Date(activeMessages[idx-1]?.timestamp).toDateString();

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-6">
                          <span className="px-3 py-1 rounded-full bg-[var(--bg-glass)] text-[11px] text-[var(--text-secondary)] border border-[var(--border)]">
                            {format(new Date(msg.timestamp), 'MMMM d, yyyy')}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${isMe ? 'message-out' : 'message-in'}`}>
                          {!isMe && (
                            <p className="text-xs text-[var(--accent)] font-medium mb-1 ml-1">
                              {msg.sender_name}
                            </p>
                          )}
                          <div className="px-4 py-2 rounded-2xl break-words">
                            <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                              {msg.content}
                            </p>
                          </div>
                          <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'} px-1`}>
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
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 border-t border-[var(--border)] bg-[var(--bg-secondary)]/30 shrink-0">
              <div className="flex gap-3 items-center max-w-4xl mx-auto">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    handleTyping();
                  }}
                  placeholder={t.chat.typeMessage}
                  className="flex-1 px-4 py-3 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="w-11 h-11 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm p-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent)]/10 to-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <Send className="w-10 h-10 text-[var(--accent)] opacity-70" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">
                {t.chat.welcomeBack}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                {t.chat.selectChatToStart}
              </p>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
              >
                {t.chat.createNewChat}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== MODALS ===== */}
      {showAddFriend && (
        <AddFriendModal onClose={() => setShowAddFriend(false)} />
      )}
      {showCreateGroup && (
        <CreateGroupModal 
          onClose={() => setShowCreateGroup(false)} 
          onCreated={() => {}} 
        />
      )}
      {showCreateChannel && (
        <CreateChannelModal 
          onClose={() => setShowCreateChannel(false)} 
          onCreated={() => {}} 
        />
      )}
      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}