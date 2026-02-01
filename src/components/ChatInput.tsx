'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSendMessage: (content: string) => Promise<void>
  placeholder?: string
  disabled?: boolean
  className?: string
  maxLength?: number
}

export function ChatInput({
  onSendMessage,
  placeholder = "Type a message...",
  disabled = false,
  className,
  maxLength = 4000
}: ChatInputProps) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [content])

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await sendMessage()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const sendMessage = async () => {
    const trimmedContent = content.trim()

    if (!trimmedContent || isSending || disabled) {
      return
    }

    setIsSending(true)

    try {
      await onSendMessage(trimmedContent)
      // Clear input and refocus after successful send
      setContent('')
      textareaRef.current?.focus()
    } catch (error) {
      console.error('Failed to send message:', error)
      // Keep the content in case user wants to retry
    } finally {
      setIsSending(false)
    }
  }

  const isContentValid = content.trim().length > 0 && content.length <= maxLength
  const canSend = isContentValid && !isSending && !disabled

  return (
    <div className={cn("border-t bg-white p-4", className)}>
      <form onSubmit={handleSubmit} className="flex gap-3 items-end">
        {/* Message Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            maxLength={maxLength}
            rows={1}
            className={cn(
              "w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white",
              "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
              "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
              "placeholder:text-gray-400"
            )}
            style={{
              minHeight: '40px',
              maxHeight: '120px'
            }}
          />

          {/* Character Count */}
          {content.length > maxLength * 0.8 && (
            <div className={cn(
              "absolute -top-6 right-0 text-xs",
              content.length > maxLength ? "text-red-500" : "text-gray-400"
            )}>
              {content.length}/{maxLength}
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!canSend}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
            canSend
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
          title={canSend ? "Send message (Enter)" : "Enter a message to send"}
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>

      {/* Markdown Help */}
      <div className="mt-2 text-xs text-gray-500">
        <span>
          Supports basic formatting: **bold**, *italic*, `code`, ```code blocks```
        </span>
        <span className="ml-2">
          Press Enter to send, Shift+Enter for new line
        </span>
      </div>
    </div>
  )
}

// Preview component for showing optimistic updates
export function MessagePreview({
  content,
  userId,
  timestamp = new Date()
}: {
  content: string
  userId: string
  timestamp?: Date
}) {
  return (
    <div className="flex gap-3 px-4 py-2 bg-blue-50 border-l-2 border-blue-200">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-medium">
            {userId.slice(0, 2).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900 text-sm">You</span>
          <span className="text-xs text-gray-500">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-xs text-blue-500 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Sending...
          </span>
        </div>
        <div className="text-sm text-gray-800 leading-relaxed">
          {content}
        </div>
      </div>
    </div>
  )
}