import { Fragment, h, type JSX, render } from 'preact'
import { url } from '@01edu/signal-router'
import { SoclePage } from '/web/pages/socle.tsx'
import { AppLayout } from '/web/ui/layout.tsx'
import { UpcomingState } from '/web/ui/states.tsx'

Object.assign(globalThis, { h, Fragment })

// Pages by first path segment; each page reads the rest of its path
// (/projet/openpay-africa/pulse). A profile lives at /@login.
const routes: Record<string, () => JSX.Element | null> = {
  dev: SoclePage,
}

const App = () => {
  const path = url.relativePath.slice(1)
  const section = path.startsWith('@') ? '@' : path.split('/')[0]
  const Route = routes[section]
  return (
    <AppLayout>
      {Route ? <Route /> : <UpcomingState path={path} />}
    </AppLayout>
  )
}

const root = document.getElementById('app')
if (!root) throw Error('unable to find root element #app')
render(<App />, root)
root.style.opacity = '1'
