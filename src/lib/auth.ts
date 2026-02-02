import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { ObjectId } from 'mongodb'
import { getDatabase } from './mongodb'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface User {
  _id: ObjectId
  email: string
  username: string
  primaryLanguage: string
  passwordHash: string
  avatar?: string
  status?: string
  createdAt: Date
  updatedAt: Date
}

export interface AuthUser {
  id: string
  email: string
  username: string
  primaryLanguage: string
  avatar?: string
  status?: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      primaryLanguage: decoded.primaryLanguage || 'en',
      // Note: jwt payload might not have avatar/status, so we rely on db fetch or profile endpoint for full details
      // But we can add them to token payload if we want fewer db hits. For now, rely on /api/auth/me
    }
  } catch (error) {
    return null
  }
}

export async function createUser(
  email: string,
  password: string,
  username: string,
  primaryLanguage: string = 'en'
): Promise<AuthUser> {
  const db = await getDatabase()

  // Check if user already exists
  const existingUser = await db.collection('users').findOne({ email })
  if (existingUser) {
    throw new Error('User already exists')
  }

  const passwordHash = await hashPassword(password)

  const result = await db.collection('users').insertOne({
    email,
    username,
    primaryLanguage,
    passwordHash,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  // Ensure user has access to default community
  await ensureUserCommunityAccess(result.insertedId.toString())

  return {
    id: result.insertedId.toString(),
    email,
    username,
    primaryLanguage
  }
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const db = await getDatabase()

  const user = await db.collection('users').findOne({ email }) as User | null
  if (!user) {
    return null
  }

  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) {
    return null
  }

  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    primaryLanguage: user.primaryLanguage,
    avatar: user.avatar,
    status: user.status
  }
}

export async function ensureUserCommunityAccess(userId: string): Promise<string> {
  const db = await getDatabase()
  const userObjectId = new ObjectId(userId)

  // Check if user is already a member of any community
  const existingMembership = await db.collection('communities').findOne({
    members: userObjectId
  })

  if (existingMembership) {
    return existingMembership._id.toString()
  }

  // Find or create default "General" community
  let generalCommunity = await db.collection('communities').findOne({ name: 'General' })

  if (!generalCommunity) {
    // Create default community
    const communityResult = await db.collection('communities').insertOne({
      name: 'General',
      description: 'Default community for all users',
      createdBy: userObjectId,
      members: [userObjectId],
      createdAt: new Date()
    })

    // Create default channel
    await db.collection('channels').insertOne({
      communityId: communityResult.insertedId,
      name: 'general',
      description: 'General discussion channel',
      createdAt: new Date()
    })

    return communityResult.insertedId.toString()
  } else {
    // Add user to existing General community
    await db.collection('communities').updateOne(
      { _id: generalCommunity._id },
      { $addToSet: { members: userObjectId } }
    )

    return generalCommunity._id.toString()
  }
}