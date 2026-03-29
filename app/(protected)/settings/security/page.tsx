import SecurityClient from './SecurityClient'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ required?: string }>
}

export default async function SecurityPage({ searchParams }: Props) {
  const { required } = await searchParams
  return <SecurityClient required={required === '1'} />
}
