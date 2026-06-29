'use client'

import { useEffect, useRef, useCallback } from 'react'

type SSEEvent = {
  type: string
  [key: string]: unknown
}

type UseSSEOptions = {
  onEvent: (event: SSEEvent) => void
  enabled?: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export function useSSE({ onEvent, enabled = true }: UseSSEOptions) {
  const esRef = useRef<EventSource | null>(null)
  const reconnectDelay = useRef(1000)

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
    }

    const es = new EventSource(`${API_URL}/api/live`, { withCredentials: true })
    esRef.current = es

    const handleEvent = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data as string) as SSEEvent
        onEvent({ ...data, type: e.type })
      } catch {
        // Ignore malformed events
      }
    }

    es.addEventListener('clock_in', handleEvent)
    es.addEventListener('clock_out', handleEvent)
    es.addEventListener('ping', () => {}) // keepalive, no action needed

    es.onerror = () => {
      es.close()
      esRef.current = null
      // Exponential backoff reconnect (max 30s)
      const delay = Math.min(reconnectDelay.current, 30_000)
      reconnectDelay.current = delay * 2
      setTimeout(connect, delay)
    }

    es.onopen = () => {
      reconnectDelay.current = 1000 // reset on successful connection
    }
  }, [onEvent])

  useEffect(() => {
    if (!enabled) return
    connect()
    return () => {
      esRef.current?.close()
      esRef.current = null
    }
  }, [connect, enabled])
}
