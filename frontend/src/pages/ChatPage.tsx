import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { format } from 'date-fns'
import { LogOut, Send, Search, Menu } from 'lucide-react'

export default function ChatPage() {
  const { token, user, logout } = useAuthStore()
  const { chats, activeChat, messages, setChats, setActiveChat, setMessages } = useChatStore()
  const { sendMessage, sendTyping } = useWebSocket()
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeout = useRef<NodeJS.Timeout>()

  // Загрузка чатов
  useEffect(() => {
    fetch('/api/chats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setChats(data))
  }, [token])

  // Загрузка сообщений при смене чата
  useEffect(() => {
    if (!activeChat) return
    fetch(`/api/chats/${activeChat}/messages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setMessages(activeChat, data))
  }, [activeChat, token])

  // Автоскролл
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
    <div className="h-screen flex bg-white">
      {/* Sidebar */}
      <div className="w-80 bg-telegram-sidebar flex flex-col border-r">
        <div className="p-3 bg-white border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Menu className="w-5 h-5 text-gray-500" />
              <span className="font-semibold">{user?.display_name || user?.username}</span>
            </div>
            <button onClick={logout} className="text-gray-500 hover:text-red-500">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filteredChats.map(chat => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`w-full text-left p-3 flex items-center gap-3 hover:bg-gray-100 transition ${
                activeChat === chat.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-telegram-blue flex items-center justify-center text-white font-bold text-lg">
                {chat.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-medium truncate">{chat.name}</span>
                  {chat.last_message && (
                    <span className="text-xs text-gray-400">
                      {format(new Date(chat.last_message.timestamp), 'HH:mm')}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500 truncate">
                    {chat.last_message ? `${chat.last_message.sender_name}: ${chat.last_message.content}` : 'No messages'}
                  </p>
                  {chat.unread_count > 0 && (
                    <span className="bg-telegram-blue text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
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
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 bg-white border-b flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-telegram-blue flex items-center justify-center text-white font-bold">
                {activeChatData?.name[0].toUpperCase()}
              </div>
              <div>
                <h2 className="font-medium">{activeChatData?.name}</h2>
                <p className="text-xs text-gray-500">
                  {activeChatData?.participants.length} participants
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[url('https://web.telegram.org/a/chat-bg-pattern-light.png')]">
              {activeMessages.map((msg, idx) => {
                const isMe = msg.sender_id === user?.id
                const showDate = idx === 0 || 
                  new Date(msg.timestamp).toDateString() !== 
                  new Date(activeMessages[idx-1].timestamp).toDateString()

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="text-center my-4">
                        <span className="bg-blue-100 text-blue-600 text-xs px-3 py-1 rounded-full">
                          {format(new Date(msg.timestamp), 'MMMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`message-bubble ${isMe ? 'message-out' : 'message-in'} shadow-sm`}>
                        {!isMe && (
                          <p className="text-xs text-telegram-blue font-medium mb-1">
                            {msg.sender_name}
                          </p>
                        )}
                        <p className="text-gray-800">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] text-gray-400">
                            {format(new Date(msg.timestamp), 'HH:mm')}
                          </span>
                          {isMe && (
                            <span className="text-[10px] text-gray-400">✓</span>
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
            <form onSubmit={handleSend} className="p-3 bg-white border-t flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  handleTyping()
                }}
                placeholder="Write a message..."
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-telegram-blue"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 bg-telegram-blue text-white rounded-full hover:bg-blue-600 transition disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">Select a chat to start messaging</h2>
              <p className="text-sm">Choose from your existing conversations</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}