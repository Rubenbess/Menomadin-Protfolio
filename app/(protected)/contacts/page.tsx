import { createServerSupabaseClient } from '@/lib/supabase-server'
import ContactsClient from './ContactsClient'

export const dynamic = 'force-dynamic'

export default async function ContactsPage() {
  const supabase = await createServerSupabaseClient()

  const [contactsRes, companiesRes] = await Promise.all([
    supabase
      .from('contacts')
      .select('*, companies(id,name)')
      .order('name'),
    supabase
      .from('companies')
      .select('id, name')
      .order('name'),
  ])

  return (
    <ContactsClient
      contacts={contactsRes.data ?? []}
      companies={companiesRes.data ?? []}
    />
  )
}
