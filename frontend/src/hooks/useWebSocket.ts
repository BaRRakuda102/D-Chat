import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'

export const useWebSocket = () => {
  const token = useAuthStore((state) => state.token)
  const addMessage = useChatStore((state) => state.addMessage)
  const updateTyping = useChatStore((state) => state.updateTyping)
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<NodeJS.Timeout>()

  const connect = useCallback(() => {
    if (!token) return

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/${token}`
    
    ws.current = new WebSocket(wsUrl)

    ws.current.onopen = () => {
      console.log('WS Connected')
      // Heartbeat
      const interval = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30000)
      
      ws.current.onclose = () => {
        clearInterval(interval)
      }
    }

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'new_message':
          addMessage(data.data.chat_id, data.data)
          break
        case 'typing':
          updateTyping(data.data.chat_id, data.data.user_id, true)
          setTimeout(() => {
            updateTyping(data.data.chat_id, data.data.user_id, false)
          }, 5000)
          break
        case 'pong':
          break
      }
    }

    ws.current.onclose = () => {
      console.log('WS Disconnected, reconnecting...')
      reconnectTimeout.current = setTimeout(connect, 3000)
    }

    ws.current.onerror = (error) => {
      console.error('WS Error:', error)
      ws.current?.close()
    }
  }, [token])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimeout.current)
      ws.current?.close()
    }
  }, [connect])

  const sendMessage = useCallback((chatId: string, content: string) => {
    // Отправляем через REST API, WS используем для real-time updates
    fetch(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ chat_id: chatId, content })
    })
  }, [token])

  const sendTyping = useCallback((chatId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'typing', chat_id: chatId }))
    }
  }, [])

  return { sendMessage, sendTyping }
}