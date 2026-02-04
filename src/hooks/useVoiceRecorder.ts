'use client'

import { useState, useCallback, useRef } from 'react'

interface UseVoiceRecorderReturn {
    isRecording: boolean
    isProcessing: boolean
    transcript: string
    error: string | null
    startRecording: () => void
    stopRecording: () => Promise<string>
    cancelRecording: () => void
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
    const [isRecording, setIsRecording] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [error, setError] = useState<string | null>(null)

    const recognitionRef = useRef<any>(null)
    const finalTranscriptRef = useRef('')

    const startRecording = useCallback(() => {
        setError(null)
        setTranscript('')
        finalTranscriptRef.current = ''

        // Check for browser support
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

        if (!SpeechRecognition) {
            setError('Speech recognition not supported in this browser. Try Chrome.')
            return
        }

        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        // Use auto-detect by not setting a specific language, fallback to user's browser language
        // This helps with multilingual detection
        recognition.lang = navigator.language || 'en-US'

        recognition.onstart = () => {
            setIsRecording(true)
        }

        recognition.onresult = (event: any) => {
            let interimTranscript = ''
            let finalTranscript = ''

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' '
                } else {
                    interimTranscript += transcript
                }
            }

            if (finalTranscript) {
                finalTranscriptRef.current += finalTranscript
            }

            setTranscript(finalTranscriptRef.current + interimTranscript)
        }

        recognition.onerror = (event: any) => {
            // Ignore expected errors (no-speech, aborted when user cancels)
            if (event.error === 'no-speech' || event.error === 'aborted') {
                setIsRecording(false)
                return
            }
            console.error('Speech recognition error:', event.error)
            setError(`Error: ${event.error}`)
            setIsRecording(false)
        }

        recognition.onend = () => {
            setIsRecording(false)
        }

        recognitionRef.current = recognition
        recognition.start()
    }, [])

    const stopRecording = useCallback(async (): Promise<string> => {
        setIsProcessing(true)

        if (recognitionRef.current) {
            recognitionRef.current.stop()
        }

        // Wait a moment for final results
        await new Promise(resolve => setTimeout(resolve, 500))

        const finalText = finalTranscriptRef.current.trim() || transcript.trim()
        setIsProcessing(false)

        return finalText
    }, [transcript])

    const cancelRecording = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.abort()
        }
        setIsRecording(false)
        setTranscript('')
        finalTranscriptRef.current = ''
    }, [])

    return {
        isRecording,
        isProcessing,
        transcript,
        error,
        startRecording,
        stopRecording,
        cancelRecording
    }
}

// Text-to-Speech utility
export function speakText(text: string, lang: string = 'en-US'): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!('speechSynthesis' in window)) {
            reject(new Error('Text-to-speech not supported'))
            return
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(text)

        // Map language codes to speech synthesis language codes
        const langMap: Record<string, string> = {
            'en': 'en-US',
            'hi': 'hi-IN',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'ja': 'ja-JP',
            'zh': 'zh-CN',
            'ar': 'ar-SA',
            'ru': 'ru-RU',
            'pt': 'pt-BR',
            'it': 'it-IT'
        }

        utterance.lang = langMap[lang] || lang
        utterance.rate = 0.9
        utterance.pitch = 1

        utterance.onend = () => resolve()
        utterance.onerror = (event) => reject(event)

        window.speechSynthesis.speak(utterance)
    })
}

export default useVoiceRecorder
