/**
 * TDEE and macro calculation utilities.
 * Uses the Mifflin-St Jeor equation for BMR — more accurate than Harris-Benedict.
 */

export type Gender        = 'male' | 'female'
export type Goal          = 'bulk' | 'shred' | 'maintain' | 'recomp'
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:          1.20,
  lightly_active:     1.375,
  moderately_active:  1.55,
  very_active:        1.725,
}

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary:         'Sedentary',
  lightly_active:    'Lightly Active',
  moderately_active: 'Moderately Active',
  very_active:       'Very Active',
}

const GOAL_LABELS: Record<Goal, string> = {
  bulk:     'Bulk',
  shred:    'Shred',
  maintain: 'Maintain',
  recomp:   'Recomp',
}

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor.
 * @param weightKg - body weight in kilograms
 * @param heightCm - height in centimetres
 * @param age      - age in years
 */
export function calculateBMR(params: {
  gender:   Gender
  weightKg: number
  heightCm: number
  age:      number
}): number {
  const { gender, weightKg, heightCm, age } = params
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return gender === 'male' ? base + 5 : base - 161
}

/** Total Daily Energy Expenditure = BMR × activity multiplier */
export function calculateTDEE(params: {
  gender:        Gender
  weightKg:      number
  heightCm:      number
  age:           number
  activityLevel: ActivityLevel
}): number {
  const bmr = calculateBMR(params)
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[params.activityLevel])
}

/** Apply goal-based calorie adjustment to TDEE */
export function calculateTargetCalories(tdee: number, goal: Goal): number {
  switch (goal) {
    case 'bulk':     return Math.round(tdee + 400)
    case 'shred':    return Math.round(Math.max(tdee - 500, 1200))
    case 'maintain': return tdee
    case 'recomp':   return tdee
  }
}

/** Macro split based on target calories and body weight */
export function calculateMacros(params: {
  targetCalories: number
  weightKg:       number
  goal:           Goal
}): { protein: number; fat: number; carbs: number } {
  const { targetCalories, weightKg } = params

  // Protein: 2.2 g/kg (supports muscle retention across all goals)
  const protein = Math.round(weightKg * 2.2)
  // Fat: 0.9 g/kg (minimum essential fat intake)
  const fat     = Math.round(weightKg * 0.9)
  // Carbs: remainder
  const remaining = targetCalories - protein * 4 - fat * 9
  const carbs     = Math.max(0, Math.round(remaining / 4))

  return { protein, fat, carbs }
}

/** Convert lbs → kg */
export function lbsToKg(lbs: number): number {
  return Math.round(lbs / 2.20462 * 10) / 10
}

/** Convert feet + inches → cm */
export function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 30.48 + inches * 2.54) * 10) / 10
}

/** Convert kg → lbs (display) */
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10
}

/** Convert cm → feet and inches (display) */
export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = cm / 2.54
  return {
    ft:     Math.floor(totalInches / 12),
    inches: Math.round(totalInches % 12),
  }
}

// Re-export label maps for UI use
export { ACTIVITY_LABELS, GOAL_LABELS }
