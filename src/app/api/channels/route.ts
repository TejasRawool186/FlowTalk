import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getCommunityService } from '@/services'

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
        const { communityId, name, description = '' } = body

        if (!communityId) {
            return NextResponse.json(
                { error: 'Community ID is required' },
                { status: 400 }
            )
        }

        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'Channel name is required' },
                { status: 400 }
            )
        }

        const communityService = getCommunityService()

        // Verify user is a member of the community
        const isMember = await communityService.isUserMember(communityId, decoded.id)
        if (!isMember) {
            return NextResponse.json(
                { error: 'You must be a member of this community to create channels' },
                { status: 403 }
            )
        }

        // Create the channel
        const channel = await communityService.createChannel(
            communityId,
            name.trim().toLowerCase().replace(/\s+/g, '-'),
            description
        )

        return NextResponse.json({
            channel,
            message: 'Channel created successfully'
        })
    } catch (error: any) {
        console.error('Create channel error:', error)
        return NextResponse.json(
            { error: 'Failed to create channel' },
            { status: 500 }
        )
    }
}
