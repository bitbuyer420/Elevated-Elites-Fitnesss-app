import { NextRequest, NextResponse } from 'next/server'

interface MuscleEntry { muscle_group: string; days_since: number }

export async function POST(request: NextRequest) {
  const { recentMuscles, goal, activityLevel } = (await request.json()) as {
    recentMuscles: MuscleEntry[]
    goal:          string
    activityLevel: string
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const muscleContext = recentMuscles.length
    ? recentMuscles.map(m => `${m.muscle_group}: ${m.days_since} day(s) since trained`).join('\n')
    : 'No recent training history'

  const prompt = `You are an elite personal trainer. Suggest today's optimal workout.

User profile:
- Goal: ${goal || 'general fitness'}
- Activity level: ${activityLevel || 'moderately active'}

Recent muscle training history:
${muscleContext}

Rules:
1. Prioritise muscle groups that are most recovered (3+ days rest)
2. Avoid muscles trained in the last 48 hours
3. Recommend compound movements first, isolation second
4. Keep it to 4-5 exercises

Respond with ONLY valid JSON in this exact format:
{
  "muscleGroups": ["chest", "triceps"],
  "exercises": [
    {"name": "Bench Press", "sets": 4, "reps": "8-10", "weight_suggestion": "moderate-heavy", "notes": "Focus on controlled descent"},
    {"name": "Incline Dumbbell Press", "sets": 3, "reps": "10-12", "weight_suggestion": "moderate", "notes": ""},
    {"name": "Tricep Pushdown", "sets": 3, "reps": "12-15", "weight_suggestion": "light-moderate", "notes": "Full extension"},
    {"name": "Overhead Tricep Extension", "sets": 3, "reps": "12-15", "weight_suggestion": "light", "notes": ""}
  ],
  "rationale": "Chest and triceps are fully recovered after 4 days. Compound movements first for maximum strength output."
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Claude API request failed' }, { status: 500 })
  }

  const data = await res.json()
  const text = data.content?.[0]?.text ?? ''

  try {
    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch {
    // Return raw if JSON parsing fails
    return NextResponse.json({ rationale: text, exercises: [], muscleGroups: [] })
  }
}
