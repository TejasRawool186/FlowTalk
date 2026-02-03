'use client'

import { motion } from 'framer-motion'

const technologies = [
    {
        name: 'Next.js 15',
        logo: 'https://cdn.worldvectorlogo.com/logos/next-js.svg',
        alt: 'Next.js Logo'
    },
    {
        name: 'React',
        logo: 'https://cdn.worldvectorlogo.com/logos/react-2.svg',
        alt: 'React Logo'
    },
    {
        name: 'MongoDB',
        logo: 'https://cdn.worldvectorlogo.com/logos/mongodb-icon-1.svg',
        alt: 'MongoDB Logo'
    },
    {
        name: 'TypeScript',
        logo: 'https://cdn.worldvectorlogo.com/logos/typescript.svg',
        alt: 'TypeScript Logo'
    },
    {
        name: 'Tailwind CSS',
        logo: 'https://cdn.worldvectorlogo.com/logos/tailwind-css-2.svg',
        alt: 'Tailwind CSS Logo'
    },
    {
        name: 'Lingo.dev',
        logo: '/lingo-logo.png',
        alt: 'Lingo.dev Logo'
    }
]

export function TechStack() {
    return (
        <div className="py-24 bg-gradient-to-b from-white to-blue-50/30 border-t border-slate-100">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Powered by Modern Tech</h2>
                <p className="text-slate-600 mb-12 max-w-xl mx-auto">
                    Built with cutting-edge technologies for performance, scalability, and exceptional user experience
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 max-w-5xl mx-auto">
                    {technologies.map((tech, index) => (
                        <motion.div
                            key={tech.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            viewport={{ once: true }}
                            whileHover={{ scale: 1.1, y: -5 }}
                            className="flex flex-col items-center gap-3 p-4 rounded-xl bg-white shadow-sm hover:shadow-lg transition-shadow duration-300"
                        >
                            <div className="w-12 h-12 relative flex items-center justify-center">
                                <img
                                    src={tech.logo}
                                    alt={tech.alt}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <span className="text-sm font-medium text-slate-700">{tech.name}</span>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-24 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-sm">
                    <p>&copy; 2026 FlowTalk. Built for Hackathon.</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">GitHub</a>
                    </div>
                </div>
            </div>
        </div>
    )
}
