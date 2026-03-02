import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * POST /api/nutrition/log-natural
 *
 * Body: { query: string }   e.g. "2 eggs and toast for breakfast"
 *
 * Returns: { meal_type, foods: NixFood[] }
 */
export async function POST(request: NextRequest) {
  const { query } = await request.json()

  if (!query?.trim()) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  }

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `You are a nutrition AI. Parse the user's food description and return a single JSON object.

Infer the meal_type from context clues like "for breakfast", "lunch", "after gym", "before workout", "evening snack", time of day hints, etc.
If no meal context, default to "snack".

meal_type must be one of: breakfast, lunch, dinner, snack, pre_workout, post_workout

Return ONLY raw JSON — no markdown, no code fences, no explanation.

Format:
{
  "meal_type": "lunch",
  "foods": [
    {
      "food_name": "Grilled Chicken Breast",
      "nf_calories": 165,
      "nf_protein": 31.0,
      "nf_total_carbohydrate": 0.0,
      "nf_total_fat": 3.6,
      "nf_dietary_fiber": 0.0,
      "nf_sodium": 74,
      "nf_sugars": 0.0,
      "serving_qty": 100,
      "serving_unit": "g"
    }
  ]
}

Split compound entries into separate food items (e.g. "eggs and toast" = 2 items).
Use accurate USDA-calibrated values. Account for quantities mentioned.`,
    messages: [{ role: 'user', content: query }],
  })

  const text = (message.content[0] as { text: string }).text.trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 })
  }

  return NextResponse.json(parsed)
}
