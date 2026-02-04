'use client'

import React, { useState } from 'react'
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react'
import { useVoiceRecorder, speakText } from '@/hooks/useVoiceRecorder'
import { cn } from '@/lib/utils'

interface VoiceMessageButtonProps {
    onVoiceMessage: (text: string) => void
    disabled?: boolean
    className?: string
}

export function VoiceMessageButton({ onVoiceMessage, disabled, className }: VoiceMessageButtonProps) {
    const { isRecording, isProcessing, transcript, error, startRecording, stopRecording, cancelRecording } = useVoiceRecorder()
    const [showTranscript, setShowTranscript] = useState(false)

    const handleToggleRecording = async () => {
        if (isRecording) {
            const text = await stopRecording()
            if (text.trim()) {
                onVoiceMessage(text)
                setShowTranscript(false)
            }
        } else {
            setShowTranscript(true)
            startRecording()
        }
    }

    const handleCancel = () => {
        cancelRecording()
        setShowTranscript(false)
    }

    return (
        <div className={cn("relative", className)}>
            {/* Transcript popup */}
            {showTranscript && (isRecording || transcript) && (
                <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                        <div className={cn(
                            "w-3 h-3 rounded-full animate-pulse",
                            isRecording ? "bg-red-500" : "bg-gray-400"
                        )} />
                        <span className="text-sm font-medium text-gray-700">
                            {isRecording ? 'Listening...' : 'Processing...'}
                        </span>
                    </div>

                    <p className="text-sm text-gray-600 min-h-[40px]">
                        {transcript || (isRecording ? 'Start speaking...' : '')}
                    </p>

                    {error && (
                        <p className="text-xs text-red-500 mt-1">{error}</p>
                    )}

                    <div className="flex justify-end gap-2 mt-2">
                        <button
                            onClick={handleCancel}
                            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Mic button */}
            <button
                onClick={handleToggleRecording}
                disabled={disabled || isProcessing}
                className={cn(
                    "p-2 rounded-full transition-all duration-200",
                    isRecording
                        ? "bg-red-500 text-white animate-pulse hover:bg-red-600"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                title={isRecording ? "Stop recording" : "Record voice message"}
            >
                {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : isRecording ? (
                    <MicOff className="w-5 h-5" />
                ) : (
                    <Mic className="w-5 h-5" />
                )}
            </button>
        </div>
    )
}

// Component to play translated voice
interface VoicePlayButtonProps {
    text: string
    language: string
    className?: string
}

export function VoicePlayButton({ text, language, className }: VoicePlayButtonProps) {
    const [isPlaying, setIsPlaying] = useState(false)

    const handlePlay = async () => {
        if (isPlaying) {
            window.speechSynthesis.cancel()
            setIsPlaying(false)
            return
        }

        setIsPlaying(true)
        try {
            await speakText(text, language)
        } catch (error) {
            console.error('Failed to speak:', error)
        } finally {
            setIsPlaying(false)
        }
    }

    return (
        <button
            onClick={handlePlay}
            className={cn(
                "p-1.5 rounded-full transition-all duration-200",
                isPlaying
                    ? "bg-blue-500 text-white"
                    : "text-gray-400 hover:text-blue-500 hover:bg-blue-50",
                className
            )}
            title={isPlaying ? "Stop" : "Listen to translation"}
        >
            <Volume2 className={cn("w-4 h-4", isPlaying && "animate-pulse")} />
        </button>
    )
}

export default VoiceMessageButton
