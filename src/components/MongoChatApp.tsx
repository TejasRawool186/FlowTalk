'use client'

import React, { useState, useEffect } from 'react'
import { useMongoAuth } from '@/contexts/MongoAuthContext'
import { MongoChannel } from './MongoChannel'
import { LogOut, Settings, Globe, Users } from 'lucide-react'
import { Channel as ChannelType, Community } from '@/types'

export function MongoChatApp() {
  const { user, signOut, updateProfile } = useMongoAuth()
  const [communities, setCommunities] = useState<Community[]>([])
  const [channels, setChannels] = useState<ChannelType[]>([])
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (user) {
      loadCommunitiesAndChannels()
    } else {
      setLoading(false)
    }
  }, [user])

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

      // Select first channel by default
      if (data.channels && data.channels.length > 0) {
        setSelectedChannel(data.channels[0])
      }

    } catch (error: any) {
      console.error('Error loading communities and channels:', error?.message || error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      await updateProfile({ primaryLanguage: newLanguage })
      setShowSettings(false)
    } catch (error) {
      console.error('Error updating language:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
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
          <div className="mt-2 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4" />
              <span>{user?.primaryLanguage?.toUpperCase()}</span>
              <span>•</span>
              <span>{user?.username}</span>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Language Settings</h3>
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
        )}

        {/* Communities */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Communities
            </h2>
            {communities.map((community) => (
              <div key={community.id} className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">{community.name}</h3>
                <div className="space-y-1">
                  {channels
                    .filter(channel => channel.communityId === community.id)
                    .map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => setSelectedChannel(channel)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${selectedChannel?.id === channel.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        # {channel.name}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <MongoChannel
            channel={selectedChannel}
            currentUserId={user!.id}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to FlowTalk</h2>
              <p className="text-gray-600">Select a channel to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}