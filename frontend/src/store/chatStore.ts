import { create } from 'zustand'

interface Message {
  id: string
  sender_id: number
  sender_name: string
  content: string
  timestamp: string
  type: string
  edited: boolean
}

interface Chat {
  id: string
  name: string
  type: string
  participants: number[]
  last_message?: Message
  unread_count: number
}

interface ChatState {
  chats: Chat[]
  activeChat: string | null
  messages: Record<string, Message[]>
  typing: Record<string, number[]>
  setChats: (chats: Chat[]) => void
  setActiveChat: (chatId: string | null) => void
  addMessage: (chatId: string, message: Message) => void
  setMessages: (chatId: string, messages: Message[]) => void
  updateTyping: (chatId: string, userId: number, isTyping: boolean) => void
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  activeChat: null,
  messages: {},
  typing: {},
  setChats: (chats) => set({ chats }),
  setActiveChat: (chatId) => set({ activeChat: chatId }),
  addMessage: (chatId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: [...(state.messages[chatId] || []), message],
      },
      chats: state.chats.map((c) =>
        c.id === chatId
          ? { ...c, last_message: message, unread_count: c.activeChat === chatId ? 0 : c.unread_count + 1 }
          : c
      ),
    })),
  setMessages: (chatId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [chatId]: messages },
    })),
  updateTyping: (chatId, userId, isTyping) =>
    set((state) => {
      const current = state.typing[chatId] || []
      const updated = isTyping
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId)
      return { typing: { ...state.typing, [chatId]: updated } }
    }),
}))