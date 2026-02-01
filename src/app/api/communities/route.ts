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