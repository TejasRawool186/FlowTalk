import { ObjectId } from 'mongodb'
import { getDatabase } from '@/lib/mongodb'
import { Message, MessageStatus } from '@/types'
import { MessageService } from './interfaces'
import { ValidationError, DatabaseError, handleError } from '@/lib/errors'
import { MESSAGE_STATUS } from '@/lib/constants'
import { LanguageDetectorImpl } from './LanguageDetector'

export class MongoMessageService implements MessageService {
  private languageDetector = new LanguageDetectorImpl()

  /**
   * Create a new message in MongoDB with proper language detection
   */
  async createMessage(channelId: string, content: string, senderId: string, detectedLanguage?: string): Promise<Message> {
    try {
      if (!channelId || !content.trim() || !senderId) {
        throw new ValidationError('Channel ID, content, and sender ID are required')
      }

      const db = await getDatabase()

      // Step 1: Detect the actual language of the content (don't trust user preference)
      let sourceLanguage = detectedLanguage
      if (!sourceLanguage) {
        try {
          const detectionResult = await this.languageDetector.detectLanguage(content)
          // Handle both string and object return types
          sourceLanguage = typeof detectionResult === 'string' ? detectionResult : detectionResult.language
          console.log(`🔍 Language detected for message: "${content}" -> ${sourceLanguage}`)
        } catch (error) {
          console.warn('Language detection failed, falling back to user preference:', error)
          // Fallback to sender's profile language
          const sender = await db.collection('users').findOne({ _id: new ObjectId(senderId) })
          if (!sender) {
            throw new DatabaseError('Sender not found', new Error('User not found'))
          }
          sourceLanguage = sender.primaryLanguage || 'en'
        }
      }

      const messageDoc = {
        channelId: new ObjectId(channelId),
        senderId: new ObjectId(senderId),
        content: content.trim(),
        sourceLanguage: sourceLanguage,
        status: MESSAGE_STATUS.SENT,
        timestamp: new Date(),
        translations: []
      }

      const result = await db.collection('messages').insertOne(messageDoc)

      return {
        id: result.insertedId.toString(),
        channelId,
        senderId,
        content: messageDoc.content,
        sourceLanguage: messageDoc.sourceLanguage || 'en',
        status: messageDoc.status as MessageStatus,
        timestamp: messageDoc.timestamp,
        translations: []
      }
    } catch (error) {
      throw handleError(error, 'MongoMessageService.createMessage')
    }
  }

  /**
   * Get messages for a specific channel
   */
  async getChannelMessages(channelId: string, limit: number = 50): Promise<Message[]> {
    try {
      if (!channelId) {
        throw new ValidationError('Channel ID is required')
      }

      const db = await getDatabase()

      const messages = await db.collection('messages')
        .find({ channelId: new ObjectId(channelId) })
        .sort({ timestamp: 1 })
        .limit(Math.min(limit, 100))
        .toArray()

      return messages.map(this.mapMongoMessageToMessage)
    } catch (error) {
      throw handleError(error, 'MongoMessageService.getChannelMessages')
    }
  }

  /**
   * Get messages for a user in their preferred language
   */
  async getChannelMessagesForUser(channelId: string, userId: string, limit: number = 50): Promise<Message[]> {
    try {
      if (!channelId || !userId) {
        throw new ValidationError('Channel ID and user ID are required')
      }

      const db = await getDatabase()

      // Get user's preferred language
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
      const userLanguage = user?.primaryLanguage || 'en'

      const messages = await db.collection('messages')
        .find({ channelId: new ObjectId(channelId) })
        .sort({ timestamp: 1 })
        .limit(Math.min(limit, 100))
        .toArray()

      return messages.map(msg => {
        const message = this.mapMongoMessageToMessage(msg)

        // Find translation for user's language
        const translation = msg.translations?.find((t: any) => t.targetLanguage === userLanguage)
        if (translation) {
          message.translations = [{
            messageId: message.id,
            targetLanguage: userLanguage,
            translatedContent: translation.translatedContent,
            createdAt: translation.createdAt
          }]
        }

        return message
      })
    } catch (error) {
      throw handleError(error, 'MongoMessageService.getChannelMessagesForUser')
    }
  }

  /**
   * Update message status
   */
  async updateMessageStatus(messageId: string, status: MessageStatus): Promise<void> {
    try {
      if (!messageId || !status) {
        throw new ValidationError('Message ID and status are required')
      }

      const validStatuses = Object.values(MESSAGE_STATUS)
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`Invalid status: ${status}`)
      }

      const db = await getDatabase()

      await db.collection('messages').updateOne(
        { _id: new ObjectId(messageId) },
        {
          $set: {
            status,
            updatedAt: new Date()
          }
        }
      )
    } catch (error) {
      throw handleError(error, 'MongoMessageService.updateMessageStatus')
    }
  }

  /**
   * Get a specific message by ID
   */
  async getMessageById(messageId: string): Promise<Message | null> {
    try {
      if (!messageId) {
        throw new ValidationError('Message ID is required')
      }

      const db = await getDatabase()

      const message = await db.collection('messages').findOne({ _id: new ObjectId(messageId) })

      return message ? this.mapMongoMessageToMessage(message) : null
    } catch (error) {
      throw handleError(error, 'MongoMessageService.getMessageById')
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      if (!messageId) {
        throw new ValidationError('Message ID is required')
      }

      const db = await getDatabase()

      await db.collection('messages').deleteOne({ _id: new ObjectId(messageId) })
    } catch (error) {
      throw handleError(error, 'MongoMessageService.deleteMessage')
    }
  }

  /**
   * Search messages in a channel
   */
  async searchMessages(channelId: string, query: string, limit: number = 20): Promise<Message[]> {
    try {
      if (!channelId || !query.trim()) {
        throw new ValidationError('Channel ID and search query are required')
      }

      const db = await getDatabase()

      const messages = await db.collection('messages')
        .find({
          channelId: new ObjectId(channelId),
          content: { $regex: query, $options: 'i' }
        })
        .sort({ timestamp: -1 })
        .limit(Math.min(limit, 50))
        .toArray()

      return messages.map(this.mapMongoMessageToMessage)
    } catch (error) {
      throw handleError(error, 'MongoMessageService.searchMessages')
    }
  }

  /**
   * Get message count for a channel
   */
  async getChannelMessageCount(channelId: string): Promise<number> {
    try {
      if (!channelId) {
        throw new ValidationError('Channel ID is required')
      }

      const db = await getDatabase()

      return await db.collection('messages').countDocuments({
        channelId: new ObjectId(channelId)
      })
    } catch (error) {
      throw handleError(error, 'MongoMessageService.getChannelMessageCount')
    }
  }

  /**
   * Map MongoDB document to Message type
   */
  private mapMongoMessageToMessage(doc: any): Message {
    return {
      id: doc._id.toString(),
      channelId: doc.channelId.toString(),
      senderId: doc.senderId.toString(),
      content: doc.content,
      sourceLanguage: doc.sourceLanguage,
      status: doc.status as MessageStatus,
      timestamp: doc.timestamp,
      translations: (doc.translations || []).map((t: any) => ({
        messageId: doc._id.toString(),
        targetLanguage: t.targetLanguage,
        translatedContent: t.translatedContent,
        createdAt: t.createdAt
      }))
    }
  }
}