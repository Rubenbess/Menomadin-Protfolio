import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const { data, error } = await supabase
      .from('task_templates')
      .insert([
        {
          name: body.name,
          description: body.description || null,
          category: body.category || 'other',
          template_content: body.template_content,
          is_public: body.is_public ?? true,
          created_by: user.id,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error creating template:', err)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
