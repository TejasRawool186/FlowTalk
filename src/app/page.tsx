'use client'

import { MongoAuthProvider, useMongoAuth } from '@/contexts/MongoAuthContext'
import { MongoAuth } from '@/components/MongoAuth'
import { MongoChatApp } from '@/components/MongoChatApp'

function AppContent() {
  const { user, loading } = useMongoAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return user ? <MongoChatApp /> : <MongoAuth />
}

export default function Home() {
  return (
    <MongoAuthProvider>
      <AppContent />
    </MongoAuthProvider>
  )
}