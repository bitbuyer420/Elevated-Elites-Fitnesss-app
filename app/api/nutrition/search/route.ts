import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * POST /api/nutrition/search
 *
 * Body: { query: string }   e.g. "2 scrambled eggs with cheese"
 *
 * Returns Nutritionix-compatible shape so the frontend needs no changes:
 * { foods: NixFood[] }
 */
export async function POST(request: NextRequest) {
  const { query } = await request.json()

  if (!query?.trim()) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
  }

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001', // fast + cheap for lookups
    max_tokens: 1024,
    system: `You are a precise nutrition database. When given a food query, return a JSON array of food items with their nutritional values.

Always respond with ONLY a raw JSON array — no markdown, no explanation, no code fences.

Each item must have exactly these fields:
- food_name: string (descriptive name, e.g. "Scrambled Eggs")
- nf_calories: number (kcal, rounded to nearest whole number)
- nf_protein: number (grams, 1 decimal)
- nf_total_carbohydrate: number (grams, 1 decimal)
- nf_total_fat: number (grams, 1 decimal)
- nf_dietary_fiber: number (grams, 1 decimal)
- nf_sodium: number (milligrams, rounded)
- nf_sugars: number (grams, 1 decimal)
- serving_qty: number (e.g. 2)
- serving_unit: string (e.g. "large", "g", "oz", "cup")

If the query has multiple foods (e.g. "eggs and toast"), return one item per food.
Use standard USDA nutritional values. Be accurate.`,
    messages: [{ role: 'user', content: query }],
  })

  const text = (message.content[0] as { text: string }).text.trim()

  let foods: unknown[]
  try {
    foods = JSON.parse(text)
    if (!Array.isArray(foods)) foods = [foods]
  } catch {
    return NextResponse.json({ error: 'Could not parse nutrition data' }, { status: 500 })
  }

  return NextResponse.json({ foods })
}
