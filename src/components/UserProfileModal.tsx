import React, { useEffect, useState } from 'react'
import { X, MessageSquare, Copy, Check, User } from 'lucide-react'
import { UserProfile } from '@/types'
import { useRouter } from 'next/navigation'

interface UserProfileModalProps {
    userId: string | null
    isOpen: boolean
    onClose: () => void
    currentUserId: string
    onMessageUser?: (username: string) => Promise<void>
}

export function UserProfileModal({ userId, isOpen, onClose, currentUserId, onMessageUser }: UserProfileModalProps) {
    const [user, setUser] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [copied, setCopied] = useState(false)
    const [isStartingDM, setIsStartingDM] = useState(false)
    const router = useRouter()

    useEffect(() => {
        if (isOpen && userId) {
            fetchUserProfile(userId)
        } else {
            setUser(null)
        }
    }, [isOpen, userId])

    const fetchUserProfile = async (id: string) => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch(`/api/users/${id}`)
            if (!res.ok) throw new Error('Failed to fetch user profile')
            const data = await res.json()
            setUser(data.user)
        } catch (err) {
            setError('Could not load user profile')
        } finally {
            setLoading(false)
        }
    }

    const handleCopyId = () => {
        if (user?.id) {
            navigator.clipboard.writeText(user.id)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleMessage = async () => {
        if (!user || !user.username) return

        setIsStartingDM(true)
        try {
            if (onMessageUser) {
                await onMessageUser(user.id)
                onClose()
            }
        } catch (err) {
            console.error("Failed to start DM", err)
        } finally {
            setIsStartingDM(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">User Profile</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-500 py-4">{error}</div>
                    ) : user ? (
                        <div className="text-center">
                            {/* Avatar */}
                            <div className="mx-auto w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden mb-4 relative">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                        <span className="text-3xl font-bold text-blue-600">{user.username.charAt(0).toUpperCase()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Name & Status */}
                            <h2 className="text-xl font-bold text-gray-900 mb-1">{user.username}</h2>
                            {user.status && <p className="text-gray-500 text-sm mb-4">"{user.status}"</p>}

                            {/* User ID */}
                            <div className="bg-gray-50 rounded-md p-3 mb-6 flex items-center justify-between border border-gray-100">
                                <div className="text-left overflow-hidden">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-0.5">User ID</p>
                                    <p className="text-xs font-mono text-gray-600 truncate max-w-[180px]" title={user.id}>{user.id}</p>
                                </div>
                                <button
                                    onClick={handleCopyId}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-white rounded-md transition-all shadow-sm border border-transparent hover:border-gray-200"
                                    title="Copy ID"
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Action Buttons */}
                            {currentUserId !== user.id && (
                                <button
                                    onClick={handleMessage}
                                    disabled={isStartingDM}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    {isStartingDM ? 'Starting Chat...' : 'Message'}
                                </button>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
