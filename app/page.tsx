import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Root — sends authenticated users to /dashboard, guests to /login
export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
