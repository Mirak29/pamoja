import { optimize } from 'npm:svgo'
import { DOMParser } from 'npm:linkedom'
import { walk } from 'jsr:@std/fs@^1.0.24/walk'

// Same Lucide version as the prototype (docs/prototype/pamoja-v2.dc.html)
const LUCIDE_VERSION = '0.460.0'

const parseSvg = (svg) => new DOMParser().parseFromString(svg, 'text/xml')

const fileContent = [
  '// @ts-nocheck: No need to check since in preact no need to camelCase svg attributes',
  "import { Icon } from '/web/ui/icon-wrapper.tsx'",
  "import type { JSX } from 'preact'",
  "type IconProps = JSX.IntrinsicElements['svg']",
]

// Every name imported from icons.tsx in web/ is an icon to generate
const readImports = (await Array.fromAsync(walk('web')))
  .map(async (file) => {
    if (!file.isFile || !file.name.endsWith('.tsx')) return []
    const content = await Deno.readTextFile(file.path)
    const iconImportIndex = content.indexOf('/icons.tsx')
    if (iconImportIndex === -1) return []
    const importEnd = content.slice(0, iconImportIndex).lastIndexOf(`} from '`)
    if (importEnd === -1) return []
    const importStart = content.slice(0, importEnd).lastIndexOf(`import {`)
    return content.slice(importStart + `import {`.length, importEnd)
      .split(',').map((n) => n.trim())
  })

const icons = [
  ...new Set((await Promise.all(readImports)).flat().filter(Boolean)),
].sort()
  .map((n) =>
    n
      .replace(/([A-Z0-9])/g, (_, m) => `-${m.toLowerCase()}`)
      .slice(1)
  )

const getSvg = async (icon) => {
  const key = `svg:${LUCIDE_VERSION}:${icon}`
  const cached = localStorage.getItem(key)
  if (cached) return cached

  const res = await fetch(
    `https://raw.githubusercontent.com/lucide-icons/lucide/${LUCIDE_VERSION}/icons/${icon}.svg`,
  )
  if (!res.ok) throw Error(`unknown lucide icon: ${icon}`)
  console.log('downloading svg', { icon })
  const svg = await res.text()
  localStorage.setItem(key, svg)
  return svg
}

for (const icon of icons) {
  const svg = await getSvg(icon)
  const svgEl =
    parseSvg(optimize(svg, { floatPrecision: 2 }).data).documentElement
  const name = icon.charAt(0).toUpperCase() +
    icon.slice(1).replace(/-(.)/g, (_, k) => k.toUpperCase())
  fileContent.push(`
export const ${name} = (props: IconProps) => (
  <Icon {...props}>
    ${svgEl.innerHTML}
  </Icon>
)`)
}

Deno.writeTextFileSync('web/assets/icons.tsx', fileContent.join('\n'))

new Deno.Command('deno', { args: ['fmt', 'web/assets/icons.tsx'] })
  .outputSync()
