'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface EmojiReactionsProps {
    messageId: string
    onEmojiSelect: (emoji: string, messageId: string, event: React.MouseEvent) => void
    className?: string
}

// Quick access emojis for reactions
const REACTION_EMOJIS = ['🎉', '👍', '❤️', '😂', '🔥', '👏', '😮', '🚀']

export function EmojiReactions({ messageId, onEmojiSelect, className }: EmojiReactionsProps) {
    return (
        <div
            className={cn(
                "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                className
            )}
        >
            {REACTION_EMOJIS.map((emoji) => (
                <button
                    key={emoji}
                    onClick={(e) => onEmojiSelect(emoji, messageId, e)}
                    className={cn(
                        "w-7 h-7 flex items-center justify-center rounded-full",
                        "text-base hover:scale-125 active:scale-100",
                        "transition-all duration-150 ease-out",
                        "hover:bg-gray-100",
                        "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
                    )}
                    title={`React with ${emoji}`}
                >
                    {emoji}
                </button>
            ))}
        </div>
    )
}

// Reaction type for persistent reactions
interface Reaction {
    emoji: string
    userId: string
    userName?: string
    createdAt?: Date
}

// Group reactions by emoji for display
interface ReactionGroup {
    emoji: string
    count: number
    users: string[]
    hasCurrentUser: boolean
}

interface ReactionBadgesProps {
    reactions: Reaction[]
    currentUserId?: string
    onReactionClick?: (emoji: string) => void
    className?: string
}

// Component to display persistent reaction badges (Telegram-style)
export function ReactionBadges({
    reactions = [],
    currentUserId,
    onReactionClick,
    className
}: ReactionBadgesProps) {
    if (!reactions || reactions.length === 0) return null

    // Group reactions by emoji
    const groupedReactions: ReactionGroup[] = REACTION_EMOJIS
        .map(emoji => {
            const emojiReactions = reactions.filter(r => r.emoji === emoji)
            if (emojiReactions.length === 0) return null

            return {
                emoji,
                count: emojiReactions.length,
                users: emojiReactions.map(r => r.userName || 'User'),
                hasCurrentUser: emojiReactions.some(r => r.userId === currentUserId)
            }
        })
        .filter((g): g is ReactionGroup => g !== null)

    if (groupedReactions.length === 0) return null

    return (
        <div className={cn("flex items-center gap-1 mt-2 flex-wrap", className)}>
            {groupedReactions.map((group) => (
                <button
                    key={group.emoji}
                    onClick={() => onReactionClick?.(group.emoji)}
                    className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                        "transition-all duration-150 ease-out",
                        "hover:scale-105 active:scale-95",
                        group.hasCurrentUser
                            ? "bg-blue-100 text-blue-700 border border-blue-300"
                            : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                    )}
                    title={group.users.join(', ')}
                >
                    <span className="text-sm">{group.emoji}</span>
                    <span className="font-medium">{group.count}</span>
                </button>
            ))}
        </div>
    )
}

// Floating emoji picker that can appear anywhere
interface FloatingEmojiPickerProps {
    isOpen: boolean
    onClose: () => void
    onEmojiSelect: (emoji: string) => void
    position: { x: number; y: number }
}

export function FloatingEmojiPicker({
    isOpen,
    onClose,
    onEmojiSelect,
    position
}: FloatingEmojiPickerProps) {
    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40"
                onClick={onClose}
            />

            {/* Picker */}
            <div
                className={cn(
                    "fixed z-50 bg-white rounded-xl shadow-lg border border-gray-200",
                    "p-2 flex flex-wrap gap-1 max-w-[200px]",
                    "animate-in fade-in zoom-in-95 duration-150"
                )}
                style={{
                    left: position.x,
                    top: position.y,
                    transform: 'translate(-50%, -100%) translateY(-8px)'
                }}
            >
                {REACTION_EMOJIS.map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => {
                            onEmojiSelect(emoji)
                            onClose()
                        }}
                        className={cn(
                            "w-9 h-9 flex items-center justify-center rounded-lg",
                            "text-xl hover:scale-110 active:scale-95",
                            "transition-all duration-150 ease-out",
                            "hover:bg-gray-100"
                        )}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </>
    )
}

export default EmojiReactions
