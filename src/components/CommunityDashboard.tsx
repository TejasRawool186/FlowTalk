'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Search, Users, X, Loader2, ArrowLeft } from 'lucide-react'

interface Community {
    id: string
    name: string
    description?: string
    memberCount?: number
    isMember?: boolean
}

interface CommunityDashboardProps {
    onCommunityJoined: () => void
    onBack?: () => void
}

export function CommunityDashboard({ onCommunityJoined, onBack }: CommunityDashboardProps) {
    const [view, setView] = useState<'main' | 'create' | 'discover'>('main')
    const [communityName, setCommunityName] = useState('')
    const [communities, setCommunities] = useState<Community[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (view === 'discover') {
            loadCommunities()
        }
    }, [view])

    const loadCommunities = async () => {
        setLoading(true)
        setError('')
        try {
            const response = await fetch('/api/communities/discover')
            if (!response.ok) throw new Error('Failed to load communities')
            const data = await response.json()
            setCommunities(data.communities || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateCommunity = async () => {
        if (!communityName.trim()) return

        setLoading(true)
        setError('')
        try {
            const response = await fetch('/api/communities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: communityName.trim() })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to create community')
            }

            onCommunityJoined()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleJoinCommunity = async (communityId: string) => {
        setLoading(true)
        setError('')
        try {
            const response = await fetch(`/api/communities/${communityId}/join`, {
                method: 'POST'
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to join community')
            }

            onCommunityJoined()
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    // Main dashboard view
    if (view === 'main') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50">
                {/* Back button */}
                {onBack && (
                    <button
                        onClick={onBack}
                        className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back
                    </button>
                )}

                <div className="text-center p-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to FlowTalk</h1>
                    <p className="text-gray-600 mb-8 max-w-md">
                        Break language barriers with real-time translation. Create or join a community to start chatting.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => setView('create')}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg"
                        >
                            <Plus className="w-5 h-5" />
                            Create Community
                        </button>

                        <button
                            onClick={() => setView('discover')}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium transition-colors shadow-md"
                        >
                            <Search className="w-5 h-5" />
                            Discover Communities
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Create community view
    if (view === 'create') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50">
                <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setView('main')}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-2xl font-bold text-gray-900">Create Community</h2>
                        </div>
                        <button
                            onClick={() => setView('main')}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4">
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-medium mb-2">Community Name</label>
                        <input
                            type="text"
                            value={communityName}
                            onChange={(e) => setCommunityName(e.target.value)}
                            placeholder="Enter community name"
                            className="w-full px-4 py-3 bg-gray-50 text-gray-900 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                            autoFocus
                        />
                        <p className="text-gray-500 text-sm mt-2">
                            A #general channel will be created automatically
                        </p>
                    </div>

                    <button
                        onClick={handleCreateCommunity}
                        disabled={loading || !communityName.trim()}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Community'
                        )}
                    </button>
                </div>
            </div>
        )
    }

    // Discover communities view
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setView('main')}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900">Discover Communities</h2>
                    </div>
                    <button
                        onClick={() => setView('main')}
                        className="text-gray-500 hover:text-gray-700 flex items-center gap-2"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : communities.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No communities found. Be the first to create one!</p>
                        <button
                            onClick={() => setView('create')}
                            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                            Create Community
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {communities.map((community) => (
                            <div
                                key={community.id}
                                className="bg-white rounded-xl p-6 flex items-center justify-between border border-gray-200 shadow-sm"
                            >
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">{community.name}</h3>
                                    <p className="text-gray-500 text-sm mt-1">
                                        {community.memberCount || 0} member{(community.memberCount || 0) !== 1 ? 's' : ''}
                                    </p>
                                </div>

                                {community.isMember ? (
                                    <span className="px-4 py-2 bg-green-50 text-green-600 border border-green-200 rounded-lg text-sm font-medium">
                                        Joined
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => handleJoinCommunity(community.id)}
                                        disabled={loading}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Join
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
