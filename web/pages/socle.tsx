import type { ComponentChildren } from 'preact'
import { A } from '@01edu/signal-router'
import { useState } from 'preact/hooks'
import { GitPullRequest, LifeBuoy, Send } from '/web/assets/icons.tsx'
import { Avatar } from '/web/ui/avatar.tsx'
import {
  DemoBadge,
  NoticeBadge,
  SkillChip,
  type Status,
  StatusBadge,
  VerifiedBadge,
} from '/web/ui/badge.tsx'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Dialog, Drawer } from '/web/ui/dialog.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Field, Input, Select, Textarea } from '/web/ui/input.tsx'
import { Page } from '/web/ui/layout.tsx'
import { Plates } from '/web/ui/plates.tsx'
import { Progress } from '/web/ui/progress.tsx'
import { Cube, Diamond } from '/web/ui/shapes.tsx'
import { EmptyState, GhostSlab } from '/web/ui/states.tsx'
import { Tabs } from '/web/ui/tabs.tsx'
import { notify } from '/web/ui/toast.tsx'

const statusSamples: Status[] = [
  'open',
  'accepted',
  'review_submitted',
  'completed',
  'expired',
  'ci-failed',
  'review-waiting',
  'merged',
]

const swatches = [
  'surface-000',
  'surface-100',
  'surface-200',
  'line',
  'line-control',
  'ink',
  'ink-muted',
  'indigo',
  'indigo-soft',
  'verified',
  'warning',
  'danger',
]

// Outside the grid, a section keeps 8px on the right for its thickness
const Section = (
  { wide, children }: { wide?: boolean; children: ComponentChildren },
) => (
  <section
    class={`slab flex flex-col gap-[18px] p-[22px] ${wide ? 'mr-2' : ''}`}
  >
    {children}
  </section>
)

const Note = ({ children }: { children: ComponentChildren }) => (
  <span class='text-[14px] text-ink-muted'>{children}</span>
)

const levels = ['Débutant', 'Intermédiaire', 'Confirmé']

