import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { snapshotFromEml, snapshotFromMsg } from '@/lib/email-snapshot'

/**
 * POST /api/tasks/emails
 *   FormData: { taskId, file, isPrivate? }
 *
 * This intentionally lives outside the server-actions surface. Server
 * actions in Next.js 15 ship an RSC payload alongside the result; if the
 * payload generation fails for any reason the client just sees an opaque
 * "An error occurred in the Server Components render" toast. A plain
 * route handler returns a JSON body we control end-to-end.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let formData: FormData
    try {
      formData = await req.formData()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Bad form data'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const taskId = formData.get('taskId')
    const file = formData.get('file')
    const isPrivate = formData.get('isPrivate') === 'true'

    if (typeof taskId !== 'string' || !taskId) {
      return NextResponse.json({ error: 'Missing taskId' }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const lower = file.name.toLowerCase()
    const isEml = lower.endsWith('.eml')
    const isMsg = lower.endsWith('.msg')
    if (!isEml && !isMsg) {
      return NextResponse.json(
        { error: 'Only .eml and .msg files are supported.' },
        { status: 400 }
      )
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File is larger than 25 MB.' },
        { status: 400 }
      )
    }

    const buf = Buffer.from(await file.arrayBuffer())

    let snapshot
    try {
      snapshot = isEml ? await snapshotFromEml(buf) : snapshotFromMsg(buf)
    } catch (e) {
      console.error('[api/tasks/emails] parse failed', e)
      const msg = e instanceof Error ? e.message : 'Failed to parse email file'
      return NextResponse.json(
        { error: `Parse error: ${msg}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('task_email_attachments')
      .insert({
        task_id: taskId,
        attached_by: user.id,
        is_private: isPrivate,
        ...snapshot,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[api/tasks/emails] insert failed', error)
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: data.id,
      subject: snapshot.subject,
    })
  } catch (e) {
    console.error('[api/tasks/emails] unexpected error', e)
    const msg = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
