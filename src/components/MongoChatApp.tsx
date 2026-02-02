'use client'

import React, { useState, useEffect } from 'react'
import { useMongoAuth } from '@/contexts/MongoAuthContext'
import { MongoChannel } from './MongoChannel'
import { CommunityDashboard } from './CommunityDashboard'
import { UserProfileModal } from './UserProfileModal'
import { LogOut, Settings, Globe, Users, Plus, Search, ChevronLeft, Hash, X, Loader2, Upload, MessageSquare } from 'lucide-react'
import { Channel as ChannelType, Community, Conversation } from '@/types'

export function MongoChatApp() {
  const { user, signOut, updateProfile } = useMongoAuth()
  const [communities, setCommunities] = useState<Community[]>([])
  const [channels, setChannels] = useState<ChannelType[]>([])
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [creatingChannel, setCreatingChannel] = useState(false)
  const [channelError, setChannelError] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const [editStatus, setEditStatus] = useState('')

  const [savingProfile, setSavingProfile] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [showNewDM, setShowNewDM] = useState(false)
  const [newDMUsername, setNewDMUsername] = useState('')
  const [creatingDM, setCreatingDM] = useState(false)
  const [dmError, setDmError] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)

  useEffect(() => {
    if (showSettings && user) {
      setEditAvatar(user.avatar || '')
      setEditStatus(user.status || '')
    }
  }, [showSettings, user])

  useEffect(() => {
    if (user) {
      loadCommunitiesAndChannels()
      setLoading(false)
    }
  }, [user])

  // Poll conversations separately
  useEffect(() => {
    if (!user) return

    loadConversations() // Initial load
    const interval = setInterval(loadConversations, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [user])

  const loadConversations = async () => {
    try {
      const convResponse = await fetch('/api/conversations')
      if (convResponse.ok) {
        const convData = await convResponse.json()
        setConversations(convData.conversations || [])
      }
    } catch (e) {
      console.error('Error loading conversations:', e)
    }
  }

  const loadCommunitiesAndChannels = async () => {
    try {
      console.log('Loading communities and channels for user:', user?.id)

      const response = await fetch('/api/communities')
      if (!response.ok) {
        throw new Error('Failed to fetch communities')
      }

      const data = await response.json()

      console.log('Loaded communities:', data.communities?.length || 0)
      console.log('Loaded channels:', data.channels?.length || 0)

      setCommunities(data.communities || [])
      setChannels(data.channels || [])

      // Initial load of conversations
      await loadConversations()

      // If no communities, show dashboard
      if (!data.communities || data.communities.length === 0) {
        setShowDashboard(true)
      } else {
        setShowDashboard(false)
      }

    } catch (error: any) {
      console.error('Error loading communities and channels:', error?.message || error)
    } finally {
      setLoading(false)
    }
  }

  const handleCommunityJoined = () => {
    setShowDashboard(false)
    loadCommunitiesAndChannels()
  }

  const handleBackFromDashboard = () => {
    if (communities.length > 0) {
      setShowDashboard(false)
    }
  }

  const handleSelectCommunity = (community: Community) => {
    setSelectedCommunity(community)
    setSelectedChannel(null)
  }

  const handleBackToCommunities = () => {
    setSelectedCommunity(null)
    setSelectedChannel(null)
  }

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !selectedCommunity) return

    setCreatingChannel(true)
    setChannelError('')

    try {
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: selectedCommunity.id,
          name: newChannelName.trim()
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create channel')
      }

      const data = await response.json()

      // Add the new channel to the list
      setChannels(prev => [...prev, data.channel])

      // Select the new channel
      setSelectedChannel(data.channel)

      // Reset form
      setNewChannelName('')
      setShowCreateChannel(false)
    } catch (err: any) {
      setChannelError(err.message)
    } finally {
      setCreatingChannel(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setSavingProfile(true)
    try {
      await updateProfile({
        avatar: editAvatar,
        status: editStatus
      })
      setShowSettings(false)
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleCreateDM = async (targetIdentifier?: string) => {
    const identifier = targetIdentifier || newDMUsername
    if (!identifier.trim()) return

    setCreatingDM(true)
    setDmError('')

    try {
      // payload: send as targetUserId if it looks like an ID (from modal), otherwise as targetUsername
      // Actually, backend now handles 'targetUsername' smartly, so we can just send it as targetUsername 
      // OR we can be explicit. explicit is better.
      // Let's rely on backend smarts for simplicity or check regex here.
      // Since we changed backend to check both, sending as targetUsername is fine, BUT
      // if we clicked from modal, we are passing an ID.
      // Let's send as 'targetUsername' for now since backend handles ID-in-username-field.
      // Wait, if I pass an ID as targetUsername, backend checks ObjectId.isValid(targetUsername) -> finds user.
      // So keeping it sending as 'targetUsername' works for BOTH cases.

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: identifier.trim() })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start conversation')
      }

      const data = await response.json()
      setConversations(prev => [data.conversation, ...prev])
      setSelectedConversation(data.conversation)
      setSelectedChannel(null)
      setSelectedCommunity(null)
      setShowNewDM(false)
      setNewDMUsername('')

    } catch (err: any) {
      setDmError(err.message)
    } finally {
      setCreatingDM(false)
    }
  }

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      await updateProfile({ primaryLanguage: newLanguage })
    } catch (error) {
      console.error('Error updating language:', error)
    }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 50000) {
        alert('File size too large. Please choose an image under 50KB.')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditAvatar(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Get channels for selected community
  const communityChannels = selectedCommunity
    ? channels.filter(ch => ch.communityId === selectedCommunity.id)
    : []

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // Show dashboard if no communities or user clicked to show it
  if (showDashboard) {
    return (
      <CommunityDashboard
        onCommunityJoined={handleCommunityJoined}
        onBack={communities.length > 0 ? handleBackFromDashboard : undefined}
      />
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">FlowTalk</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* User info */}
          <div className="mt-2">
            <div className="flex items-center gap-3">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-10 h-10 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{user?.username}</div>
                {user?.status && (
                  <div className="text-xs text-gray-500 truncate">{user.status}</div>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                  <Globe className="w-3 h-3" />
                  <span>{user?.primaryLanguage?.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Profile Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Avatar Image</label>
                  <div className="flex items-center gap-3">
                    {editAvatar ? (
                      <img
                        src={editAvatar}
                        alt="Avatar preview"
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <Users className="w-5 h-5" />
                      </div>
                    )}
                    <label className="cursor-pointer px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                    </label>
                    {editAvatar && (
                      <button
                        onClick={() => setEditAvatar('')}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status Message</label>
                  <input
                    type="text"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Language</h3>
              <select
                value={user?.primaryLanguage || 'en'}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ru">Russian</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
                <option value="ar">Arabic</option>
                <option value="hi">Hindi</option>
              </select>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Community Actions */}
        <div className="p-3 border-b border-gray-200 bg-white">
          <div className="flex gap-2">
            <button
              onClick={() => setShowDashboard(true)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
            <button
              onClick={() => setShowDashboard(true)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-md transition-colors"
            >
              <Search className="w-4 h-4" />
              Discover
            </button>
          </div>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {selectedCommunity ? (
            // Inside a community - show channels
            <div className="p-4">
              {/* Back button */}
              <button
                onClick={handleBackToCommunities}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Communities
              </button>

              {/* Community name */}
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedCommunity.name}
              </h2>

              {/* Channels header with create button */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channels
                </h3>
                <button
                  onClick={() => setShowCreateChannel(true)}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Create channel"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Create Channel Form */}
              {showCreateChannel && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">New Channel</span>
                    <button
                      onClick={() => {
                        setShowCreateChannel(false)
                        setNewChannelName('')
                        setChannelError('')
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {channelError && (
                    <div className="text-red-500 text-xs mb-2">{channelError}</div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="channel-name"
                      className="flex-1 min-w-0 px-2 py-1.5 text-sm text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateChannel()
                        if (e.key === 'Escape') {
                          setShowCreateChannel(false)
                          setNewChannelName('')
                        }
                      }}
                    />
                    <button
                      onClick={handleCreateChannel}
                      disabled={creatingChannel || !newChannelName.trim()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm rounded transition-colors whitespace-nowrap"
                    >
                      {creatingChannel ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                    </button>
                  </div>
                </div>
              )}

              {/* Channels list */}
              <div className="space-y-1">
                {communityChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${selectedChannel?.id === channel.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    <Hash className="w-4 h-4" />
                    {channel.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Community list view
            <div className="p-4">
              <h2 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Communities
              </h2>
              <div className="space-y-2">
                {communities.map((community) => (
                  <button
                    key={community.id}
                    onClick={() => handleSelectCommunity(community)}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                  >
                    <div className="font-medium text-gray-900">{community.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {channels.filter(ch => ch.communityId === community.id).length} channel(s)
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Direct Messages Section */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center">
                <MessageSquare className="w-3 h-3 mr-1" />
                Direct Messages
              </h3>
              <button
                onClick={() => setShowNewDM(true)}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="New message"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* New DM Form */}
            {showNewDM && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">New Message</span>
                  <button
                    onClick={() => {
                      setShowNewDM(false)
                      setNewDMUsername('')
                      setDmError('')
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {dmError && (
                  <div className="text-red-500 text-xs mb-2">{dmError}</div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDMUsername}
                    onChange={(e) => setNewDMUsername(e.target.value)}
                    placeholder="Username"
                    className="flex-1 min-w-0 px-2 py-1.5 text-sm text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateDM()
                      if (e.key === 'Escape') {
                        setShowNewDM(false)
                        setNewDMUsername('')
                      }
                    }}
                  />
                  <button
                    onClick={() => handleCreateDM()}
                    disabled={creatingDM || !newDMUsername.trim()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm rounded transition-colors whitespace-nowrap"
                  >
                    {creatingDM ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {conversations.map((conv) => {
                const otherUser = conv.participantsData?.find(p => p.id !== user?.id)
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv)
                      setSelectedChannel(null)
                      setSelectedCommunity(null)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${selectedConversation?.id === conv.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    {otherUser?.avatar ? (
                      <img src={otherUser.avatar} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-500">
                        {otherUser?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="truncate">{otherUser?.username || 'Unknown User'}</span>
                    {otherUser?.status && (
                      <span className="w-2 h-2 rounded-full bg-green-500 ml-auto" title={otherUser.status}></span>
                    )}
                  </button>
                )
              })}
              {conversations.length === 0 && !showNewDM && (
                <div className="text-xs text-gray-400 italic px-2">No conversations yet</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedChannel ? (
          <MongoChannel
            channel={selectedChannel}
            currentUserId={user!.id}
            onViewProfile={setViewingUserId}
          />
        ) : selectedConversation ? (
          // Reusing MongoChannel logic but adapted for DMs would be ideal, 
          // but MongoChannel takes a Channel object.
          // We should either adapt MongoChannel to accept Conversation OR create MongoDMChannel.
          // For speed, let's cast/adapt the conversation to look like a channel for now
          // OR better, instantiate MongoChannel with a special prop.
          // Let's verify MongoChannel props. It takes `channel: ChannelType`.
          // We can construct a fake ChannelType from the conversation.
          <MongoChannel
            channel={{
              id: selectedConversation.id,
              communityId: 'dm', // Special ID
              name: selectedConversation.participantsData?.find(p => p.id !== user?.id)?.username || 'Chat',
              description: 'Direct Message',
              createdAt: selectedConversation.createdAt
            }}
            currentUserId={user!.id}
            isDirectMessage={true} // We might need to add this prop to MongoChannel to handle different API endpoints
            onViewProfile={setViewingUserId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {selectedCommunity ? `Welcome to ${selectedCommunity.name}` : 'Welcome to FlowTalk'}
              </h2>
              <p className="text-gray-500">
                {selectedCommunity
                  ? 'Select a channel to start chatting'
                  : 'Select a community to get started'
                }
              </p>
            </div>
          </div>
        )}
      </div>

      <UserProfileModal
        userId={viewingUserId}
        isOpen={!!viewingUserId}
        onClose={() => setViewingUserId(null)}
        currentUserId={user?.id || ''}
        onMessageUser={handleCreateDM}
      />
    </div>
  )
}