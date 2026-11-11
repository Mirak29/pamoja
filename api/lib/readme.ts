// The first paragraphs of a README, without its headings, badges, code or
// HTML: the page shows no more, so the whole README never travels. Shared by
// the API (the "À propos" of a project) and the import preview (§16)
export const readmeSummary = (readme: string) =>
  readme.replace(/```[\s\S]*?```/g, '').replace(/<[^>]*>/g, '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) =>
      block && !block.startsWith('#') && !block.startsWith('![') &&
      !block.startsWith('[![') && !block.startsWith('<')
    )
    .join('\n\n').slice(0, 600)
