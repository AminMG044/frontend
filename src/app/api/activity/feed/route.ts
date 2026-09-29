/**
 * Activity Feed API Route
 * Returns paginated activity feed items with optional filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ActivityFeedItem, ActivityFeedResponse, ActivityFeedFilters } from '@/types';

// Mock data - in production this would come from a database
const mockActivityItems: ActivityFeedItem[] = [
  {
    id: '1',
    type: 'announcement',
    creatorId: 'creator1',
    creatorName: 'John Creator',
    title: 'Going Live Tomorrow!',
    description: 'Join me for a special stream tomorrow at 8 PM EST',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: '2',
    type: 'tip',
    creatorId: 'creator1',
    creatorName: 'John Creator',
    title: 'Received a tip',
    amount: 25,
    isPublic: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '3',
    type: 'verification',
    creatorId: 'creator2',
    creatorName: 'Sarah Artist',
    title: 'Account Verified',
    description: 'Successfully verified as a professional artist',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: '4',
    type: 'live',
    creatorId: 'creator3',
    creatorName: 'Mike Gamer',
    title: 'Now Live',
    description: 'Streaming gameplay and Q&A session',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: '5',
    type: 'content',
    creatorId: 'creator1',
    creatorName: 'John Creator',
    title: 'New Video Released',
    description: 'Check out my latest tutorial on creating amazing content',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: '6',
    type: 'tip',
    creatorId: 'creator2',
    creatorName: 'Sarah Artist',
    title: 'Received a tip',
    amount: 100,
    isPublic: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: '7',
    type: 'announcement',
    creatorId: 'creator3',
    creatorName: 'Mike Gamer',
    title: 'Milestone Reached',
    description: 'Thank you for 1000 supporters!',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: '8',
    type: 'verification',
    creatorId: 'creator1',
    creatorName: 'John Creator',
    title: 'Tier Update',
    description: 'New supporter tier unlocked',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const type = searchParams.get('type') as ActivityFeedFilters['type'] | null;
    const creatorId = searchParams.get('creatorId') as ActivityFeedFilters['creatorId'] | null;

    // Filter items based on query parameters
    let filteredItems = [...mockActivityItems];

    if (type) {
      filteredItems = filteredItems.filter((item) => item.type === type);
    }

    if (creatorId) {
      filteredItems = filteredItems.filter((item) => item.creatorId === creatorId);
    }

    // Sort by creation date (newest first)
    filteredItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);

    const response: ActivityFeedResponse = {
      items: paginatedItems,
      total: filteredItems.length,
      page,
      pageSize,
      hasMore: endIndex < filteredItems.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 }
    );
  }
}
