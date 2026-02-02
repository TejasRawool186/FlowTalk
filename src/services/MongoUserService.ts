import { ObjectId } from 'mongodb'
import { getDatabase } from '@/lib/mongodb'
import { UserProfile } from '@/types'
import { UserService } from './interfaces'
import { ValidationError, DatabaseError, handleError } from '@/lib/errors'

export class MongoUserService implements UserService {
    /**
     * Get public user profile by ID
     */
    async getUserProfile(userId: string): Promise<UserProfile | null> {
        try {
            if (!userId) {
                throw new ValidationError('User ID is required')
            }

            const db = await getDatabase()
            const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })

            if (!user) {
                return null
            }

            // Map to UserProfile, excluding sensitive data
            return {
                id: user._id.toString(),
                username: user.username,
                primaryLanguage: user.primaryLanguage || 'en',
                avatar: user.avatar,
                status: user.status,
                createdAt: user.createdAt
            }
        } catch (error) {
            throw handleError(error, 'MongoUserService.getUserProfile')
        }
    }
}
