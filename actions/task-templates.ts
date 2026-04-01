'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function createTaskTemplate(data: {
  name: string
  description?: string
  category: string
  template_content: Record<string, any>
}) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: template, error } = await supabase
    .from('task_templates')
    .insert([
      {
        name: data.name,
        description: data.description || null,
        category: data.category,
        template_content: data.template_content,
        created_by: user.id,
        is_public: true,
      },
    ])
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { data: template }
}

export async function deleteTaskTemplate(templateId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('task_templates')
    .delete()
    .eq('id', templateId)

  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { data: { success: true } }
}

export async function updateTaskTemplate(
  templateId: string,
  data: {
    name?: string
    description?: string
    category?: string
    template_content?: Record<string, any>
  }
) {
  const supabase = await createServerSupabaseClient()

  const { data: template, error } = await supabase
    .from('task_templates')
    .update(data)
    .eq('id', templateId)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { data: template }
}

export async function getTaskTemplates() {
  const supabase = await createServerSupabaseClient()

  const { data: templates, error } = await supabase
    .from('task_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }

  return { data: templates }
}
