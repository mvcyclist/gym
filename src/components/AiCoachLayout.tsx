import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

interface ChatMessage {
  id: string
  role: 'ai' | 'user'
  text: string
  chips?: string[]
}

const INITIAL_MESSAGES: ChatMessage[] = [{
  id: 'init',
  role: 'ai',
  text: "Strong week. What does next week look like?\nAny days that are tight?",
  chips: ['Monday is busy', 'Travelling Thu–Fri', 'Add a run', 'Feeling tired', 'Move Push to Wed'],
}]

interface AiCoachContextValue {
  chatVisible: boolean
  openChat: () => void
  closeChat: () => void
}

const AiCoachContext = createContext<AiCoachContextValue | null>(null)

export function useAiCoachChat(): AiCoachContextValue {
  const ctx = useContext(AiCoachContext)
  if (!ctx) {
    throw new Error('useAiCoachChat must be used within AiCoachLayout')
  }
  return ctx
}

interface AiCoachLayoutProps {
  children: ReactNode
  defaultChatVisible?: boolean
  showFloatingTrigger?: boolean
}

export function AiCoachLayout({
  children,
  defaultChatVisible = false,
  showFloatingTrigger = false,
}: AiCoachLayoutProps) {
  const [chatVisible, setChatVisible] = useState(defaultChatVisible)
  const [chatWidth, setChatWidth] = useState(360)
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [chatInput, setChatInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const resizing = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const openChat = useCallback(() => setChatVisible(true), [])
  const closeChat = useCallback(() => setChatVisible(false), [])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [messages, isTyping])

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return
    setMessages((m) => [...m, { id: Date.now().toString(), role: 'user', text: text.trim() }])
    setChatInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setMessages((m) => [...m, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: "Got it — I'll factor that in when the AI planning feature is ready. For now you can adjust any day directly by tapping it.",
      }])
    }, 1500)
  }, [])

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    resizing.current = true
    startX.current = e.clientX
    startW.current = chatWidth
    e.preventDefault()
  }, [chatWidth])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizing.current) return
      const newW = Math.max(260, Math.min(580, startW.current + (startX.current - e.clientX)))
      setChatWidth(newW)
    }
    const onUp = () => { resizing.current = false }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  return (
    <AiCoachContext.Provider value={{ chatVisible, openChat, closeChat }}>
      <div style={{ display: 'flex', flex: 1, width: '100%', height: '100%', overflow: 'hidden', minHeight: 0 }}>
        <div style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
            {children}
          </div>

          {showFloatingTrigger && !chatVisible && (
            <button
              type="button"
              onClick={openChat}
              style={{
                position: 'fixed',
                right: 20,
                bottom: 20,
                zIndex: 50,
                background: '#6B1C23',
                border: '0.5px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                padding: '12px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 20px rgba(60,12,18,0.5)',
              }}
            >
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.92)' }}>✦</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
                Plan with AI
              </span>
            </button>
          )}
        </div>

        {chatVisible && (
          <div
            onMouseDown={onResizeMouseDown}
            style={{
              width: 4,
              background: 'transparent',
              cursor: 'col-resize',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(239,68,68,0.3)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
          />
        )}

        {chatVisible && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignSelf: 'stretch',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            background: '#141414',
            borderLeft: '0.5px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
            width: chatWidth,
            minWidth: 260,
            maxWidth: 580,
          }}>
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '0.5px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#181818',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Plan with AI</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                  Knows your history · updates your plan
                </div>
              </div>
              <button
                type="button"
                onClick={closeChat}
                style={{
                  background: 'none',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 5,
                  padding: '3px 8px',
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                → hide
              </button>
            </div>

            <div
              ref={messagesContainerRef}
              className="chat-scroll"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                overscrollBehavior: 'contain',
                padding: '1rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.875rem',
              }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  {msg.role === 'ai' && (
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em', marginBottom: 2 }}>
                      AI COACH
                    </div>
                  )}
                  <div style={{
                    background: msg.role === 'ai' ? '#1e1e1e' : 'rgba(239,68,68,0.1)',
                    border: `0.5px solid ${msg.role === 'ai' ? 'rgba(255,255,255,0.09)' : 'rgba(239,68,68,0.2)'}`,
                    borderRadius: msg.role === 'ai' ? '0 10px 10px 10px' : '10px 0 10px 10px',
                    padding: '10px 13px',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.55,
                    maxWidth: msg.role === 'ai' ? '94%' : '90%',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.text}
                  </div>
                  {msg.chips && msg.chips.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                      {msg.chips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => sendMessage(chip)}
                          style={{
                            fontSize: 11,
                            padding: '6px 12px',
                            border: '0.5px solid rgba(255,255,255,0.1)',
                            borderRadius: 20,
                            color: 'rgba(255,255,255,0.4)',
                            background: '#1a1a1a',
                            cursor: 'pointer',
                          }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em', marginBottom: 2 }}>
                    AI COACH
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '10px 13px',
                    background: '#1e1e1e',
                    border: '0.5px solid rgba(255,255,255,0.08)',
                    borderRadius: '0 10px 10px 10px',
                  }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: 'rgba(255,255,255,0.3)',
                          animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{
              padding: '1rem 1.25rem',
              borderTop: '0.5px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
              background: '#141414',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
            }}>
              <textarea
                ref={textareaRef}
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage(chatInput)
                  }
                }}
                placeholder="Tell me about your week..."
                rows={1}
                style={{
                  flex: 1,
                  background: '#1e1e1e',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  padding: '10px 13px',
                  fontSize: 13,
                  color: '#fff',
                  resize: 'none',
                  outline: 'none',
                  minHeight: 40,
                  maxHeight: 100,
                  lineHeight: 1.4,
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="button"
                onClick={() => sendMessage(chatInput)}
                style={{
                  background: '#ef4444', border: 'none', borderRadius: 7,
                  width: 38, height: 38, color: '#fff', fontSize: 16, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                ↑
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        .chat-scroll::-webkit-scrollbar { width: 3px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </AiCoachContext.Provider>
  )
}
