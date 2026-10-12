import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './GuideWidget.css'

const AI_API_URL = (
  import.meta.env.VITE_AI_API_URL ||
  'http://127.0.0.1:8000'
).replace(/\/$/, '')

const INITIAL_MESSAGE = {
  id: 1,
  role: 'assistant',
  text: '안녕하세요! 찾으시는 기능을 말씀해 주세요. 알맞은 페이지로 안내해 드릴게요.',
  page: null,
}

export default function GuideWidget({ user }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([INITIAL_MESSAGE])
  const bodyRef = useRef(null)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight })
  }, [messages, open])

  if (!user) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
    const question = input.trim()
    if (!question || loading) return

    setMessages((current) => [
      ...current,
      { id: Date.now(), role: 'user', text: question, page: null },
    ])
    setInput('')
    setLoading(true)

    let reply
    try {
      const response = await fetch(`${AI_API_URL}/api/guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, role: user.role }),
      })
      if (!response.ok) throw new Error(`status ${response.status}`)
      const data = await response.json()
      reply = { text: data.answer, page: data.page }
    } catch {
      reply = { text: '안내 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.', page: null }
    }

    setMessages((current) => [
      ...current,
      { id: Date.now() + 1, role: 'assistant', ...reply },
    ])
    setLoading(false)
  }

  const goTo = (path) => {
    navigate(path)
    setOpen(false)
  }

  return (
    <div className="guide-widget">
      {open && (
        <section className="guide-panel" aria-label="페이지 안내 도우미">
          <header className="guide-header">
            <strong>MEALFIT 안내</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="닫기">×</button>
          </header>
          <div className="guide-body" ref={bodyRef}>
            {messages.map((message) => (
              <div key={message.id} className={`guide-message ${message.role}`}>
                <p>{message.text}</p>
                {message.page && message.page.path !== location.pathname && (
                  <button
                    type="button"
                    className="guide-link"
                    onClick={() => goTo(message.page.path)}
                  >
                    {message.page.name} 페이지로 이동
                  </button>
                )}
              </div>
            ))}
            {loading && <div className="guide-message assistant"><p>생각 중...</p></div>}
          </div>
          <form className="guide-form" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="예: 다음 주 식자재 가격이 오를까?"
              maxLength={200}
            />
            <button type="submit" disabled={loading || !input.trim()}>전송</button>
          </form>
        </section>
      )}
      <button
        type="button"
        className="guide-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-label="페이지 안내 열기"
      >
        {open ? '×' : '?'}
      </button>
    </div>
  )
}
