import { useState } from 'react'
import { Link } from 'react-router-dom'
import './MenuChatPage.css'

const TOKEN_KEY = 'mealfit_access_token'

const AI_API_URL = (
  import.meta.env.VITE_AI_API_URL ||
  'http://127.0.0.1:8000'
).replace(/\/$/, '')

const exampleQuestions = [
  '돼지고기가 들어간 메뉴 추천해줘',
  '국 종류 메뉴를 추천해줘',
  '양파를 활용한 메뉴를 알려줘',
  '3000원 이하 돼지고기 주찬 추천해줘',
]

export default function MenuChatPage() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      text: '안녕하세요! MEALFIT AI입니다. 원하는 메뉴 조건을 입력해 주세요.',
      menus: [],
    },
  ])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const question = input.trim()

    if (!question || loading) return

    const userMessage = {
      id: Date.now(),
      role: 'user',
      text: question,
      menus: [],
    }

    setMessages((current) => [
      ...current,
      userMessage,
    ])

    setInput('')
    setLoading(true)

    try {
      const token = localStorage.getItem(TOKEN_KEY)

      const headers = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(
        `${AI_API_URL}/api/menus/search`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: question,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null)

        throw new Error(
          errorData?.detail ||
          `AI 검색 요청 실패: ${response.status}`
        )
      }

      const data = await response.json()

      if (!Array.isArray(data.menus)) {
        throw new Error(
          'AI 검색 응답 형식이 올바르지 않습니다.'
        )
      }

      const validMenus = data.menus.filter((menu) => {
        if (
          menu.cost_per_person === null ||
          menu.cost_per_person === undefined
        ) {
          return true
        }

        const cost = Number(menu.cost_per_person)

        return (
          !Number.isNaN(cost) &&
          cost > 0
        )
      })

      const topMenus = validMenus.slice(0, 3)

      const answer =
        topMenus.length === 0
          ? '조건에 맞는 메뉴를 찾지 못했습니다.'
          : '조건에 맞는 메뉴를 찾았어요.'

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: answer,
          menus: topMenus,
        },
      ])
    } catch (error) {
      console.error(error)

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text:
            error.message ||
            '메뉴 검색 중 오류가 발생했습니다.',
          menus: [],
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleExampleClick = (question) => {
    setInput(question)
  }

  return (
    <div className="menu-chat-page">
      <div className="menu-chat-container">

        <header className="menu-chat-header">
          <div>
            <Link
              to="/menus"
              className="menu-chat-back"
            >
              ← 메뉴 목록
            </Link>

            <div className="menu-chat-title-row">
              <div className="menu-chat-logo">
                ✦
              </div>

              <div>
                <p className="menu-chat-label">
                  MEALFIT AI
                </p>

                <h1>
                  AI 메뉴 추천
                </h1>

                <p className="menu-chat-description">
                  원하는 조건을 입력하면 메뉴 데이터를 기반으로 찾아드려요.
                </p>
              </div>
            </div>
          </div>

          <div className="menu-chat-status">
            <span />
            AI Assistant
          </div>
        </header>

        <main className="menu-chat-box">

          <div className="menu-chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`menu-chat-message ${
                  message.role === 'user'
                    ? 'menu-chat-message-user'
                    : 'menu-chat-message-ai'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="menu-chat-avatar">
                    ✦
                  </div>
                )}

                <div className="menu-chat-bubble">
                  <div className="menu-chat-message-text">
                    {message.text}
                  </div>

                  {message.menus?.length > 0 && (
                    <div className="menu-chat-menu-list">
                      {message.menus.map((menu, index) => {
                        const category = [
                          menu.main_category,
                          menu.sub_category,
                        ]
                          .filter(Boolean)
                          .join(' / ')

                        const cost =
                          menu.cost_per_person !== null &&
                          menu.cost_per_person !== undefined
                            ? `${Number(
                                menu.cost_per_person
                              ).toLocaleString()}원`
                            : '가격 정보 없음'

                        return (
                          <div
                            key={menu.menu_id}
                            className="menu-chat-menu-item"
                          >
                            <div className="menu-chat-menu-title">
                              {index + 1}. {menu.name}
                            </div>

                            <div className="menu-chat-menu-info">
                              분류 · {category || '분류 정보 없음'}
                            </div>

                            <div className="menu-chat-menu-info">
                              1인 원가 · {cost}
                            </div>

                            <Link
                              to={`/menus?menuId=${menu.menu_id}`}
                              className="menu-chat-menu-button"
                            >
                              메뉴에서 보기
                              <span>›</span>
                            </Link>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="menu-chat-message menu-chat-message-ai">
                <div className="menu-chat-avatar">
                  ✦
                </div>

                <div className="menu-chat-bubble">
                  메뉴를 찾고 있습니다...
                </div>
              </div>
            )}
          </div>

          {messages.length === 1 && (
            <div className="menu-chat-examples">
              <p>
                이렇게 물어보세요
              </p>

              <div className="menu-chat-example-list">
                {exampleQuestions.map(
                  (question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() =>
                        handleExampleClick(question)
                      }
                    >
                      {question}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          <form
            className="menu-chat-input-area"
            onSubmit={handleSubmit}
          >
            <div className="menu-chat-input-wrap">
              <textarea
                rows={1}
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                placeholder="예: 3000원 이하 돼지고기 주찬 추천해줘"
                disabled={loading}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey
                  ) {
                    event.preventDefault()

                    event.currentTarget.form
                      ?.requestSubmit()
                  }
                }}
              />

              <button
                type="submit"
                disabled={
                  !input.trim() ||
                  loading
                }
                className="menu-chat-send"
              >
                ↑
              </button>
            </div>

            <p className="menu-chat-help">
              Enter로 전송 · Shift + Enter로 줄바꿈
            </p>
          </form>

        </main>
      </div>
    </div>
  )
}