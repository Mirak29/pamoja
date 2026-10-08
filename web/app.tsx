import { Fragment, h, render } from 'preact'

Object.assign(globalThis, { h, Fragment })

const App = () => (
  <main class='min-h-screen flex items-center justify-center'>
    <h1 class='text-4xl font-bold'>Pamoja</h1>
  </main>
)

const root = document.getElementById('app')
if (!root) throw Error('unable to find root element #app')
render(<App />, root)
