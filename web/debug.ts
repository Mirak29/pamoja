// The Preact of the app: an unversioned npm:preact/debug pulled in a
// second, newer Preact that the debug checks hooked into instead
import 'preact/debug'

const es = new EventSource('/esbuild')
es.addEventListener('error', () => location.reload())
es.addEventListener('change', () => {
  // hook live reload with esbuild
  // https://esbuild.github.io/api/#live-reload
  es.close()
  location.reload()
})
addEventListener('beforeunload', () => es.close())

console.log('debug build')
