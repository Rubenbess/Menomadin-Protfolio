import { getLegalEntities } from '@/actions/legal-entities'
import LegalEntitiesSettings from '@/components/LegalEntitiesSettings'

export const dynamic = 'force-dynamic'

export default async function LegalEntitiesPage() {
  const { data: entities } = await getLegalEntities()

  return (
    <div className="page-container">
      <div className="page-header border-b border-neutral-200 dark:border-neutral-700 mb-6">
        <div>
          <h1 className="page-title">Legal Entities</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage the investment vehicles through which the fund deploys capital.
          </p>
        </div>
      </div>
      <div className="max-w-2xl">
        <LegalEntitiesSettings entities={entities} />
      </div>
    </div>
  )
}
