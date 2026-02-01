'use client'

import React, { useState, useEffect } from 'react'
import { AlertTriangle, MessageSquare, Globe, Code, Send, User, Bot } from 'lucide-react'

interface DemoMessage {
  id: string
  content: string
  sender: string
  timestamp: Date
  originalLang: string
  translatedContent?: string
  isTranslated?: boolean
}

export function DemoMode() {
  const [showChat, setShowChat] = useState(false)
  const [messages, setMessages] = useState<DemoMessage[]>([
    {
      id: '1',
      content: 'Welcome to FlowTalk! This is a demo of our multilingual chat.',
      sender: 'System',
      timestamp: new Date(Date.now() - 60000),
      originalLang: 'en'
    },
    {
      id: '2',
      content: 'Hola! ¿Cómo están todos hoy?',
      sender: 'Carlos',
      timestamp: new Date(Date.now() - 45000),
      originalLang: 'es',
      translatedContent: 'Hello! How is everyone today?',
      isTranslated: true
    },
    {
      id: '3',
      content: 'I\'m working on a React component with `useState` hook.',
      sender: 'Alice',
      timestamp: new Date(Date.now() - 30000),
      originalLang: 'en'
    }
  ])
  const [newMessage, setNewMessage] = useState('')
  const [currentUser] = useState('Demo User')

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const message: DemoMessage = {
      id: Date.now().toString(),
      content: newMessage,
      sender: currentUser,
      timestamp: new Date(),
      originalLang: 'en'
    }

    setMessages(prev => [...prev, message])
    setNewMessage('')

    // Simulate a response
    setTimeout(() => {
      const responses = [
        'That\'s interesting! Tell me more.',
        'Great point! I agree.',
        'Thanks for sharing that.',
        'How does that work exactly?',
        'I had a similar experience.'
      ]
      
      const response: DemoMessage = {
        id: (Date.now() + 1).toString(),
        content: responses[Math.floor(Math.random() * responses.length)],
        sender: 'Demo Bot',
        timestamp: new Date(),
        originalLang: 'en'
      }
      
      setMessages(prev => [...prev, response])
    }, 1000)
  }

  if (!showChat) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Demo Banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">Demo Mode</span>
            </div>
            <p className="text-yellow-700 mt-1">
              This is a demonstration of FlowTalk. Database and authentication are disabled. 
              To run the full application, configure your Supabase credentials.
            </p>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare className="w-8 h-8" />
                <h1 className="text-3xl font-bold">FlowTalk</h1>
              </div>
              <p className="text-blue-100 text-lg">
                Multilingual Chat Application with Real-time Translation
              </p>
            </div>

            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Features */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Features</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Globe className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-gray-900">Real-time Translation</h3>
                        <p className="text-gray-600 text-sm">
                          Messages are automatically translated into each user's preferred language
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Code className="w-5 h-5 text-green-500 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-gray-900">Code Preservation</h3>
                        <p className="text-gray-600 text-sm">
                          Code blocks and technical terms remain untranslated for accuracy
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <MessageSquare className="w-5 h-5 text-purple-500 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-gray-900">Toggle Views</h3>
                        <p className="text-gray-600 text-sm">
                          Users can switch between original and translated message views
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Setup Instructions */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Setup Instructions</h2>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">To run the full application:</h3>
                    <ol className="text-sm text-gray-600 space-y-2">
                      <li>1. Create a Supabase project</li>
                      <li>2. Run the database migrations from <code className="bg-gray-200 px-1 rounded">supabase/migrations/</code></li>
                      <li>3. Update <code className="bg-gray-200 px-1 rounded">.env.local</code> with your credentials:</li>
                    </ol>
                    <div className="mt-3 bg-gray-800 text-gray-100 p-3 rounded text-xs font-mono">
                      <div>NEXT_PUBLIC_SUPABASE_URL=your_project_url</div>
                      <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key</div>
                      <div>LINGO_API_KEY=your_lingo_api_key</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Try Demo Button */}
              <div className="mt-8 pt-8 border-t border-gray-200 text-center">
                <button
                  onClick={() => setShowChat(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  Try Interactive Demo
                </button>
                <p className="text-gray-500 text-sm mt-2">
                  Experience the chat interface with simulated multilingual messages
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Chat Interface
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold">FlowTalk Demo</h1>
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Demo Mode</span>
          </div>
          <button
            onClick={() => setShowChat(false)}
            className="text-gray-500 hover:text-gray-700 px-3 py-1 rounded"
          >
            Back to Info
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              {message.sender === 'System' ? (
                <Bot className="w-4 h-4 text-white" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">{message.sender}</span>
                <span className="text-xs text-gray-500">
                  {message.timestamp.toLocaleTimeString()}
                </span>
                {message.isTranslated && (
                  <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                    Translated from {message.originalLang.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-gray-800">
                  {message.isTranslated ? message.translatedContent : message.content}
                </p>
                {message.isTranslated && (
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Original: "{message.content}"
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          This is a demo. Messages are simulated and not saved.
        </p>
      </div>
    </div>
  )
}