import { NextRequest, NextResponse } from 'next/server'
import { MongoConversationService } from '@/services/MongoConversationService'
import { verifyToken } from '@/lib/auth'
import { ValidationError } from '@/lib/errors'
import { getDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

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
        const { targetUserId, targetUsername } = body

        let finalTargetId = targetUserId

        if (!finalTargetId && targetUsername) {
            const db = await getDatabase()
            // Try to find by username
            const targetUser = await db.collection('users').findOne({ username: targetUsername })

            if (targetUser) {
                finalTargetId = targetUser._id.toString()
            } else if (ObjectId.isValid(targetUsername)) {
                // If not found by username but looks like an objectID, try finding by ID
                // (This handles cases where user pastes ID into username field)
                const targetUserById = await db.collection('users').findOne({ _id: new ObjectId(targetUsername) })
                if (targetUserById) {
                    finalTargetId = targetUserById._id.toString()
                }
            }
        }

        if (!finalTargetId) {
            return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
        }

        const conversationService = new MongoConversationService()
        const conversation = await conversationService.createConversation(user.id, finalTargetId)

        return NextResponse.json({ conversation })
    } catch (error: any) {
        console.error('Error creating conversation:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create conversation' },
            { status: error instanceof ValidationError ? 400 : 500 }
        )
    }
}
