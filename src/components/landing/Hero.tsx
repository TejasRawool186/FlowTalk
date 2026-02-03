'use client'

import { motion } from 'framer-motion'
import { Globe, MessageSquare, Shield, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function Hero({ onStart }: { onStart: () => void }) {
    const router = useRouter()
    const [greeting, setGreeting] = useState('Hello')
    const greetings = [
        'Hello', 'Hola', 'Bonjour', 'Hallo', 'Ciao', 'Olá',
        'Namaste', 'Konnichiwa', 'Anyong', 'Ni Hao', 'Salaam'
    ]

    useEffect(() => {
        let i = 0
        const interval = setInterval(() => {
            i = (i + 1) % greetings.length
            setGreeting(greetings[i])
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white text-slate-900">
            {/* Background Gradients & Blobs (Aurora Effect) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/30 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-400/30 rounded-full blur-[100px] animate-pulse delay-1000" />

                <motion.div
                    animate={{ x: [0, 50, 0], y: [0, -50, 0], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[20%] right-[20%] w-[30rem] h-[30rem] bg-indigo-300/20 rounded-full blur-[80px]"
                />
                <motion.div
                    animate={{ x: [0, -50, 0], y: [0, 50, 0], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-[20%] left-[20%] w-[25rem] h-[25rem] bg-teal-300/20 rounded-full blur-[80px]"
                />
            </div>

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/0 via-white/80 to-white" />
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-[0.15]" />

            <div className="container mx-auto px-4 z-10 relative flex flex-col md:flex-row items-center">
                {/* Text Content */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="flex-1 text-center md:text-left mb-12 md:mb-0"
                >
                    <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-sm font-medium">
                        🚀 The Future of Global Communication
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600">
                        Speak Locally,<br />
                        Connect Globally.
                    </h1>
                    <p className="text-xl text-slate-600 mb-8 max-w-lg mx-auto md:mx-0 leading-relaxed">
                        Break language barriers instantly with AI-powered translation.
                        Chat with anyone, anywhere, in their native tongue.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onStart}
                            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full font-bold text-lg text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                        >
                            Start Chatting <MessageSquare className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-8 py-4 bg-white border border-slate-200 rounded-full font-bold text-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            View Features
                        </motion.button>
                    </div>
                </motion.div>

                {/* Visual Content (Globe/Network) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="flex-1 relative flex items-center justify-center"
                >
                    {/* Glowing Orb/Globe Representation */}
                    <div className="relative w-80 h-80 md:w-[500px] md:h-[500px]">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 rounded-full border border-blue-200 md:border-2 border-dashed"
                        />
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-10 rounded-full border border-cyan-200 border-dotted"
                        />

                        {/* Floating Greeting */}
                        <motion.div
                            key={greeting}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <div className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-600 to-cyan-500 drop-shadow-sm">
                                {greeting}
                            </div>
                        </motion.div>

                        {/* Orbiting Elements */}
                        <div className="absolute top-0 right-0 p-3 bg-white/80 backdrop-blur rounded-xl border border-slate-200 shadow-xl animate-bounce">
                            <Globe className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="absolute bottom-20 left-0 p-3 bg-white/80 backdrop-blur rounded-xl border border-slate-200 shadow-xl animate-pulse">
                            <Zap className="w-8 h-8 text-yellow-500" />
                        </div>
                        <div className="absolute top-1/2 -right-10 p-3 bg-white/80 backdrop-blur rounded-xl border border-slate-200 shadow-xl">
                            <Shield className="w-8 h-8 text-cyan-600" />
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
