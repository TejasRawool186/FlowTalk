import { NextRequest, NextResponse } from 'next/server'
import { createUser, generateToken } from '@/lib/auth'
import { initializeDatabase } from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    // Initialize database connection
    await initializeDatabase()
    
    const { email, password, username, primaryLanguage } = await request.json()

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: 'Email, password, and username are required' },
        { status: 400 }
      )
    }

    const user = await createUser(email, password, username, primaryLanguage || 'en')
    const token = generateToken(user)

    const response = NextResponse.json({
      user,
      token,
      message: 'User created successfully'
    })

    // Set HTTP-only cookie for authentication
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 400 }
    )
  }
}