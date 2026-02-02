'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Paperclip, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSendMessage: (content: string, attachment?: any) => Promise<void>
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
  const [attachment, setAttachment] = useState<{
    file: File,
    preview: string,
    type: 'image' | 'file'
  } | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 2MB limit
    if (file.size > 2 * 1024 * 1024) {
      alert('File too large (max 2MB)')
      return
    }

    const type = file.type.startsWith('image/') ? 'image' : 'file'
    const reader = new FileReader()

    reader.onloadend = () => {
      setAttachment({
        file,
        preview: reader.result as string,
        type
      })
    }

    if (type === 'image') {
      reader.readAsDataURL(file)
    } else {
      // For non-images, we just need the file info, but we'll read as data URL 
      // anyway to send to backend easily in this hackathon setup
      reader.readAsDataURL(file)
    }

    // Reset input so same file can be selected again
    e.target.value = ''
    textareaRef.current?.focus()
  }

  const removeAttachment = () => {
    setAttachment(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const sendMessage = async () => {
    const trimmedContent = content.trim()

    if ((!trimmedContent && !attachment) || isSending || disabled) {
      return
    }

    setIsSending(true)

    try {
      const attachmentData = attachment ? {
        type: attachment.type,
        url: attachment.preview, // The base64 string
        name: attachment.file.name,
        mimeType: attachment.file.type,
        size: attachment.file.size
      } : undefined

      await onSendMessage(trimmedContent, attachmentData)

      // Clear input and refocus after successful send
      setContent('')
      setAttachment(null)
      textareaRef.current?.focus()
    } catch (error) {
      console.error('Failed to send message:', error)
      // Keep the content in case user wants to retry
    } finally {
      setIsSending(false)
    }
  }

  const isContentValid = (content.trim().length > 0 || attachment !== null) && content.length <= maxLength
  const canSend = isContentValid && !isSending && !disabled

  return (
    <div className={cn("border-t bg-white p-4", className)}>
      {/* File Preview */}
      {attachment && (
        <div className="mb-3 flex items-start">
          <div className="relative group">
            {attachment.type === 'image' ? (
              <img
                src={attachment.preview}
                alt="Preview"
                className="h-20 w-auto rounded-lg border border-gray-200 object-cover"
              />
            ) : (
              <div className="h-16 w-48 bg-gray-100 rounded-lg border border-gray-200 flex items-center p-3 gap-2">
                <div className="bg-white p-2 rounded border border-gray-200">
                  <Paperclip className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{attachment.file.name}</p>
                  <p className="text-[10px] text-gray-500">{(attachment.file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            )}
            <button
              onClick={removeAttachment}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-3 items-end">
        {/* File Input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelect}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors mb-1"
          title="Attach file"
          disabled={disabled || isSending}
        >
          <Paperclip className="w-5 h-5" />
        </button>

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