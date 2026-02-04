import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// POST - Add reaction to message
export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const token = request.cookies.get('auth-token')?.value
        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const user = await verifyToken(token)
        if (!user) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { messageId, emoji } = body

        if (!messageId || !emoji) {
            return NextResponse.json(
                { error: 'messageId and emoji are required' },
                { status: 400 }
            )
        }

        const db = await getDatabase()
        const messagesCollection = db.collection('messages')

        // Check if user already reacted with this emoji
        const message = await messagesCollection.findOne({
            _id: new ObjectId(messageId)
        })

        if (!message) {
            return NextResponse.json(
                { error: 'Message not found' },
                { status: 404 }
            )
        }

        const existingReactions = message.reactions || []

        // Find if user already has ANY reaction on this message
        const userExistingReaction = existingReactions.find(
            (r: any) => r.userId === user.id
        )

        // Check if clicking the same emoji (toggle off)
        const isSameEmoji = userExistingReaction?.emoji === emoji

        if (isSameEmoji) {
            // Remove reaction (toggle off - clicking same emoji)
            await messagesCollection.updateOne(
                { _id: new ObjectId(messageId) },
                {
                    $pull: {
                        reactions: { userId: user.id }
                    }
                } as any
            )

            return NextResponse.json({
                success: true,
                action: 'removed',
                messageId,
                emoji
            })
        } else if (userExistingReaction) {
            // User has a different reaction - REPLACE it
            // First remove old reaction, then add new one
            await messagesCollection.updateOne(
                { _id: new ObjectId(messageId) },
                {
                    $pull: {
                        reactions: { userId: user.id }
                    }
                } as any
            )

            const newReaction = {
                emoji,
                userId: user.id,
                userName: user.username,
                createdAt: new Date()
            }

            await messagesCollection.updateOne(
                { _id: new ObjectId(messageId) },
                {
                    $push: {
                        reactions: newReaction
                    }
                } as any
            )

            return NextResponse.json({
                success: true,
                action: 'replaced',
                messageId,
                emoji,
                reaction: newReaction
            })
        } else {
            // No existing reaction - add new one
            const newReaction = {
                emoji,
                userId: user.id,
                userName: user.username,
                createdAt: new Date()
            }

            await messagesCollection.updateOne(
                { _id: new ObjectId(messageId) },
                {
                    $push: {
                        reactions: newReaction
                    }
                } as any
            )

            return NextResponse.json({
                success: true,
                action: 'added',
                messageId,
                emoji,
                reaction: newReaction
            })
        }
    } catch (error) {
        console.error('Error handling reaction:', error)
        return NextResponse.json(
            { error: 'Failed to process reaction' },
            { status: 500 }
        )
    }
}

// DELETE - Remove specific reaction
export async function DELETE(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value
        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const user = await verifyToken(token)
        if (!user) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const messageId = searchParams.get('messageId')
        const emoji = searchParams.get('emoji')

        if (!messageId || !emoji) {
            return NextResponse.json(
                { error: 'messageId and emoji are required' },
                { status: 400 }
            )
        }

        const db = await getDatabase()
        const messagesCollection = db.collection('messages')

        await messagesCollection.updateOne(
            { _id: new ObjectId(messageId) },
            {
                $pull: {
                    reactions: { userId: user.id, emoji }
                }
            } as any
        )

        return NextResponse.json({
            success: true,
            action: 'removed',
            messageId,
            emoji
        })
    } catch (error) {
        console.error('Error removing reaction:', error)
        return NextResponse.json(
            { error: 'Failed to remove reaction' },
            { status: 500 }
        )
    }
}

// GET - Get reactions for a message
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const messageId = searchParams.get('messageId')

        if (!messageId) {
            return NextResponse.json(
                { error: 'messageId is required' },
                { status: 400 }
            )
        }

        const db = await getDatabase()
        const messagesCollection = db.collection('messages')

        const message = await messagesCollection.findOne(
            { _id: new ObjectId(messageId) },
            { projection: { reactions: 1 } }
        )

        if (!message) {
            return NextResponse.json(
                { error: 'Message not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            reactions: message.reactions || []
        })
    } catch (error) {
        console.error('Error fetching reactions:', error)
        return NextResponse.json(
            { error: 'Failed to fetch reactions' },
            { status: 500 }
        )
    }
}