/** Living catalog of the isometric system, like /dev/docs in Tournament */
export const SoclePage = () => {
  const [level, setLevel] = useState('Intermédiaire')
  return (
    <Page title='Composants de base' class='flex flex-col gap-8 pt-5'>
      <div class='flex flex-col gap-2'>
        <Eyebrow>Socle · système isométrique</Eyebrow>
        <h1 class='font-display text-[34px] leading-10 font-bold tracking-[-.015em] text-pretty'>
          Composants de base
        </h1>
        <p class='max-w-[660px] text-pretty text-ink-muted'>
          Tout est un objet posé sur le sol isométrique. Les plaques portent le
          contenu, les touches s’enfoncent, les champs sont des puits, les
          personnes sont des disques, les projets des cubes. Trait plein :
          vérifié par GitHub. Trait pointillé : démo ou pas encore créé.
        </p>
      </div>
      <div class='mr-2 grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-8'>
        <Section>
          <Eyebrow>Plaque · carte</Eyebrow>
          <Note>
            Épaisseur de 8 px tracée à 30°, arêtes au trait. Au survol, la
            plaque se soulève.
          </Note>
          <A
            href='dev/socle'
            class='slab slab-lift mr-2 flex items-center gap-3 p-4 text-ink no-underline'
          >
            <Cube size={36} />
            <span class='flex flex-col'>
              <span class='font-display text-[16px] leading-[22px] font-semibold'>
                OpenPay Africa
              </span>
              <span class='text-[13px] text-ink-muted'>Survole-moi</span>
            </span>
          </A>
          <Eyebrow>Plaque fantôme · pas encore créée</Eyebrow>
          <GhostSlab class='p-4'>
            <Note>Une page ou un lien qui n’existe pas encore.</Note>
          </GhostSlab>
        </Section>
        <Section>
          <Eyebrow>Touches · boutons</Eyebrow>
          <div class='flex flex-wrap gap-3.5 pb-1'>
            <Button>Demander une review</Button>
            <Button variant='secondary'>Plus tard</Button>
            <Button variant='danger'>Se désister</Button>
          </div>
          <Note>Clique : la touche s’enfonce dans le sol.</Note>
          <Eyebrow>Puits · champs et onglets</Eyebrow>
          <Input
            value='Relire la PR #81'
            readOnly
            aria-label='Exemple de champ'
          />
          <Tabs
            label='Exemple d’onglets'
            current='pour-moi'
            tabs={[
              { key: 'pour-moi', label: 'Pour moi', href: 'dev/socle' },
              { key: 'mes-demandes', label: 'Mes demandes', href: 'dev/socle' },
              { key: 'acceptees', label: 'Acceptées', href: 'dev/socle' },
            ]}
          />
          <Progress value={14} max={20} label='Exemple de progression' />
        </Section>
        <Section>
          <Eyebrow>Objets · personnes, projets, états</Eyebrow>
          <div class='flex flex-wrap items-center gap-[18px]'>
            <Avatar name='Moussa Diallo' size={44} />
            <Cube size={44} />
            <span class='tile flex size-11 flex-none items-center justify-center text-verified'>
              <GitPullRequest class='size-[18px]' />
            </span>
            <span class='flex items-center gap-2.5'>
              <Diamond state='done' />
              <Diamond state='current' />
              <Diamond state='todo' />
            </span>
          </div>
          <Note>
            Disque : une personne. Cube : un projet. Tuile : un événement.
            Losange : un état (fait, en cours, à venir).
          </Note>
          <div class='flex flex-wrap gap-2'>
            <VerifiedBadge />
            <DemoBadge />
            <NoticeBadge>Page GitHub simulée</NoticeBadge>
            {statusSamples.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
          <Plates width={150} />
          <Note>
            Plaques : la seule illustration, en couverture de profil et sur les
            pages publiques (landing, 404).
          </Note>
        </Section>
        <Section>
          <Eyebrow>Puces et options</Eyebrow>
          <div class='flex flex-wrap gap-2'>
            <SkillChip match>Go</SkillChip>
            <SkillChip match>SQLite</SkillChip>
            <SkillChip>Concurrency</SkillChip>
          </div>
          <Note>En indigo : les skills que tu as.</Note>
          <div class='flex flex-wrap gap-2 pb-1'>
            {levels.map((value) => (
              <OptionButton
                key={value}
                pressed={value === level}
                onClick={() => setLevel(value)}
              >
                {value}
              </OptionButton>
            ))}
          </div>
          <Note>Une option choisie reste enfoncée.</Note>
        </Section>
      </div>
      <Section wide>
        <Eyebrow>Dialogues, panneaux et toasts</Eyebrow>
        <div class='flex flex-wrap gap-3.5 pb-1'>
          <Button variant='secondary' params={{ dialog: 'socle-dialog' }}>
            Ouvrir un dialogue
          </Button>
          <Button variant='secondary' params={{ dialog: 'socle-drawer' }}>
            Ouvrir un panneau
          </Button>
          <Button
            variant='secondary'
            onClick={() =>
              notify({
                title: 'Demande publiée',
                body: 'Envoyée aux développeurs qui correspondent le mieux.',
                icon: Send,
                tone: 'verified',
              })}
          >
            Afficher un toast
          </Button>
          <Button
            variant='secondary'
            onClick={() =>
              notify({
                title: 'Ce projet a besoin de toi',
                body:
                  'OpenPay Africa · PR #81 · Relire la gestion des transactions',
                icon: LifeBuoy,
                href: 'aide/h3',
                match: {
                  skills: ['Go', 'SQLite'],
                  score: 93,
                  duration: '~20 min',
                },
              })}
          >
            Toast de match
          </Button>
        </div>
      </Section>
      <Section wide>
        <Eyebrow>États vide et fantôme</Eyebrow>
        <GhostSlab>
          <EmptyState
            action={<Button href='aide/nouvelle'>Demander de l’aide</Button>}
          >
            Aucune demande pour l’instant. Une demande précise trouve plus vite
            la bonne personne.
          </EmptyState>
        </GhostSlab>
      </Section>
      <Section wide>
        <Eyebrow>Couleurs</Eyebrow>
        <div class='grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-x-3.5 gap-y-4'>
          {swatches.map((name) => (
            <div key={name} class='flex flex-col gap-1.5'>
              <span
                class='tile h-11'
                style={{ backgroundColor: `var(--${name})` }}
              />
              <span class='font-mono text-[11px] leading-[14px] text-ink-muted'>
                {name}
              </span>
            </div>
          ))}
        </div>
      </Section>
      <section class='slab mr-2 flex flex-col gap-2.5 p-[22px]'>
        <Eyebrow>Typographie</Eyebrow>
        <span class='font-display text-display-xl'>
          Your work is your profile
        </span>
        <span class='font-display text-heading'>Project Pulse</span>
        <span>Moussa a relu la PR #81 sur GitHub.</span>
        <span class='font-mono text-data'>15 / 20 · 93 / 100 · PR #81</span>
      </section>
      <Dialog id='socle-dialog' title='Rejoindre le projet' width={600}>
        <div class='flex flex-col gap-5 px-6 pt-[22px] pb-6'>
          <h2 class='font-display text-heading'>Rejoindre OpenPay Africa</h2>
          <Field label='Disponibilité'>
            <Select>
              <option>4 h par semaine</option>
            </Select>
          </Field>
          <Field label='Message pour Abdou'>
            <Textarea rows={3} placeholder='Ce que tu veux construire' />
          </Field>
          <div class='flex flex-wrap gap-3.5 border-t border-line pt-[18px]'>
            <Button size={40}>Envoyer la candidature</Button>
            <Button variant='secondary' size={40} params={{ dialog: null }}>
              Annuler
            </Button>
          </div>
        </div>
      </Dialog>
      <Drawer
        id='socle-drawer'
        label='Détail de la pull request'
        header={
          <span class='font-mono text-[14px] leading-5 font-medium text-ink-muted'>
            PR #81
          </span>
        }
      >
        <div class='flex flex-col gap-[18px] p-[22px]'>
          <h2 class='font-display text-[23px] leading-[29px] font-semibold'>
            Payment transaction handling
          </h2>
          <div class='flex flex-wrap gap-1.5'>
            <StatusBadge status='review-waiting' />
            <StatusBadge status='ci-ok' />
          </div>
        </div>
      </Drawer>
    </Page>
  )
}
