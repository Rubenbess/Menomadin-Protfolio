import { requireAuth } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const auth = await requireAuth()
    if ('response' in auth) return auth.response
    const { supabase } = auth

    const { data, error } = await supabase
      .from('task_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error fetching template:', err)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const auth = await requireAuth()
    if ('response' in auth) return auth.response
    const { supabase, user } = auth

    // Verify ownership before allowing edits
    const { data: existing, error: fetchError } = await supabase
      .from('task_templates')
      .select('created_by')
      .eq('id', id)
      .single()
    if (fetchError || !existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    if (existing.created_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()

    const { data, error } = await supabase
      .from('task_templates')
      .update({
        name: body.name,
        description: body.description || null,
        category: body.category || 'other',
        template_content: body.template_content,
        is_public: body.is_public ?? true,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error updating template:', err)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const auth = await requireAuth()
    if ('response' in auth) return auth.response
    const { supabase, user } = auth

    // Verify ownership before allowing deletion
    const { data: existing, error: fetchError } = await supabase
      .from('task_templates')
      .select('created_by')
      .eq('id', id)
      .single()
    if (fetchError || !existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    if (existing.created_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase
      .from('task_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting template:', err)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
