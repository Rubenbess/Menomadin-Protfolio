import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'MISSING'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'MISSING'

  return NextResponse.json({
    supabase_url: url,
    anon_key_prefix: key.length > 10 ? key.slice(0, 20) + '…' : key,
    anon_key_length: key.length,
  })
}
