import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

// In-memory cache: shields Supabase when Vercel edge cache is cold/missed
// Key: date string, Value: { data, ts }
const memCache = new Map<string, { data: unknown; ts: number }>()
const MEM_CACHE_TTL = 10_000 // 10 seconds in-process

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')

  if (!date) {
    return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 })
  }

  // Check in-memory cache first (protects Supabase even when Vercel edge cache misses)
  const cached = memCache.get(date)
  if (cached && Date.now() - cached.ts < MEM_CACHE_TTL) {
    return NextResponse.json(
      { availability: cached.data, source: 'mem-cache' },
      {
        headers: {
          // Tell Vercel/CDN to cache for 30s, serve stale up to 5 mins while refreshing
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
        },
      }
    )
  }

  try {
    const { data, error } = await supabase.rpc('get_slot_availability', {
      p_event_date: date,
    })

    if (error) {
      console.error('Slot availability error:', error)
      // If DB fails and we have stale cache, serve it anyway (better than crashing)
      if (cached) {
        return NextResponse.json(
          { availability: cached.data, source: 'stale-fallback' },
          { headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=60' } }
        )
      }
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
    }

    // Store in memory cache
    memCache.set(date, { data: data || [], ts: Date.now() })

    return NextResponse.json(
      { availability: data || [] },
      {
        headers: {
          // 30s CDN cache + serve stale for 5 mins while Vercel revalidates in background
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
        },
      }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    // Serve stale if available
    if (cached) {
      return NextResponse.json(
        { availability: cached.data, source: 'stale-fallback' },
        { headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=60' } }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
