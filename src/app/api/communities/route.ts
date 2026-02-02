import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getCommunityService } from '@/services'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const communityService = getCommunityService()
    const data = await communityService.getUserCommunitiesWithChannels(decoded.id)

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Communities API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch communities' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description = '' } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Community name is required' },
        { status: 400 }
      )
    }

    const communityService = getCommunityService()

    // Create community
    const community = await communityService.createCommunity(
      name.trim(),
      description,
      decoded.id
    )

    // Create default #general channel
    const channel = await communityService.createChannel(
      community.id,
      'general',
      'General discussion'
    )

    return NextResponse.json({
      community,
      channel,
      message: 'Community created successfully'
    })
  } catch (error: any) {
    console.error('Create community error:', error)
    return NextResponse.json(
      { error: 'Failed to create community' },
      { status: 500 }
    )
  }
}