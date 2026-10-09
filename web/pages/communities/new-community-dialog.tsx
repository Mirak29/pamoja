import { useState } from 'preact/hooks'
import { navigate } from '@01edu/signal-router'
import { CircleAlert, Users } from '/web/assets/icons.tsx'
import {
  type CommunityType,
  createCommunity,
} from '/web/fixtures/communities.ts'
import { me } from '/web/fixtures/people.ts'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Dialog } from '/web/ui/dialog.tsx'
import { Field, Input, Textarea } from '/web/ui/input.tsx'
import { notify } from '/web/ui/toast.tsx'

const types: CommunityType[] = ['Technologie', 'Pays', 'Domaine']

const NewCommunity = () => {
  const [name, setName] = useState('')
  const [type, setType] = useState<CommunityType>('Technologie')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const create = () => {
    if (!name.trim()) return setError('Donne un nom à la communauté.')
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
      <Field label='Nom'>
        <Input
          value={name}
          placeholder='Rust, Mali Developers, Fintech…'
          onInput={(event) => setName(event.currentTarget.value)}
        />
      </Field>
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
      {error && (
        <div
          role='alert'
          class='flex items-center gap-2 text-[14px] text-danger'
        >
          <CircleAlert />
          {error}
        </div>
      )}
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
