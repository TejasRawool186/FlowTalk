import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, generateToken } from '@/lib/auth'
import { initializeDatabase } from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    // Initialize database connection
    await initializeDatabase()
    
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const user = await authenticateUser(email, password)
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const token = generateToken(user)

    const response = NextResponse.json({
      user,
      token,
      message: 'Signed in successfully'
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
    console.error('Signin error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sign in' },
      { status: 500 }
    )
  }
}