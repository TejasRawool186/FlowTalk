import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getCommunityService } from '@/services'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id: communityId } = await params

        if (!communityId) {
            return NextResponse.json(
                { error: 'Community ID is required' },
                { status: 400 }
            )
        }

        const communityService = getCommunityService()

        // Check if already a member
        const isMember = await communityService.isUserMember(communityId, decoded.id)
        if (isMember) {
            return NextResponse.json(
                { error: 'Already a member of this community' },
                { status: 400 }
            )
        }

        // Add user to community
        await communityService.addUserToCommunity(communityId, decoded.id)

        return NextResponse.json({
            message: 'Successfully joined community'
        })
    } catch (error: any) {
        console.error('Join community error:', error)
        return NextResponse.json(
            { error: 'Failed to join community' },
            { status: 500 }
        )
    }
}
