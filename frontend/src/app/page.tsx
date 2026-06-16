'use client'

import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function Home() {
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const testConnection = async () => {
      const { data, error } = await supabase.from('test').select('*')

      console.log('DATA:', data)
      console.log('ERROR:', error)
    }

    testConnection()
  }, [])

  return <div>Open console to check Supabase</div>
}