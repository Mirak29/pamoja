import { useState } from 'preact/hooks'
import { navigate } from '@01edu/signal-router'
import { CircleAlert, Send } from '/web/assets/icons.tsx'
import { communities } from '/web/fixtures/communities.ts'
import { me } from '/web/fixtures/people.ts'
import type { PostType } from '/web/fixtures/posts.ts'
import { savePost } from '/web/lib/posts.ts'
import { videoOf } from '/api/video-links.ts'
import { MediaPicker, useMediaPicker } from '/web/ui/media.tsx'
import { VideoEmbed } from '/web/ui/video.tsx'
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
import { t } from '/web/lib/language.ts'
import { LIMITS } from '/api/limits.ts'
import { overLimit } from '/web/lib/limits.ts'

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
  // Uploaded as soon as they are picked (§17.3)
  const picker = useMediaPicker(4)
  const [video, setVideo] = useState('')
  const [sending, setSending] = useState(false)
  const link = video.trim()
  const badVideo = !!link && !videoOf(link)
  const { check, clear, control, field } = useFieldErrors<'title' | 'body'>(
    'post',
  )

  const publish = async () => {
    if (type === HELP || sending || picker.uploading || badVideo) return
    const valid = check({
      title: !title.trim() && 'Donne un titre à ton post.',
      body: !body.trim() && 'Écris le contenu du post.',
    })
    if (!valid || overLimit(title, 'postTitle') || overLimit(body, 'post')) {
      return
    }
    const joined = !community || me.communities.includes(community)
    setSending(true)
    const post = await savePost({
      community,
      type,
      title: title.trim(),
      body: body.trim(),
      media: picker.media,
      video: link || undefined,
    }).catch(() => undefined)
    setSending(false)
    if (!post) {
      notify({
        title: 'Post non publié',
        body: 'Réessaie dans un instant.',
        icon: CircleAlert,
        tone: 'warning',
      })
      return
    }
    const name = communities.find((c) => c.slug === community)?.name
    navigate({ href: `post/${post.id}` })
    notify({
      title: 'Post publié',
      body: name
        ? joined
          ? t`Dans ${name}.`
          : t`Dans ${name}, que tu rejoins au passage.`
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
            <Button size={36} href='help/new' class='self-start'>
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
                limit={LIMITS.postTitle}
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
                limit={LIMITS.post}
                placeholder='Markdown accepté. Code entre accents graves, blocs entre trois accents graves.'
                onInput={(event) => {
                  setBody(event.currentTarget.value)
                  clear('body')
                }}
                onPaste={picker.onPaste}
                compact
              />
            </Field>
            <div class='flex flex-col gap-2'>
              <span class='text-[13px] font-semibold'>Images (4 maximum)</span>
              <MediaPicker picker={picker} />
            </div>
            <Field
              label='Lien vidéo (facultatif)'
              error={badVideo
                ? 'Colle un lien YouTube, Loom ou Vimeo.'
                : undefined}
              errorId='post-video-error'
            >
              <Input
                type='url'
                value={video}
                placeholder='Lien YouTube, Loom ou Vimeo'
                aria-invalid={badVideo || undefined}
                aria-describedby={badVideo ? 'post-video-error' : undefined}
                onInput={(event) => setVideo(event.currentTarget.value)}
              />
            </Field>
            {link && !badVideo && <VideoEmbed url={link} />}
            <div class='flex flex-wrap gap-3.5 border-t border-line pt-[18px]'>
              <Button
                size={40}
                onClick={publish}
                aria-busy={sending}
                disabled={picker.uploading || badVideo}
              >
                {sending ? 'Publication…' : 'Publier'}
              </Button>
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
