import EmailScannerClient from './EmailScannerClient'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ success?: string; error?: string }>
}

export default async function EmailScannerPage({ searchParams }: Props) {
  const params = await searchParams
  return <EmailScannerClient searchParams={params} />
}
