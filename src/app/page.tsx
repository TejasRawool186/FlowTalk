'use client'

import { useState } from 'react'
import { MongoAuthProvider, useMongoAuth } from '@/contexts/MongoAuthContext'
import { MongoAuth } from '@/components/MongoAuth'
import { MongoChatApp } from '@/components/MongoChatApp'
import { Hero } from '@/components/landing/Hero'
import { Features } from '@/components/landing/Features'
import { TechStack } from '@/components/landing/TechStack'

function AppContent() {
  const { user, loading } = useMongoAuth()
  const [showAuth, setShowAuth] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // If user is logged in, show the Chat App
  if (user) {
    return <MongoChatApp />
  }

  // If user wants to authenticate (clicked Start Chatting), show Auth Screen
  if (showAuth) {
    // Wrap MongoAuth to provide a "Back to Home" option could be nice, 
    // but for now let's just show it.
    // We can wrap it in a div with a back button or just ensure MongoAuth is minimal.
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="p-4">
          <button
            onClick={() => setShowAuth(false)}
            className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
          >
            ← Back to Home
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <MongoAuth variant="embedded" />
        </div>
      </div>
    )
  }

  // Default: Show Landing Page
  return (
    <main className="min-h-screen bg-white">
      <Hero onStart={() => setShowAuth(true)} />
      <Features />
      <TechStack />
    </main>
  )
}

export default function Home() {
  return (
    <MongoAuthProvider>
      <AppContent />
    </MongoAuthProvider>
  )
}