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

  if (contactsRes.error || companiesRes.error) {
    const msg = contactsRes.error?.message ?? companiesRes.error?.message ?? 'Unknown error'
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <p className="font-semibold mb-1">Couldn&apos;t load contacts</p>
          <p className="text-xs">{msg}</p>
        </div>
      </div>
    )
  }

  const contacts = (contactsRes.data ?? []) as ContactWithCompany[]
  const ids = contacts.map(c => c.id)

  const interactionsRes = ids.length
    ? await supabase.from('contact_interactions').select('*').in('contact_id', ids).order('date', { ascending: false })
    : { data: [], error: null }
  const interactions = interactionsRes.data ?? []
  // We don't fail the whole page on an interactions error — the contact list is
  // still useful — but log it so it isn't a totally silent miss.
  if (interactionsRes.error) {
    console.error('Failed to load contact interactions:', interactionsRes.error.message)
  }

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
