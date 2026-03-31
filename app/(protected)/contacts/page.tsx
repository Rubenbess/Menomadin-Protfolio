import { createServerSupabaseClient } from '@/lib/supabase-server'
import ContactsClient from './ContactsClient'
import type { ContactInteraction, ContactWithCompany } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ContactsPage() {
  const supabase = await createServerSupabaseClient()

  const [contactsRes, companiesRes] = await Promise.all([
    supabase.from('contacts').select('*, companies(id,name)').order('name'),
    supabase.from('companies').select('id, name').order('name'),
  ])

  const contacts = (contactsRes.data ?? []) as ContactWithCompany[]
  const ids = contacts.map(c => c.id)

  const { data: interactions } = ids.length
    ? await supabase.from('contact_interactions').select('*').in('contact_id', ids).order('date', { ascending: false })
    : { data: [] }

  const interactionsByContact: Record<string, ContactInteraction[]> = {}
  for (const i of (interactions ?? []) as ContactInteraction[]) {
    if (!interactionsByContact[i.contact_id]) interactionsByContact[i.contact_id] = []
    interactionsByContact[i.contact_id].push(i)
  }

  return (
    <ContactsClient
      contacts={contacts}
      companies={companiesRes.data ?? []}
      interactionsByContact={interactionsByContact}
    />
  )
}
