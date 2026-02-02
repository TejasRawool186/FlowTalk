import { NextRequest, NextResponse } from 'next/server'
import { MongoConversationService } from '@/services/MongoConversationService'
import { verifyToken } from '@/lib/auth'
import { ValidationError } from '@/lib/errors'

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = verifyToken(token)
        if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

        const conversationService = new MongoConversationService()
        const conversations = await conversationService.getUserConversations(user.id)

        return NextResponse.json({ conversations })
    } catch (error: any) {
        console.error('Error fetching conversations:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch conversations' },
            { status: error instanceof ValidationError ? 400 : 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = verifyToken(token)
        if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

        const body = await request.json()
        const { targetUserId } = body

        if (!targetUserId) {
            return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 })
        }

        const conversationService = new MongoConversationService()
        const conversation = await conversationService.createConversation(user.id, targetUserId)

        return NextResponse.json({ conversation })
    } catch (error: any) {
        console.error('Error creating conversation:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create conversation' },
            { status: error instanceof ValidationError ? 400 : 500 }
        )
    }
}
