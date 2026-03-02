import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * POST /api/nutrition/log-photo
 *
 * Body: { image: string (base64), mediaType: string }
 *
 * Returns: { meal_type, description, foods: NixFood[] }
 */
export async function POST(request: NextRequest) {
  const { image, mediaType } = await request.json()

  if (!image) {
    return NextResponse.json({ error: 'Image is required' }, { status: 400 })
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', // use Sonnet for best vision accuracy
    max_tokens: 1024,
    system: `You are a nutrition AI with computer vision. Analyze the food in the image and return accurate nutritional data.

Respond with ONLY raw JSON — no markdown, no code fences, no explanation.

Rules:
- Identify every distinct food item visible
- Estimate portion sizes from visual cues (plate size, food density, typical servings)
- Use USDA nutritional values calibrated to the estimated portion
- Infer meal_type from the food types (eggs/toast → breakfast, salad/sandwich → lunch, pasta/steak → dinner, protein shake/banana → snack or pre_workout, etc.)
- If multiple foods, return each as a separate entry in foods array

Format:
{
  "meal_type": "lunch",
  "description": "Grilled chicken breast with rice and broccoli",
  "foods": [
    {
      "food_name": "Grilled Chicken Breast",
      "nf_calories": 248,
      "nf_protein": 46.5,
      "nf_total_carbohydrate": 0.0,
      "nf_total_fat": 5.4,
      "nf_dietary_fiber": 0.0,
      "nf_sodium": 111,
      "nf_sugars": 0.0,
      "serving_qty": 150,
      "serving_unit": "g"
    }
  ]
}`,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: (mediaType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: image,
          },
        },
        {
          type: 'text',
          text: 'Analyze this food image and return the nutritional breakdown as JSON.',
        },
      ],
    }],
  })

  const text = (message.content[0] as { text: string }).text.trim()

  try {
    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 })
  }
}
