/** Static trophy cutouts are served from dist in both dev and production. */
export const copyBadgeAssets = () => {
  Deno.mkdirSync('dist/badges', { recursive: true })
  for (const file of Deno.readDirSync('web/assets/badges')) {
    if (file.isFile && file.name.endsWith('.webp')) {
      Deno.copyFileSync(
        `web/assets/badges/${file.name}`,
        `dist/badges/${file.name}`,
      )
    }
  }
}
