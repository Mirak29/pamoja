import { url } from '@01edu/signal-router'
import { HelpDetail } from '/web/pages/help/help-detail.tsx'
import { HelpList } from '/web/pages/help/help-list.tsx'
import { NewHelp } from '/web/pages/help/new-help.tsx'

/** /help, /help/new and /help/:id */
export const HelpPage = () => {
  const [, id] = url.relativePath.slice(1).split('/')
  if (!id) return <HelpList />
  if (id === 'new') return <NewHelp key={url.value.search} />
  return <HelpDetail id={id} />
}
