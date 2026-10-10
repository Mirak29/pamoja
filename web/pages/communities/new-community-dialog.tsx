import { useState } from 'preact/hooks'
import { A, navigate } from '@01edu/signal-router'
import { Users } from '/web/assets/icons.tsx'
import {
  communityNamed,
  type CommunityType,
  createCommunity,
} from '/web/fixtures/communities.ts'
import { me } from '/web/fixtures/people.ts'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Dialog } from '/web/ui/dialog.tsx'
import { Field, Input, Textarea, useFieldErrors } from '/web/ui/input.tsx'
import { notify } from '/web/ui/toast.tsx'

const types: CommunityType[] = ['Technologie', 'Pays', 'Domaine']

const NewCommunity = () => {
  const [name, setName] = useState('')
  const [type, setType] = useState<CommunityType>('Technologie')
  const [description, setDescription] = useState('')
  const { check, clear, control, field } = useFieldErrors<'name'>(
    'community',
  )
  const existing = name.trim() ? communityNamed(name) : undefined
  const create = () => {
    const valid = check({
      name: !name.trim()
        ? 'Donne un nom à la communauté.'
        : existing && `La communauté ${existing.name} existe déjà.`,
    })
    if (!valid) return
    const community = createCommunity({
      name: name.trim(),
      type,
      description: description.trim() || 'Nouvelle communauté sur Pamoja.',
    }, me)
    navigate({ href: `communaute/${community.slug}` })
    notify({
      title: 'Communauté créée',
      body:
        'Tu en es le premier membre. Publie un premier post pour lancer la discussion.',
      icon: Users,
      tone: 'verified',
    })
  }
  return (
    <div class='flex flex-col gap-[18px] px-6 pt-5 pb-6'>
      <Field label='Nom' {...field('name')}>
        <Input
          {...control('name')}
          value={name}
          placeholder='Rust, Mali Developers, Fintech…'
          onInput={(event) => {
            setName(event.currentTarget.value)
            clear('name')
          }}
        />
      </Field>
      {existing && (
        <span class='-mt-2.5 flex flex-wrap items-center gap-2 text-[13px] text-ink-muted'>
          Une communauté porte déjà ce nom.
          <A
            href={`communaute/${existing.slug}`}
            params={{ dialog: null }}
            class='font-semibold'
          >
            Ouvrir {existing.name}
          </A>
        </span>
      )}
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
      <Field label='Description'>
        <Textarea
          rows={3}
          value={description}
          placeholder='De quoi on parle ici, et pour qui'
          onInput={(event) => setDescription(event.currentTarget.value)}
        />
      </Field>
      <div class='flex flex-wrap gap-3.5 border-t border-line pt-[18px]'>
        <Button size={40} onClick={create}>Créer la communauté</Button>
        <Button variant='secondary' size={40} params={{ dialog: null }}>
          Annuler
        </Button>
      </div>
    </div>
  )
}

/** New community (?dialog=new-community), from the list or the Create menu */
export const NewCommunityDialog = () => (
  <Dialog id='new-community' title='Nouvelle communauté' width={540}>
    <NewCommunity />
  </Dialog>
)
