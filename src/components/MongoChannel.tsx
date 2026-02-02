'use client'

import { useState, useEffect, useRef } from 'react'
import { Message } from './Message'
import { ChatInput } from './ChatInput'
import { Message as MessageType, Channel as ChannelType } from '@/types'
import { cn } from '@/lib/utils'
import { Hash, Users, Settings, Trash2 } from 'lucide-react'

interface ChannelProps {
  channel: ChannelType
  currentUserId: string
  className?: string
  isDirectMessage?: boolean
  onViewProfile?: (userId: string) => void
}

export function MongoChannel({ channel, currentUserId, className, onViewProfile }: ChannelProps) {
  const [messages, setMessages] = useState<MessageType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadMessages()

    // Start polling for new messages every 2 seconds
    pollIntervalRef.current = setInterval(() => {
      loadMessages(false) // Don't show loading state for polling
    }, 2000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [channel.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      setError(null)

      const response = await fetch(`/api/messages?channelId=${channel.id}&limit=50`)
      if (!response.ok) {
        throw new Error('Failed to load messages')
      }

      const data = await response.json()
      const newMessages = (data.messages || []).map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp) // Convert string to Date object
      }))

      // Proper message deduplication by comparing message IDs and content
      setMessages(prevMessages => {
        // Create a map of existing messages by ID
        const existingMessagesMap = new Map(prevMessages.map(msg => [msg.id, msg]))

        // Check if we have new messages or updates
        let hasChanges = false

        // Check if the number of messages changed
        if (newMessages.length !== prevMessages.length) {
          hasChanges = true
        } else {
          // Check if any message content or translations changed
          for (const newMsg of newMessages) {
            const existingMsg = existingMessagesMap.get(newMsg.id)
            if (!existingMsg ||
              existingMsg.content !== newMsg.content ||
              JSON.stringify(existingMsg.translations) !== JSON.stringify(newMsg.translations)) {
              hasChanges = true
              break
            }
          }
        }

        return hasChanges ? newMessages : prevMessages
      })
    } catch (err: any) {
      console.error('Error loading messages:', err)
      if (showLoading) {
        setError(err.message || 'Failed to load messages')
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  const handleSendMessage = async (content: string, attachment?: any) => {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId: channel.id,
          content,
          attachment
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()
      const newMessage = {
        ...data.message,
        timestamp: new Date(data.message.timestamp) // Convert string to Date object
      }

      // Add the new message to the list immediately for instant feedback
      setMessages(prev => {
        // Check if message already exists to avoid duplicates
        const messageExists = prev.some(msg => msg.id === newMessage.id)
        if (messageExists) {
          return prev
        }
        return [...prev, newMessage]
      })

      // Also trigger a refresh to get any translations that might have been added
      setTimeout(() => {
        loadMessages(false)
      }, 1000)
    } catch (err: any) {
      console.error('Error sending message:', err)
      setError(err.message || 'Failed to send message')
    }
  }

  const handleClearChat = async () => {
    try {
      setClearing(true)
      setError(null)

      const response = await fetch(`/api/messages?channelId=${channel.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to clear chat')
      }

      const data = await response.json()
      console.log(`Cleared ${data.deletedCount} messages`)

      // Clear messages from UI immediately
      setMessages([])
      setShowClearConfirm(false)

      // Refresh to confirm
      setTimeout(() => {
        loadMessages(false)
      }, 500)
    } catch (err: any) {
      console.error('Error clearing chat:', err)
      setError(err.message || 'Failed to clear chat')
    } finally {
      setClearing(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Channel Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <Hash className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">{channel.name}</h2>
          {channel.description && (
            <span className="text-sm text-gray-500">• {channel.description}</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md">
            <Users className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md">
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Clear all messages"
            disabled={clearing || messages.length === 0}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Clear Chat Confirmation Dialog */}
        {showClearConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Clear Chat</h3>
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete all messages in #{channel.name}?
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                This action cannot be undone. All messages and their translations will be permanently deleted.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  disabled={clearing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearChat}
                  disabled={clearing}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
                >
                  {clearing ? 'Clearing...' : 'Clear Chat'}
                </button>
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Hash className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to #{channel.name}
              </h3>
              <p className="text-gray-500">
                This is the beginning of the #{channel.name} channel.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <Message
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                onViewProfile={onViewProfile}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Chat Input */}
      <div className="border-t border-gray-200 bg-white">
        <ChatInput
          onSendMessage={handleSendMessage}
          placeholder={`Message #${channel.name}`}
          disabled={loading}
        />
      </div>
    </div>
  )
}