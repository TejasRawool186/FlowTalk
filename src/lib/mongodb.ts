import { MongoClient, Db } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'flowtalk'

let client: MongoClient
let db: Db

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (client && db) {
    return { client, db }
  }

  try {
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    db = client.db(MONGODB_DB_NAME)
    
    console.log('Connected to MongoDB successfully')
    return { client, db }
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error)
    throw error
  }
}

export async function getDatabase(): Promise<Db> {
  if (!db) {
    const connection = await connectToDatabase()
    return connection.db
  }
  return db
}

// Initialize collections and indexes
export async function initializeDatabase() {
  const database = await getDatabase()
  
  // Create indexes for better performance
  await database.collection('users').createIndex({ email: 1 }, { unique: true })
  await database.collection('users').createIndex({ username: 1 })
  
  await database.collection('messages').createIndex({ channelId: 1, timestamp: 1 })
  await database.collection('messages').createIndex({ senderId: 1 })
  
  await database.collection('communities').createIndex({ name: 1 })
  await database.collection('communities').createIndex({ members: 1 })
  
  await database.collection('channels').createIndex({ communityId: 1 })
  
  console.log('Database indexes created successfully')
}