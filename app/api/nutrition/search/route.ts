import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { query } = await request.json()

  if (!query?.trim()) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  }

  const appId  = process.env.NUTRITIONIX_APP_ID
  const appKey = process.env.NUTRITIONIX_API_KEY

  if (!appId || !appKey) {
    return NextResponse.json({ error: 'Nutritionix API not configured' }, { status: 500 })
  }

  const res = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-app-id':  appId,
      'x-app-key': appKey,
    },
    body: JSON.stringify({ query }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json(
      { error: (err as { message?: string }).message ?? 'Nutritionix request failed' },
      { status: res.status }
    )
  }

  const data = await res.json()
  return NextResponse.json(data)
}
