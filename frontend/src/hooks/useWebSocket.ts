// frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'

export const useWebSocket = () => {
  const token = useAuthStore((state) => state.token)
  const addMessage = useChatStore((state) => state.addMessage)
  const intervalRef = useRef<NodeJS.Timeout>()

  // Polling вместо WebSocket
  useEffect(() => {
    if (!token) return

    const poll = async () => {
      try {
        // Получаем новые сообщения через API
        const res = await fetch('/api/chats', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const chats = await res.json()
          // Обновляем чаты
        }
      } catch (e) {
        console.error('Poll error:', e)
      }
    }

    intervalRef.current = setInterval(poll, 3000) // Каждые 3 секунды
    poll() // Первый запрос сразу

    return () => {
      clearInterval(intervalRef.current)
    }
  }, [token])

  const sendMessage = useCallback((chatId: string, content: string) => {
    fetch(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ chat_id: chatId, content })
    })
  }, [token])

  return { sendMessage }
}