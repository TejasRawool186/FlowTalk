import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'

// WARNING: This endpoint clears ALL data! Only use in development.
export async function POST() {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
    }

    try {
        const db = await getDatabase()

        const collections = ['users', 'communities', 'channels', 'messages', 'conversations']
        const results: Record<string, number> = {}

        for (const collection of collections) {
            try {
                const result = await db.collection(collection).deleteMany({})
                results[collection] = result.deletedCount
                console.log(`Cleared ${collection}: ${result.deletedCount} deleted`)
            } catch (error: any) {
                results[collection] = -1
                console.error(`Error clearing ${collection}:`, error.message)
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Database cleared! You can now register a new account.',
            results
        })
    } catch (error: any) {
        console.error('Error clearing database:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
