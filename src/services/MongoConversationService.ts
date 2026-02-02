import { ObjectId } from 'mongodb'
import { getDatabase } from '@/lib/mongodb'
import { Conversation } from '@/types'
import { ValidationError, handleError } from '@/lib/errors'

export class MongoConversationService {
    /**
     * Create a new conversation or get existing one between two users
     */
    async createConversation(userId1: string, userId2: string): Promise<Conversation> {
        try {
            if (!userId1 || !userId2) {
                throw new ValidationError('Both user IDs are required')
            }

            if (userId1 === userId2) {
                throw new ValidationError('Cannot create conversation with yourself')
            }

            const db = await getDatabase()
            const participants = [userId1, userId2].sort() // Sort for consistent querying

            // Check if conversation already exists
            const existing = await db.collection('conversations').findOne({
                participants: { $all: participants, $size: 2 }
            })

            if (existing) {
                return this.mapDocToConversation(existing)
            }

            // Create new conversation
            const result = await db.collection('conversations').insertOne({
                participants,
                createdAt: new Date(),
                lastMessageAt: new Date()
            })

            return {
                id: result.insertedId.toString(),
                participants,
                lastMessageAt: new Date(),
                createdAt: new Date()
            }
        } catch (error) {
            throw handleError(error, 'MongoConversationService.createConversation')
        }
    }

    /**
     * Get all conversations for a user
     */
    async getUserConversations(userId: string): Promise<Conversation[]> {
        try {
            if (!userId) {
                throw new ValidationError('User ID is required')
            }

            const db = await getDatabase()

            const conversations = await db.collection('conversations')
                .find({ participants: userId })
                .sort({ lastMessageAt: -1 })
                .toArray()

            // Hydrate with participant info
            const results = await Promise.all(conversations.map(async (conv) => {
                const conversation = this.mapDocToConversation(conv)

                // Get other participant's info
                const otherUserId = conversation.participants.find(p => p !== userId)
                if (otherUserId) {
                    const user = await db.collection('users').findOne(
                        { _id: new ObjectId(otherUserId) },
                        { projection: { username: 1, avatar: 1, status: 1, primaryLanguage: 1 } }
                    )

                    if (user) {
                        conversation.participantsData = [{
                            id: user._id.toString(),
                            username: user.username,
                            primaryLanguage: user.primaryLanguage,
                            createdAt: user.createdAt
                        }]

                        if (conversation.participantsData && conversation.participantsData[0]) {
                            (conversation.participantsData[0] as any).avatar = user.avatar;
                            (conversation.participantsData[0] as any).status = user.status;
                        }
                    }
                }

                return conversation
            }))

            return results
        } catch (error) {
            throw handleError(error, 'MongoConversationService.getUserConversations')
        }
    }

    private mapDocToConversation(doc: any): Conversation {
        return {
            id: doc._id.toString(),
            participants: doc.participants,
            lastMessageAt: doc.lastMessageAt,
            createdAt: doc.createdAt
        }
    }
}
