import { useState } from 'preact/hooks'
import { navigate } from '@01edu/signal-router'
import { Send, X } from '/web/assets/icons.tsx'
import { communities } from '/web/fixtures/communities.ts'
import { me } from '/web/fixtures/people.ts'
import { type PostType, publishPost } from '/web/fixtures/posts.ts'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Dialog } from '/web/ui/dialog.tsx'
import {
  Field,
  Input,
  Select,
  Textarea,
  useFieldErrors,
} from '/web/ui/input.tsx'
import { notify } from '/web/ui/toast.tsx'

const HELP = 'Demande d’aide'

const types: (PostType | typeof HELP)[] = [
  'Discussion',
  'Question',
  'Mise à jour de projet',
  HELP,
  'Vitrine',
  'Ressource',
  'Opportunité',
  'Release',
]

const NewPost = (
  { community: initial, type: initialType }: {
    community?: string
    type?: PostType
  },
) => {
  const [type, setType] = useState<PostType | typeof HELP>(
    initialType ?? 'Discussion',
  )
  // Same audience as the Accueil composer: the profile, unless the dialog
  // opens from a community page
  const [community, setCommunity] = useState(initial ?? '')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [images, setImages] = useState(0)
  const [video, setVideo] = useState('')
  const { check, clear, control, field } = useFieldErrors<'title' | 'body'>(
    'post',
  )

  const publish = () => {
    if (type === HELP) return
    const valid = check({
      title: !title.trim() && 'Donne un titre à ton post.',
      body: !body.trim() && 'Écris le contenu du post.',
    })
    if (!valid) return
    const joined = !community || me.communities.includes(community)
    const post = publishPost({
      community,
      type,
      title: title.trim(),
      body: body.trim(),
      images,
      video: video.trim() || undefined,
    }, me)
    const name = communities.find((c) => c.slug === community)?.name
    navigate({ href: `post/${post.id}` })
    notify({
      title: 'Post publié',
      body: name
        ? `Dans ${name}${joined ? '.' : ', que tu rejoins au passage.'}`
        : 'Sur ton profil. Tes abonnés le voient dans leur fil.',
      icon: Send,
      tone: 'verified',
    })
  }

  return (
    <div class='flex flex-col gap-[18px] px-6 pt-5 pb-6'>
      <div class='flex flex-col gap-2 text-[13px] font-semibold'>
        <span>Type</span>
        <div class='flex flex-wrap gap-2 pb-1'>
          {types.map((value) => (
            <OptionButton
              key={value}
              pressed={type === value}
              onClick={() => setType(value)}
            >
              {value}
            </OptionButton>
          ))}
        </div>
      </div>
      {type === HELP
        ? (
          <div class='slab-selected mr-2 flex flex-col gap-2.5 p-4'>
            <span class='text-[14px] leading-[22px]'>
              Une demande d’aide passe par le matching : Pamoja la propose aux 5
              développeurs qui correspondent le mieux.
            </span>
            <Button size={36} href='aide/nouvelle' class='self-start'>
              Ouvrir le formulaire d’aide
            </Button>
          </div>
        )
        : (
          <>
            <Field label='Communauté'>
              <Select
                value={community}
                onChange={(event) => setCommunity(event.currentTarget.value)}
              >
                <option value=''>Sans communauté</option>
                {communities.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                    {me.communities.includes(c.slug)
                      ? ''
                      : ' · tu la rejoindras'}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label='Titre' {...field('title')}>
              <Input
                {...control('title')}
                value={title}
                placeholder='Une phrase claire'
                onInput={(event) => {
                  setTitle(event.currentTarget.value)
                  clear('title')
                }}
              />
            </Field>
            <Field label='Contenu' {...field('body')}>
              <Textarea
                {...control('body')}
                rows={6}
                value={body}
                placeholder='Markdown accepté. Code entre accents graves, blocs entre trois accents graves.'
                onInput={(event) => {
                  setBody(event.currentTarget.value)
                  clear('body')
                }}
                compact
              />
            </Field>
            <div class='flex flex-col gap-2 text-[13px] font-semibold'>
              <span>Images (4 maximum)</span>
              <div class='grid grid-cols-4 gap-3 pb-1'>
                {[0, 1, 2, 3].map((i) =>
                  i < images
                    ? (
                      <div
                        key={i}
                        class='tile relative flex aspect-[4/3] items-end p-1.5'
                      >
                        <span class='rounded-sm bg-surface-100 px-1 py-px font-mono text-[10px] leading-[14px] font-medium text-ink-muted'>
                          capture-{i + 1}.png
                        </span>
                        <button
                          type='button'
                          aria-label='Retirer l’image'
                          onClick={() => setImages(images - 1)}
                          class='absolute top-1 right-1 flex size-[22px] cursor-pointer items-center justify-center rounded-sm border border-figure-edge bg-surface-100 text-ink'
                        >
                          <X class='size-3' />
                        </button>
                      </div>
                    )
                    : (
                      <button
                        key={i}
                        type='button'
                        onClick={() => setImages(Math.min(4, images + 1))}
                        class='aspect-[4/3] cursor-pointer rounded-md border border-dashed border-line-control text-[12px] leading-none font-medium text-ink-muted'
                      >
                        + Image
                      </button>
                    )
                )}
              </div>
            </div>
            <Field label='Lien vidéo (facultatif)'>
              <Input
                value={video}
                placeholder='Lien YouTube ou Loom'
                onInput={(event) => setVideo(event.currentTarget.value)}
              />
            </Field>
            <div class='flex flex-wrap gap-3.5 border-t border-line pt-[18px]'>
              <Button size={40} onClick={publish}>Publier</Button>
              <Button variant='secondary' size={40} params={{ dialog: null }}>
                Annuler
              </Button>
            </div>
          </>
        )}
    </div>
  )
}

/**
 * New post (?dialog=new-post), from the Create menu or a community, which
 * presets its community and the Question type.
 */
export const NewPostDialog = (
  { community, type }: { community?: string; type?: PostType },
) => (
  <Dialog id='new-post' title='Nouveau post' width={640}>
    <NewPost community={community} type={type} />
  </Dialog>
)
