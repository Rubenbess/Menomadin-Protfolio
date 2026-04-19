import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { TaskStatus } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, status, priority, contact_id, pipeline_deal_id, company_id } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const taskData = {
      title: title.trim(),
      status: (status ?? 'To do') as TaskStatus,
      priority: priority ?? 'medium',
      contact_id: contact_id ?? null,
      pipeline_deal_id: pipeline_deal_id ?? null,
      company_id: company_id ?? null,
      description: null,
      due_date: null,
      start_date: null,
      internal_project_id: null,
      is_recurring: false,
      recurrence_rule_id: null,
      template_id: null,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select(`
        *,
        assignees:task_assignees(
          id,
          task_id,
          assigned_to,
          assigned_at,
          assigned_by,
          team_member:team_members(id, name, color)
        ),
        company:companies(id, name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: task })
  } catch (err) {
    console.error('[api/tasks/create]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
