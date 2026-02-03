'use client'

import { motion } from 'framer-motion'
import { Languages, FileUp, UserCircle, Globe, Zap, Lock } from 'lucide-react'

const features = [
    {
        title: 'Real-time Translation',
        description: 'Type in English, they see Spanish. Supports 50+ languages instantly with AI-powered accuracy.',
        icon: Languages,
        color: 'blue'
    },
    {
        title: 'Universal File Sharing',
        description: 'Share images, documents, and files seamlessly across borders and devices.',
        icon: FileUp,
        color: 'green'
    },
    {
        title: 'Identity & Profiles',
        description: 'Express yourself with custom avatars and status updates. connect via direct messages.',
        icon: UserCircle,
        color: 'purple'
    },
    {
        title: 'Global Connectivity',
        description: 'Connect with anyone, anywhere. The world is your neighborhood.',
        icon: Globe,
        color: 'cyan'
    },
    {
        title: 'Lightning Fast',
        description: 'Built on Next.js for blazing fast performance and real-time WebSocket updates.',
        icon: Zap,
        color: 'yellow'
    },
    {
        title: 'Secure & Private',
        description: 'Enterprise-grade security protocols keep your conversations private and safe.',
        icon: Lock,
        color: 'teal'
    }
]

export function Features() {
    return (
        <div className="py-24 bg-slate-50 text-slate-900 relative overflow-hidden">
            {/* Subtle Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent" />
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[20%] -right-[10%] w-[50rem] h-[50rem] border border-slate-200/60 rounded-full border-dashed opacity-50"
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-[20%] -left-[10%] w-[60rem] h-[60rem] border border-slate-200/60 rounded-full border-dotted opacity-50"
                />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-bold mb-4"
                    >
                        Powerful Features
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-slate-600 max-w-2xl mx-auto"
                    >
                        Everything you need to communicate without limits.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="p-8 rounded-2xl bg-white border border-slate-200 hover:border-blue-500/50 transition-all hover:shadow-xl group"
                        >
                            <div className={`w-14 h-14 rounded-xl bg-${feature.color}-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                <feature.icon className={`w-8 h-8 text-${feature.color}-600`} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900 group-hover:text-blue-600 transition-colors">
                                {feature.title}
                            </h3>
                            <p className="text-slate-600 leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    )
}
