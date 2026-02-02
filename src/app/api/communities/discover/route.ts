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
        const communities = await communityService.getAllCommunities()

        // Add membership info for current user
        const communitiesWithMembership = await Promise.all(
            communities.map(async (c) => ({
                ...c,
                isMember: await communityService.isUserMember(c.id, decoded.id)
            }))
        )

        return NextResponse.json({ communities: communitiesWithMembership })
    } catch (error: any) {
        console.error('Discover communities error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch communities' },
            { status: 500 }
        )
    }
}
