import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { MongoUserService } from '@/services/MongoUserService'

// Initialize service
const userService = new MongoUserService()

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> } // params is a Promise in Next.js 15+
) {
    try {
        // 1. Verify Authentication
        const token = request.cookies.get('auth-token')?.value
        const decoded = verifyToken(token || '')

        if (!decoded) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Await params (Next.js 15/16 requirement)
        const { userId } = await params

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        // 3. Get User Profile
        const profile = await userService.getUserProfile(userId)

        if (!profile) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json({ user: profile })

    } catch (error: any) {
        console.error('Get user API error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch user profile' },
            { status: 500 }
        )
    }
}
