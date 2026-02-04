'use client'

import React, { useState, useEffect } from 'react'
import { Globe, User, Clock, Loader2, Volume2 } from 'lucide-react'
import { Message as MessageType } from '@/types'
import { formatTimestamp, cn } from '@/lib/utils'
import { useMongoAuth } from '@/contexts/MongoAuthContext'
import { EmojiReactions, ReactionBadges } from './EmojiReactions'
import { VoicePlayButton } from './VoiceMessage'

interface MessageProps {
  message: MessageType
  currentUserId?: string
  showTranslation?: boolean
  className?: string
  onViewProfile?: (userId: string) => void
  onEmojiReaction?: (emoji: string, messageId: string, event: React.MouseEvent) => void
  onReactionBadgeClick?: (emoji: string, messageId: string) => void
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
  className,
  onViewProfile,
  onEmojiReaction,
  onReactionBadgeClick
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
    <div
      id={`message-${message.id}`}
      className={cn(
        "group flex gap-3 px-4 py-2 hover:bg-gray-50 transition-colors relative",
        // Enhanced light background colors for sent vs received messages
        isOwnMessage
          ? "bg-blue-50/40 hover:bg-blue-50/60 border-l-2 border-blue-200" // Light blue for sent messages with left border
          : "bg-green-50/40 hover:bg-green-50/60 border-l-2 border-green-200", // Light green for received messages with left border
        className
      )}>
      <div className="flex-shrink-0">
        <div
          onClick={() => onViewProfile?.(message.senderId)}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity",
            isOwnMessage ? "bg-blue-500" : "bg-green-500"
          )}>
          {message.senderAvatar ? (
            <img src={message.senderAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-white" />
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            onClick={() => onViewProfile?.(message.senderId)}
            className="font-medium text-gray-900 text-sm cursor-pointer hover:underline"
          >
            {message.senderName || getUserDisplayName(message.senderId)}
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
          {/* Attachment */}
          {message.attachment && (
            <div className="mb-2">
              {message.attachment.type === 'image' ? (
                <img
                  src={message.attachment.url}
                  alt="Attachment"
                  className="max-w-full sm:max-w-sm rounded-lg border border-gray-200 cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => window.open(message.attachment?.url, '_blank')}
                />
              ) : (
                <a
                  href={message.attachment.url}
                  download={message.attachment.name}
                  className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group max-w-sm"
                >
                  <div className="bg-white p-2 rounded border border-gray-200">
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {message.attachment.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(message.attachment.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              )}
            </div>
          )}

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
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 bg-green-50 text-green-600 px-1.5 py-0.5 rounded">
                    Translated to {getLanguageDisplayName(userTranslation.targetLanguage)}
                  </span>
                  {/* Listen to translation */}
                  <VoicePlayButton
                    text={userTranslation.translatedContent}
                    language={userTranslation.targetLanguage}
                  />
                </div>
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

          {/* Persistent Reaction Badges (Telegram-style) */}
          <ReactionBadges
            reactions={message.reactions || []}
            currentUserId={currentUserId}
            onReactionClick={(emoji) => onReactionBadgeClick?.(emoji, message.id)}
          />
        </div>
      </div>

      {/* Emoji Reactions - appears on hover at top-right */}
      {onEmojiReaction && (
        <div className="absolute top-1 right-2">
          <EmojiReactions
            messageId={message.id}
            onEmojiSelect={onEmojiReaction}
          />
        </div>
      )}
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
      const code = match[2].trimEnd() // Remove trailing whitespace but preserve indentation
      const lines = code.split('\n')

      parts.push(
        <div key={parts.length} className="my-3 group/codeblock">
          <div className="bg-gray-900 rounded-lg overflow-hidden shadow-lg border border-gray-700">
            {/* Header with language and copy button */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{language}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(code)
                }}
                className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors opacity-0 group-hover/codeblock:opacity-100"
                title="Copy code"
              >
                Copy
              </button>
            </div>
            {/* Code content with line numbers */}
            <div className="overflow-x-auto">
              <pre className="p-4 text-sm leading-relaxed">
                <code className="text-gray-100 font-mono">
                  {lines.map((line, lineIndex) => (
                    <div key={lineIndex} className="flex">
                      <span className="select-none text-gray-600 text-right pr-4 min-w-[2.5rem] border-r border-gray-700 mr-4">
                        {lineIndex + 1}
                      </span>
                      <span className="whitespace-pre">{line}</span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
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
    // Combined regex to match bold (**text**), italic (*text*), and inline code (`code`)
    // Order matters: check bold before italic since ** contains *
    const formatRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
    const parts = text.split(formatRegex)

    return (
      <span key={key}>
        {parts.map((part, index) => {
          if (!part) return null

          // Check for inline code first (backticks)
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

          // Check for bold (**text**)
          if (part.startsWith('**') && part.endsWith('**')) {
            const boldText = part.slice(2, -2)
            return (
              <strong key={index} className="font-bold">
                {boldText}
              </strong>
            )
          }

          // Check for italic (*text*)
          if (part.startsWith('*') && part.endsWith('*')) {
            const italicText = part.slice(1, -1)
            return (
              <em key={index} className="italic">
                {italicText}
              </em>
            )
          }

          // Regular text
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