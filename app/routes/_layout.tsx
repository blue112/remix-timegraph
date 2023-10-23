import { json } from '@remix-run/node'
import { Outlet, useLoaderData } from '@remix-run/react'
import { version } from '../../package.json'

export async function loader() {
  return json({
    version,
  })
}

export default function Index() {
  const { version } = useLoaderData<typeof loader>()

  return (
    <div className="h-full w-full flex flex-col">
      <main className="mb-auto mx-auto px-4 max-w-[80ch]">
        <Outlet />
      </main>
    </div>
  )
}
