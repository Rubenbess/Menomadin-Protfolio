export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Link expired
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          This update link has expired or been revoked. Please contact your
          Menomadin partner to request a new one.
        </p>
      </div>
    </div>
  )
}
