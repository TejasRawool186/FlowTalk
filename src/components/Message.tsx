'use client'

import React, { useState, useEffect } from 'react'
import { Globe, User, Clock, Loader2 } from 'lucide-react'
import { Message as MessageType } from '@/types'
import { formatTimestamp, cn } from '@/lib/utils'
import { useMongoAuth } from '@/contexts/MongoAuthContext'

interface MessageProps {
  message: MessageType
  currentUserId?: string
  showTranslation?: boolean
  className?: string
}

interface MessageToggleState {
  [messageId: string]: boolean
}

// Global state for toggle states to maintain independence across messages
const messageToggleStates: MessageToggleState = {}

export function Message({
  message,
  currentUserId,
  showTranslation = true,
  className
}: MessageProps) {
  const { user } = useMongoAuth()
  const [showOriginal, setShowOriginal] = useState(() => {
    return messageToggleStates[message.id] ?? false
  })

  const isOwnMessage = currentUserId === message.senderId
  const hasTranslations = message.translations && message.translations.length > 0
  const isTranslating = message.status === 'translating'
  const isTranslated = message.status === 'translated'
  const hasFailed = message.status === 'failed'

  // Get the appropriate translation for the current user
  const userLanguage = user?.primaryLanguage || 'en'
  const userTranslation = hasTranslations
    ? message.translations?.find(t => t.targetLanguage === userLanguage)
    : null

  // Determine what content to show
  const shouldShowTranslation = showTranslation && !showOriginal && userTranslation && !isOwnMessage
  const displayContent = shouldShowTranslation ? userTranslation.translatedContent : message.content

  // Show translation indicator if message has translations
  const showTranslationControls = !isOwnMessage && (hasTranslations || message.sourceLanguage !== userLanguage)

  // Handle toggle state changes
  const handleToggle = () => {
    const newState = !showOriginal
    setShowOriginal(newState)
    messageToggleStates[message.id] = newState
  }

  useEffect(() => {
    return () => {
      if (showOriginal) {
        delete messageToggleStates[message.id]
      }
    }
  }, [message.id, showOriginal])

  return (
    <div className={cn(
      "group flex gap-3 px-4 py-2 hover:bg-gray-50 transition-colors",
      // Enhanced light background colors for sent vs received messages
      isOwnMessage
        ? "bg-blue-50/40 hover:bg-blue-50/60 border-l-2 border-blue-200" // Light blue for sent messages with left border
        : "bg-green-50/40 hover:bg-green-50/60 border-l-2 border-green-200", // Light green for received messages with left border
      className
    )}>
      <div className="flex-shrink-0">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          isOwnMessage ? "bg-blue-500" : "bg-green-500"
        )}>
          <User className="w-4 h-4 text-white" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900 text-sm">
            {getUserDisplayName(message.senderId)}
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTimestamp(message.timestamp)}
          </span>
          {message.sourceLanguage && (
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {getLanguageDisplayName(message.sourceLanguage)}
            </span>
          )}
        </div>

        <div className="relative">
          <div className="text-sm text-gray-800 leading-relaxed">
            <MessageContent content={displayContent} />
          </div>

          {isTranslating && (
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="animate-pulse">✨ Translating...</span>
            </div>
          )}

          {showTranslationControls && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleToggle}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
                  "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                  showOriginal
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-500 hover:text-gray-700"
                )}
                title={showOriginal ? "Show translation" : "Show original"}
              >
                <Globe className="w-3 h-3" />
                <span>
                  {showOriginal ? "Show translation" : "Show original"}
                </span>
              </button>

              {shouldShowTranslation && userTranslation && (
                <span className="text-xs text-gray-400 bg-green-50 text-green-600 px-1.5 py-0.5 rounded">
                  Translated to {getLanguageDisplayName(userTranslation.targetLanguage)}
                </span>
              )}

              {hasTranslations && (
                <span className="text-xs text-gray-400 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                  Translation available
                </span>
              )}
            </div>
          )}

          {hasFailed && (
            <div className="flex items-center gap-2 mt-2 text-xs text-red-500">
              <span>⚠️ Translation failed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MessageContent({ content }: { content: string }) {
  const renderContent = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    let parts: React.ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index)
        parts.push(renderInlineFormatting(beforeText, parts.length))
      }

      const language = match[1] || 'text'
      const code = match[2]
      parts.push(
        <div key={parts.length} className="my-2">
          <div className="bg-gray-100 rounded-md p-3 text-sm font-mono overflow-x-auto">
            <div className="text-xs text-gray-500 mb-1">{language}</div>
            <pre className="whitespace-pre-wrap">{code}</pre>
          </div>
        </div>
      )

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex)
      parts.push(renderInlineFormatting(remainingText, parts.length))
    }

    return parts.length > 0 ? parts : renderInlineFormatting(text, 0)
  }

  const renderInlineFormatting = (text: string, key: number) => {
    const parts = text.split(/(`[^`]+`)/g)

    return (
      <span key={key}>
        {parts.map((part, index) => {
          if (part.startsWith('`') && part.endsWith('`')) {
            const code = part.slice(1, -1)
            return (
              <code
                key={index}
                className="bg-gray-100 text-red-600 px-1 py-0.5 rounded text-xs font-mono"
              >
                {code}
              </code>
            )
          }
          return <span key={index}>{part}</span>
        })}
      </span>
    )
  }

  return <div>{renderContent(content)}</div>
}

function getCurrentUserLanguage(): string {
  // This will be replaced by the useAuth hook in the component
  return 'en'
}

function getUserDisplayName(userId: string): string {
  // In a real app, you'd fetch this from a user service
  return `User ${userId.slice(0, 8)}...`
}

function getLanguageDisplayName(languageCode: string | undefined | null, isRomanized?: boolean): string {
  // Handle null, undefined, or non-string values
  if (!languageCode || typeof languageCode !== 'string') {
    return 'Unknown'
  }

  // Check if language code indicates romanized (e.g., 'hi-rom')
  const isRomanizedCode = languageCode.endsWith('-rom')
  const baseCode = isRomanizedCode ? languageCode.replace('-rom', '') : languageCode
  const shouldShowRomanized = isRomanized || isRomanizedCode

  const languageNames: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'ta': 'Tamil',
    'bn': 'Bengali',
    'te': 'Telugu',
    'mr': 'Marathi'
  }

  const baseName = languageNames[baseCode] || baseCode.toUpperCase()
  return shouldShowRomanized ? `${baseName} (Romanized)` : baseName
}

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
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-medium">
            {userId.slice(0, 2).toUpperCase()}
          </span>
        </div>
      </div>

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