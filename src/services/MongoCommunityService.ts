import { ObjectId } from 'mongodb'
import { getDatabase } from '@/lib/mongodb'
import { Community, Channel } from '@/types'

export class MongoCommunityService {
  /**
   * Get communities and channels for a user
   */
  async getUserCommunitiesWithChannels(userId: string): Promise<{
    communities: Community[]
    channels: Channel[]
  }> {
    try {
      const db = await getDatabase()
      const userObjectId = new ObjectId(userId)

      // Get communities where user is a member
      const communities = await db.collection('communities')
        .find({ members: userObjectId })
        .toArray()

      const communityIds = communities.map(c => c._id)

      // Get channels for these communities
      const channels = await db.collection('channels')
        .find({ communityId: { $in: communityIds } })
        .toArray()

      return {
        communities: communities.map(c => ({
          id: c._id.toString(),
          name: c.name,
          description: c.description,
          createdBy: c.createdBy.toString(),
          createdAt: c.createdAt
        })),
        channels: channels.map(ch => ({
          id: ch._id.toString(),
          communityId: ch.communityId.toString(),
          name: ch.name,
          description: ch.description,
          createdAt: ch.createdAt
        }))
      }
    } catch (error) {
      console.error('Error getting user communities:', error)
      throw error
    }
  }

  /**
   * Create a new community
   */
  async createCommunity(
    name: string,
    description: string,
    createdBy: string
  ): Promise<Community> {
    try {
      const db = await getDatabase()
      const createdByObjectId = new ObjectId(createdBy)

      const result = await db.collection('communities').insertOne({
        name,
        description,
        createdBy: createdByObjectId,
        members: [createdByObjectId],
        createdAt: new Date()
      })

      return {
        id: result.insertedId.toString(),
        name,
        description,
        createdBy,
        createdAt: new Date()
      }
    } catch (error) {
      console.error('Error creating community:', error)
      throw error
    }
  }

  /**
   * Create a new channel
   */
  async createChannel(
    communityId: string,
    name: string,
    description: string
  ): Promise<Channel> {
    try {
      const db = await getDatabase()

      const result = await db.collection('channels').insertOne({
        communityId: new ObjectId(communityId),
        name,
        description,
        createdAt: new Date()
      })

      return {
        id: result.insertedId.toString(),
        communityId,
        name,
        description,
        createdAt: new Date()
      }
    } catch (error) {
      console.error('Error creating channel:', error)
      throw error
    }
  }

  /**
   * Add user to community
   */
  async addUserToCommunity(communityId: string, userId: string): Promise<void> {
    try {
      const db = await getDatabase()

      await db.collection('communities').updateOne(
        { _id: new ObjectId(communityId) },
        { $addToSet: { members: new ObjectId(userId) } }
      )
    } catch (error) {
      console.error('Error adding user to community:', error)
      throw error
    }
  }

  /**
   * Remove user from community
   */
  async removeUserFromCommunity(communityId: string, userId: string): Promise<void> {
    try {
      const db = await getDatabase()

      await db.collection('communities').updateOne(
        { _id: new ObjectId(communityId) },
        { $pull: { members: new ObjectId(userId) } } as any
      )
    } catch (error) {
      console.error('Error removing user from community:', error)
      throw error
    }
  }
}