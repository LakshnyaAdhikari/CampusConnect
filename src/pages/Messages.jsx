
import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  MessageCircle,
  Search,
  Send,
  Sparkles
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Spinner,
  useToast
} from '../components/ui'

import {
  listenChats,
  listenMessages,
  sendMessage
} from '../features/messages/service'

import { useAuth } from '../context/AuthContext'
import { getPublicUser } from '../features/profile/service'

export default function Messages() {
  const { user } = useAuth()
  const { chatId } = useParams()

  const [chats, setChats] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const nav = useNavigate()
  const toast = useToast()
  const bottom = useRef(null)

  // Listen to user's conversations
  useEffect(() => {
    if (!user?.uid) return

    const unsubscribe = listenChats(user.uid, setChats)

    if (typeof unsubscribe !== 'function') {
      console.error(
        'listenChats did not return an unsubscribe function'
      )
      return
    }

    return () => {
      unsubscribe()
    }
  }, [user?.uid])

  // Listen to messages in selected conversation
  useEffect(() => {
    if (!chatId) {
      setMessages([])
      return
    }

    setError('')

    const unsubscribe = listenMessages(chatId, setMessages)

    if (typeof unsubscribe !== 'function') {
      console.error(
        'listenMessages did not return an unsubscribe function'
      )
      return
    }

    return () => {
      unsubscribe()
    }
  }, [chatId])

  // Automatically scroll to latest message
  useEffect(() => {
    bottom.current?.scrollIntoView({
      behavior: 'smooth'
    })
  }, [messages])

  // Send message
  const submit = async event => {
    event.preventDefault()

    const message = text.trim()

    if (!message || !chatId || sending) return

    try {
      setSending(true)

      await sendMessage(chatId, message)

      setText('')
    } catch (reason) {
      console.error('Message sending failed:', reason)

      toast(
        reason.message || 'Message could not be sent',
        'error'
      )
    } finally {
      setSending(false)
    }
  }

  const active = chats?.find(item => item.id === chatId)

  return (
    <div className="space-y-5">
      <PageHeader title="Messages">
        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary">
          Your conversations
        </span>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-[300px_minmax(0,1fr)]">

        {/* Inbox */}
        <Card
          className={`${chatId ? 'hidden md:block' : ''} min-h-[62vh] p-3`}
        >
          <div className="mb-3 px-2 pt-1">
            <h2 className="font-bold">Inbox</h2>

            <label className="relative mt-3 block">
              <Search
                size={16}
                className="absolute left-3 top-3 text-muted"
              />

              <Input
                className="bg-background pl-9"
                placeholder="Find a conversation"
              />
            </label>
          </div>

          {chats === null ? (
            <Spinner />
          ) : chats.length ? (
            chats.map(item => (
              <Chat
                key={item.id}
                chat={item}
                uid={user.uid}
                active={item.id === chatId}
                go={() => nav(`/messages/${item.id}`)}
              />
            ))
          ) : (
            <EmptyState title="Your inbox is ready">
              <p>
                Connect with someone from Discover and say hello.
              </p>

              <Button
                className="mt-4"
                onClick={() => nav('/discover')}
              >
                Find your people
              </Button>
            </EmptyState>
          )}
        </Card>

        {/* Conversation */}
        <Card
          className={`${chatId ? '' : 'hidden md:flex'} min-h-[62vh] flex-col overflow-hidden p-0`}
        >
          {chatId && active ? (
            <>
              {/* Conversation header */}
              <div className="flex items-center gap-3 border-b border-line p-4">
                <button
                  aria-label="Back to inbox"
                  className="rounded-xl p-2 text-muted hover:bg-primary-50 md:hidden"
                  onClick={() => nav('/messages')}
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary/35 font-bold text-primary">
                  <ChatAvatar
                    chat={active}
                    uid={user.uid}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <ChatHeader
                    chat={active}
                    uid={user.uid}
                  />

                  <p className="text-xs text-muted">
                    CampusConnect conversation
                  </p>
                </div>

                <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto bg-background/60 p-4 sm:p-6">
                {messages.map(item => (
                  <div
                    key={item.id}
                    className={`flex ${
                      item.senderUid === user.uid
                        ? 'justify-end'
                        : ''
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[72%] ${
                        item.senderUid === user.uid
                          ? 'message-mine rounded-br-md text-white'
                          : 'message-theirs rounded-bl-md text-ink'
                      }`}
                    >
                      {item.text}

                      <small
                        className={`mt-1 block text-[10px] ${
                          item.senderUid === user.uid
                            ? 'text-white/65'
                            : 'text-muted'
                        }`}
                      >
                        {new Date(item.createdAt).toLocaleTimeString(
                          [],
                          {
                            hour: 'numeric',
                            minute: '2-digit'
                          }
                        )}
                      </small>
                    </div>
                  </div>
                ))}

                <div ref={bottom} />
              </div>

              {error && (
                <p className="px-5 pt-2 text-sm text-rose">
                  {error}
                </p>
              )}

              {/* Message input */}
              <form
                className="flex gap-2 border-t border-line p-3 sm:p-4"
                onSubmit={submit}
              >
                <Input
                  value={text}
                  onChange={event => setText(event.target.value)}
                  placeholder="Write a message…"
                  aria-label="Write a message"
                />

                <Button
                  loading={sending}
                  className="inline-flex shrink-0 items-center gap-2"
                >
                  <Send size={16} />

                  <span className="hidden sm:inline">
                    Send
                  </span>
                </Button>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-6 text-center">
              <div className="max-w-sm">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-primary-50 text-primary">
                  <Sparkles size={27} />
                </span>

                <h2 className="mt-5 text-xl font-bold">
                  A good conversation starts here
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Choose a chat or explore people to find your next
                  study buddy, collaborator, or friend.
                </p>

                <Button
                  className="mt-5"
                  onClick={() => nav('/discover')}
                >
                  Explore people
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// Individual conversation in inbox
function Chat({ chat, uid, active, go }) {
  return (
    <button
      onClick={go}
      className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
        active
          ? 'bg-primary-50'
          : 'hover:bg-background'
      }`}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary/35 font-bold text-primary">
        <ChatAvatar chat={chat} uid={uid} />
      </span>

      <span className="min-w-0 flex-1">
        <ChatHeader chat={chat} uid={uid} />

        <small className="block truncate text-muted">
          {chat.lastMessage || 'Say hello and get chatting'}
        </small>
      </span>

      <small className="shrink-0 text-[10px] text-muted">
        {new Date(chat.updatedAt).toLocaleDateString(
          [],
          {
            month: 'short',
            day: 'numeric'
          }
        )}
      </small>
    </button>
  )
}

// Conversation participant avatar
function ChatAvatar({ chat, uid }) {
  const otherUid = chat?.participants?.find(id => id !== uid)
  const [name, setName] = useState('')

  useEffect(() => {
    let active = true

    setName('')

    if (!otherUid) return

    getPublicUser(otherUid)
      .then(person => {
        if (active) {
          setName(person?.name || 'C')
        }
      })
      .catch(error => {
        console.error(
          'Failed to load participant avatar:',
          otherUid,
          error
        )

        if (active) setName('C')
      })

    return () => {
      active = false
    }
  }, [otherUid])

  return name ? name[0].toUpperCase() : '?'
}

// Conversation participant name
function ChatHeader({ chat, uid }) {
  const [other, setOther] = useState(null)

  const otherUid = chat?.participants?.find(id => id !== uid)

  useEffect(() => {
    let active = true

    setOther(null)

    if (!otherUid) {
      setOther({ name: 'Unknown user' })
      return
    }

    getPublicUser(otherUid)
      .then(person => {
        if (!active) return

        if (person?.name) {
          setOther(person)
        } else {
          setOther({ name: 'Campus connection' })
        }
      })
      .catch(error => {
        console.error(
          'Failed to load chat participant:',
          otherUid,
          error
        )

        if (active) {
          setOther({ name: 'Campus connection' })
        }
      })

    return () => {
      active = false
    }
  }, [otherUid])

  return (
    <b className="block truncate text-sm">
      {other?.name || 'Loading chat…'}
    </b>
  )
}
