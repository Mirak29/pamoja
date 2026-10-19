import { options, type VNode } from 'preact'
import { effect, signal } from '@preact/signals'

export type Language = 'fr' | 'en'
export type LanguagePreference = Language | 'system'

const fromSystem = (): Language => {
  const preferred =
    navigator.languages.find((candidate) =>
      candidate.toLowerCase().startsWith('en') ||
      candidate.toLowerCase().startsWith('fr')
    ) ?? navigator.language
  return preferred.toLowerCase().startsWith('en') ? 'en' : 'fr'
}

const stored = localStorage.getItem('language')
export const languagePreference = signal<LanguagePreference>(
  stored === 'fr' || stored === 'en' ? stored : 'system',
)
export const language = signal<Language>(
  languagePreference.peek() === 'system'
    ? fromSystem()
    : languagePreference.peek() as Language,
)

export const setLanguagePreference = (preference: LanguagePreference) => {
  languagePreference.value = preference
  if (preference === 'system') {
    localStorage.removeItem('language')
    language.value = fromSystem()
  } else {
    localStorage.setItem('language', preference)
    language.value = preference
  }
}

const updateFromSystem = () => {
  if (languagePreference.peek() === 'system') language.value = fromSystem()
}
globalThis.addEventListener('languagechange', updateFromSystem)
globalThis.addEventListener('storage', (event: StorageEvent) => {
  if (event.key !== 'language') return
  languagePreference.value = event.newValue === 'fr' || event.newValue === 'en'
    ? event.newValue
    : 'system'
  updateFromSystem()
})

effect(() => {
  document.documentElement.lang = language.value
})

// French remains the source language. Only interface copy and demo labels are
// translated; names, project content, and messages written by users stay as-is.
const english: Record<string, string> = {
  'À propos': 'About',
  'À propos de nous': 'About us',
  'A accepté': 'Accepted',
  'Acceptées par moi': 'Accepted by me',
  'Activité récente': 'Recent activity',
  'Accepter': 'Accept',
  'Accepter la demande': 'Accept request',
  'Accepter la review': 'Accept review',
  'Accès refusé': 'Access denied',
  'Accueil': 'Home',
  'Ajouter': 'Add',
  'Ajouter au board': 'Add to board',
  'Ajouter un membre': 'Add a member',
  'Ajouter une image': 'Add an image',
  'Ajouter une réponse': 'Add a reply',
  'Afficher les réponses': 'Show replies',
  'Ajouter la carte': 'Add card',
  'Ajouter un besoin': 'Add a need',
  'Ajouter un besoin puis Entrée': 'Add a need, then press Enter',
  'Ajouter un bloc de code': 'Add a code block',
  'Ajouter un skill': 'Add a skill',
  'Ajouter un skill (essaie « postgres »)': 'Add a skill (try “postgres”)',
  'Ajouter une image (4 maximum)': 'Add an image (up to 4)',
  'Ajouter une technologie': 'Add a technology',
  'Ajoutée au board': 'Added to the board',
  'Alertes GitHub et CI/CD, écrites par la plateforme':
    'GitHub and CI/CD alerts, posted by Pamoja',
  'Annonces du Propriétaire et des Mainteneurs':
    'Announcements from the owner and maintainers',
  'Aucun autre développeur correspondant pour l’instant.':
    'No other matching developers yet.',
  'Aucun développeur ne dépasse le score minimum pour l’instant. La demande reste visible dans Aide.':
    'No developers meet the minimum score yet. The request remains visible in Help.',
  'Aucune candidature en attente': 'No pending applications',
  'Aucune demande dans tes projets.': 'No requests in your projects.',
  'Aucune demande ne correspond à tes skills': 'No requests match your skills',
  'Aucune demande ouverte ne correspond à tes skills pour l’instant.':
    'No open requests match your skills yet.',
  'Aucune good first issue ouverte pour l’instant.':
    'There are no open good first issues yet.',
  'Aucune issue ouverte. Tout est fermé sur GitHub.':
    'No open issues. Everything is closed on GitHub.',
  'Aucune PR en attente': 'No pending pull requests',
  'Aucune release pour l’instant.': 'No releases yet.',
  'Aucune review pour l’instant': 'No reviews yet',
  'Aucune techno connue ne ressemble à ça.':
    'No known technology matches that.',
  'Aucune demande ouverte pour l’instant.': 'No open requests yet.',
  'Cette aide t’a été utile ?': 'Was this help useful?',
  'Cette demande a été annulée.': 'This request was cancelled.',
  'Cette demande est ouverte.': 'This request is open.',
  'Ce qui pose problème': 'What is the problem?',
  'Ce dont tu as besoin, en une phrase': 'What you need, in one sentence',
  'Ce que fait le projet, en une ou deux phrases':
    'What the project does, in one or two sentences',
  'Ce que tu aimerais faire sur le projet':
    'What you would like to do on the project',
  'Ce que tu construis, en une phrase':
    'What you are building, in one sentence',
  'Ce que tu veux construire': 'What you want to build',
  'Ce retour de GitHub a déjà servi. Recommence la connexion.':
    'This GitHub response has already been used. Sign in again.',
  'Choisis au moins une façon d’aider.': 'Choose at least one way to help.',
  'Choisis au moins une technologie.': 'Choose at least one technology.',
  'Choisis la PR à relire.': 'Choose a pull request to review.',
  'Choisis un de tes repos publics :':
    'Choose one of your public repositories:',
  'Choisis un motif.': 'Choose a reason.',
  'Code review': 'Code review',
  'Comment veux-tu aider ?': 'How would you like to help?',
  'Commentaire (facultatif)': 'Comment (optional)',
  'Contexte, ce que tu as essayé, ce que tu attends':
    'Context, what you tried, and what you expect',
  'Continuer avec GitHub': 'Continue with GitHub',
  'Continuer vers GitHub': 'Continue to GitHub',
  'Candidature acceptée': 'Application accepted',
  'Candidature envoyée': 'Application submitted',
  'Candidature refusée': 'Application declined',
  'Catégories de notifications': 'Notification categories',
  'Demandes d’aide du projet et leurs échanges':
    'Project help requests and conversations',
  'Demande envoyée': 'Request sent',
  'Demande introuvable': 'Request not found',
  'Détail de la pull request': 'Pull request details',
  'Dialogues, panneaux et toasts': 'Dialogs, panels, and toasts',
  'Discussions de l’équipe': 'Team discussions',
  'Donne un nom à la communauté.': 'Give the community a name.',
  'Donne un nom à ton projet.': 'Give your project a name.',
  'Donne un titre à ta demande.': 'Give your request a title.',
  'Donne un titre à ton post.': 'Give your post a title.',
  'Écris le contenu du post.': 'Write the post content.',
  'Écrit dans #général et #aide, prend des cartes du board.':
    'Posts in #general and #help, and moves cards on the board.',
  'Elle arrive avec l’API : rien n’est supprimé pour l’instant.':
    'This will be available with the API. Nothing is deleted yet.',
  'Envoyée aux développeurs qui correspondent le mieux.':
    'Sent to the developers with the best match.',
  'Expirée : 7 jours sans acceptation': 'Expired: not accepted within 7 days',
  'Export téléchargé': 'Export downloaded',
  'Fermée : aide jugée pas utile': 'Closed: the help was not useful',
  'Fermée : non confirmée sous 7 jours': 'Closed: not confirmed within 7 days',
  'Gère le projet, ses réglages et la synchro.':
    'Manages the project, its settings, and syncing.',
  'GitHub a refusé le code de connexion, déjà utilisé ou trop ancien. Recommence.':
    'GitHub rejected the sign-in code because it was used or expired. Try again.',
  'GitHub confirme la review : elle devient une preuve vérifiée sur son profil.':
    'GitHub confirms the review, adding verified proof to their profile.',
  'GitHub limite le nombre de lectures par heure et la limite est atteinte. Réessaie dans quelques minutes.':
    'GitHub hourly read limit reached. Try again in a few minutes.',
  'GitHub n’a pas renvoyé l’installation. Recommence depuis le projet.':
    'GitHub did not return the installation. Start again from the project.',
  'GitHub n’a pas renvoyé ton profil. Réessaie dans un instant.':
    'GitHub did not return your profile. Try again in a moment.',
  'Glisse une carte d’une colonne à l’autre, ou utilise les flèches. Une PR mergée passe sa carte en Terminé.':
    'Drag a card between columns or use the arrow buttons. Merged pull requests move to Done.',
  'Importer depuis GitHub ou créer de zéro':
    'Import from GitHub or create from scratch',
  'Installe l’app depuis le compte GitHub avec lequel tu te connectes à Pamoja.':
    'Install the app from the GitHub account you use to sign in to Pamoja.',
  'Invitation envoyée': 'Invitation sent',
  'Je cherche un regard extérieur sur la gestion des transactions : verrouillage SQLite, rollback quand le callback échoue, et comportement sous accès concurrents.':
    'I would like an outside perspective on transaction handling: SQLite locking, rollback when a callback fails, and behavior under concurrent access.',
  'L’auteur pourra accepter la réponse qui l’a aidé.':
    'The author can accept the reply that helped them.',
  'L’équipe de modération va l’examiner. Merci.':
    'The moderation team will review this. Thank you.',
  'L’image PNG 1200 × 630 arrive avec la génération côté serveur.':
    'The 1200 × 630 PNG will be generated by the server.',
  'L’installation a commencé dans un autre navigateur ou une fenêtre privée. Relance-la d’ici, depuis le projet.':
    'Installation started in another browser or a private window. Restart it here from the project.',
  'La connexion a commencé dans un autre navigateur ou une fenêtre privée. Recommence ici.':
    'Sign-in started in another browser or a private window. Start again here.',
  'La page de connexion a expiré : plus de 10 minutes ont passé. Recommence.':
    'The sign-in page expired after 10 minutes. Start again.',
  'La synchro live reste désactivée : un contrôle n’est pas passé.':
    'Live sync remains disabled because a check failed.',
  'Le compte GitHub qui installe l’app est celui connecté à Pamoja.':
    'The GitHub account installing the app must be the one signed in to Pamoja.',
  'Le post apparaît dans le fil de tes abonnés.':
    'The post appears in your followers’ feed.',
  'Le post n’apparaît plus dans ton fil.':
    'The post no longer appears in your feed.',
  'Le retour de GitHub a expiré : plus de 10 minutes ont passé. Relance la synchro live depuis le projet.':
    'The GitHub response expired after 10 minutes. Restart live sync from the project.',
  'Lecture périodique de l’API GitHub, sans installation.':
    'Periodic reads from the GitHub API, with no installation required.',
  'Lecture seule : rejoins le projet pour déplacer les cartes.':
    'Read only: join the project to move cards.',
  'Les PRs, reviews et CI arrivent maintenant en temps réel.':
    'Pull requests, reviews, and CI updates now arrive in real time.',
  'Les trois contrôles sont passés : la synchro live est active.':
    'All three checks passed. Live sync is active.',
  'Libérer la demande': 'Release request',
  'Lien copié': 'Link copied',
  'Lit les canaux sans écrire.': 'Reads channels without posting.',
  'M’aider à débugger': 'Help me debug',
  'Markdown accepté. Code entre accents graves, blocs entre trois accents graves.':
    'Markdown is supported. Wrap inline code in backticks and code blocks in three backticks.',
  'Marquer comme livrée': 'Mark as delivered',
  'Me désister': 'Withdraw',
  'Merge, écrit dans #annonces, traite les candidatures.':
    'Merges pull requests, posts in #announcements, and handles applications.',
  'Mise à jour de projet': 'Project update',
  'Mon profil Pamoja : mes reviews et contributions, vérifiées par GitHub.':
    'My Pamoja profile: my reviews and contributions, verified by GitHub.',
  'Moussa, à Abidjan, accepte et relit la PR directement sur GitHub.':
    'Moussa in Abidjan accepts and reviews the pull request on GitHub.',
  'Nouvelle communauté sur Pamoja.': 'New community on Pamoja.',
  'Où il va': 'Where it is going',
  'Où va le projet, en une phrase':
    'Where the project is headed, in one sentence',
  'Oui, elle m’a aidé': 'Yes, it helped me',
  'Pamoja détectera automatiquement sa review sur GitHub.':
    'Pamoja will automatically detect their review on GitHub.',
  'Pamoja n’a pas pu créer le projet. Vérifie que le repo est bien à toi, puis réessaie.':
    'Pamoja could not create the project. Check that you own the repository, then try again.',
  'Pamoja n’a pas pu lire GitHub. Réessaie dans un instant.':
    'Pamoja could not read GitHub. Try again in a moment.',
  'Pamoja n’a pas pu vérifier l’installation. Relance la synchro live depuis le projet.':
    'Pamoja could not verify the installation. Restart live sync from the project.',
  'Pamoja trouve les 5 développeurs qui correspondent le mieux, et explique pourquoi.':
    'Pamoja finds the five best-matching developers and explains why.',
  'Pamoja vérifie trois choses : ton identité, le repo couvert et ton droit admin.':
    'Pamoja checks your identity, repository access, and admin permission.',
  'Pas de description détaillée.': 'No detailed description.',
  'Pas de README : la description du projet se complète après l’import.':
    'No README: the project description can be completed after import.',
  'Pas de repo lié : les langages viendront de GitHub.':
    'No linked repository: languages will come from GitHub.',
  'Passer au thème clair': 'Switch to light theme',
  'Passer au thème sombre': 'Switch to dark theme',
  'Possible après 72 h sans activité de l’aidant.':
    'Available after 72 hours without activity from the helper.',
  'Post enregistré': 'Post saved',
  'Post publié': 'Post published',
  'PR à relire': 'Pull request to review',
  'Pré-rempli depuis l’alerte CI de #suivi':
    'Pre-filled from the CI alert in #activity',
  'Première colonne': 'First column',
  'Profil enregistré': 'Profile saved',
  'Projet créé': 'Project created',
  'Projet importé': 'Project imported',
  'Proposition envoyée': 'Proposal sent',
  'PRs à relire': 'Pull requests to review',
  'Réglages du projet mis à jour': 'Project settings updated',
  'Réglages enregistrés': 'Settings saved',
  'Rejoins des communautés pour voir leurs discussions ici.':
    'Join communities to see their discussions here.',
  'Rejoins le projet pour écrire ici. Les abonnés lisent #suivi et #annonces.':
    'Join the project to post here. Followers can read #activity and #announcements.',
  'Relit les PRs et reçoit les demandes de review.':
    'Reviews pull requests and receives review requests.',
  'Repo lié': 'Linked repository',
  'Répondre en fil': 'Reply in thread',
  'Réponse acceptée': 'Reply accepted',
  'Republication retirée': 'Repost removed',
  'Résumé quotidien': 'Daily digest',
  'Retiré des enregistrés': 'Removed from saved items',
  'Retirer des enregistrés': 'Remove from saved items',
  'Review reçue': 'Review received',
  'S’est désisté': 'Withdrew',
  'Sections de la communauté': 'Community sections',
  'Seuls le Propriétaire et les Mainteneurs écrivent dans #annonces.':
    'Only the owner and maintainers can post in #announcements.',
  'Signalement envoyé': 'Report submitted',
  'Suis des développeurs et des projets pour remplir ce fil.':
    'Follow developers and projects to fill this feed.',
  'Sur ton profil. Tes abonnés le voient dans leur fil.':
    'On your profile. Your followers can see it in their feed.',
  'Synchro live réactivée': 'Live sync re-enabled',
  'Synchro passée à toutes les 15 min': 'Sync set to every 15 minutes',
  'Synchro toutes les 15 min. Active la synchro live pour recevoir PRs, reviews et CI en temps réel.':
    'Syncs every 15 minutes. Enable live sync to receive pull request, review, and CI updates in real time.',
  'Téléchargement bientôt disponible': 'Download coming soon',
  'Temps réel via la GitHub App : PRs, reviews, CI et releases arrivent dans #suivi en quelques secondes.':
    'Real time via the GitHub App: pull requests, reviews, CI, and releases appear in #activity within seconds.',
  'Ton profil est prêt. Importe le projet depuis « Créer ».':
    'Your profile is ready. Import a project from “Create”.',
  'Ton profil est prêt. Les demandes qui te correspondent arrivent dans ton fil.':
    'Your profile is ready. Matching requests will appear in your feed.',
  'Tous tes repos publics sont déjà sur Pamoja.':
    'All your public repositories are already on Pamoja.',
  'Trois contrôles avant d’activer la synchro live…':
    'Three checks before enabling live sync…',
  'Tu as accepté. Fais ta review sur GitHub : Pamoja la détectera.':
    'You accepted. Review it on GitHub and Pamoja will detect it.',
  'Tu as accepté. Marque l’aide comme livrée quand c’est fait.':
    'You accepted. Mark the help as delivered when you are done.',
  'Tu as republié': 'You reposted',
  'Tu cherches toi-même dans Aide et Explorer.':
    'You search for requests in Help and Explore.',
  'Tu fais partie des développeurs notifiés pour cette demande.':
    'You are one of the developers notified about this request.',
  'Tu le retrouves dans Enregistrés.': 'You can find it in Saved items.',
  'Tu n’as accepté aucune demande pour l’instant.':
    'You have not accepted any requests yet.',
  'Tu n’as pas encore demandé d’aide. Une PR qui attend ? Demande une review.':
    'You have not asked for help yet. Have a pull request waiting? Request a review.',
  'Tu peux le suivre à nouveau depuis sa page.':
    'You can follow it again from its page.',
  'Tu peux rouvrir la demande avec les mêmes données.':
    'You can reopen the request with the same details.',
  'Tu seras notifié quand l’aide sera livrée.':
    'You will be notified when the help is delivered.',
  'Tu t’es désisté de cette demande. Elle est proposée à d’autres développeurs.':
    'You withdrew from this request. It is now offered to other developers.',
  'Un récapitulatif chaque matin à 8 h.': 'A summary every morning at 8 a.m.',
  'Une notification dès qu’une demande te correspond.':
    'A notification whenever a request matches you.',
  'Vocabulaire contrôlé : Pamoja propose le nom exact de la techno.':
    'Controlled vocabulary: Pamoja suggests the exact technology name.',
  'Vocabulaire contrôlé : Pamoja propose le nom exact du skill.':
    'Controlled vocabulary: Pamoja suggests the exact skill name.',
  'Voir l’équipe': 'View team',
  '↑ ↓ : choisir · Entrée : ouvrir': '↑ ↓: select · Enter: open',
  'Aide': 'Help',
  'Aide livrée': 'Help delivered',
  'Aide reçue': 'Help received',
  'Annuler': 'Cancel',
  'Annuler la demande': 'Cancel request',
  'Aperçu': 'Overview',
  'Aperçu d’un profil': 'Profile preview',
  'Aperçu du lien': 'Link preview',
  'Aperçu en direct': 'Live preview',
  'App': 'App',
  'Archiver': 'Archive',
  'Architecture': 'Architecture',
  'Aucune demande': 'No requests',
  'Aucun résultat': 'No results',
  'Aucun projet': 'No projects',
  'Aucun projet lié à cette communauté pour l’instant.':
    'No projects are linked to this community yet.',
  'Aucun projet ne correspond à ces filtres.':
    'No projects match these filters.',
  'Aucune PR': 'No pull requests',
  'Aucun résultat pour cette recherche.': 'No results for this search.',
  'Aucune notification pour l’instant.': 'No notifications yet.',
  'Aucune communauté pour l’instant.': 'No communities yet.',
  'Auteur': 'Author',
  'Badges': 'Badges',
  'Besoin': 'Need',
  'Besoins': 'Needs',
  'Bienvenue': 'Welcome',
  'Bienvenue sur Pamoja': 'Welcome to Pamoja',
  'Branche': 'Branch',
  'Board': 'Board',
  'Brouillon': 'Draft',
  'Canaux': 'Channels',
  'Captures et démo': 'Screenshots and demo',
  'Ce projet a besoin de toi': 'This project needs you',
  'Ce que tu proposes': 'What you offer',
  'Ce que tu cherches': 'What you’re looking for',
  'Changer de langue': 'Change language',
  'Choisir une PR': 'Choose a pull request',
  'Clair': 'Light',
  'Code': 'Code',
  'Collaborations': 'Collaborations',
  'Communauté': 'Community',
  'Communauté introuvable': 'Community not found',
  'Communautés': 'Communities',
  'Connexion': 'Sign in',
  'Connexion à GitHub': 'Sign in with GitHub',
  'Contenu supprimé.': 'Content removed.',
  'Continuer': 'Continue',
  'Créer': 'Create',
  'Créer de zéro': 'Create from scratch',
  'Créer la communauté': 'Create community',
  'Créer le projet': 'Create project',
  'Créer un post': 'Create a post',
  'Créer une demande': 'Create a request',
  'D’accord': 'Got it',
  'Dashboard': 'Dashboard',
  'Date': 'Date',
  'De quoi parle ce post ?': 'What is this post about?',
  'Demande acceptée': 'Request accepted',
  'Demande annulée': 'Request cancelled',
  'Demande d’aide': 'Help request',
  'Demande d’aide publiée': 'Help request published',
  'Demande libérée': 'Request released',
  'Demande mise de côté': 'Request set aside',
  'Demande publiée': 'Request published',
  'Demande rouverte': 'Request reopened',
  'Demander': 'Ask',
  'Demander de l’aide': 'Ask for help',
  'Demander une review': 'Request a review',
  'Désactiver': 'Disable',
  'Détail': 'Details',
  'Déjà prise': 'Already taken',
  'Déconnexion': 'Sign out',
  'Déconnecté': 'Signed out',
  'Décrivez votre projet': 'Describe your project',
  'Désolé, ce lien est invalide.': 'Sorry, this link is invalid.',
  'Disponibilité': 'Availability',
  'Discussion': 'Discussion',
  'Donnée de démo': 'Demo data',
  'Données': 'Data',
  'Durée estimée': 'Estimated duration',
  'Écrire un post': 'Write a post',
  'Écrire une réponse (Markdown, `code`)': 'Write a reply (Markdown, `code`)',
  'E-mail': 'Email',
  'En attente': 'Pending',
  'En attente de review': 'Awaiting review',
  'En cours': 'In progress',
  'Enregistré': 'Saved',
  'Enregistrés': 'Saved items',
  'Envoyer': 'Send',
  'Envoyer la candidature': 'Submit application',
  'Envoyer la proposition': 'Send proposal',
  'Envoyer la réponse': 'Send reply',
  'Envoyer le signalement': 'Submit report',
  'Équipe': 'Team',
  'Erreur': 'Error',
  'État': 'Status',
  'États vide et fantôme': 'Empty and placeholder states',
  'Explorer': 'Explore',
  'Explorer les projets': 'Explore projects',
  'Fermer': 'Close',
  'Fil': 'Feed',
  'Fil de discussion': 'Thread',
  'Filtrer': 'Filter',
  'Fonctionnalités': 'Features',
  'Général': 'General',
  'GitHub': 'GitHub',
  'Historique': 'History',
  'Ils pourraient aider': 'They could help',
  'Images (4 maximum)': 'Images (up to 4)',
  'Importer depuis GitHub': 'Import from GitHub',
  'Informations': 'Information',
  'Issues': 'Issues',
  'Issues · synchronisées depuis GitHub': 'Issues · synced from GitHub',
  'Journal du projet': 'Project activity',
  'Langages': 'Languages',
  'Langue': 'Language',
  'Langue de l’interface': 'Interface language',
  'Le contexte, ce que tu attends, le temps que ça prendrait':
    'Context, what you expect, and how long it might take',
  'Le pays où tu vis': 'The country where you live',
  'Lien vidéo (facultatif)': 'Video link (optional)',
  'Lire la vidéo de démo': 'Watch the demo video',
  'Liste': 'List',
  'Lu sur GitHub · à valider': 'Read from GitHub · needs verification',
  'Matching': 'Matching',
  'Mes demandes': 'My requests',
  'Mes projets': 'My projects',
  'Mes skills': 'My skills',
  'Milestone en cours': 'Current milestone',
  'Mode de synchro': 'Sync mode',
  'Modération': 'Moderation',
  'Motif': 'Reason',
  'Motif (obligatoire, envoyé à l’auteur)':
    'Reason (required, sent to the author)',
  'Nouveau post': 'New post',
  'Nouvelle communauté': 'New community',
  'Nouvelle demande': 'New request',
  'Nouvelle demande d’aide': 'New help request',
  'Nouveau projet': 'New project',
  'Notifications': 'Notifications',
  'Non lue': 'Unread',
  'Non lu': 'Unread',
  'On cherche': 'Looking for',
  'Ouverte': 'Open',
  'Ouvrir': 'Open',
  'Page GitHub simulée': 'Simulated GitHub page',
  'Partager': 'Share',
  'Passeport développeur': 'Developer passport',
  'Personne ne correspond à ces filtres.': 'No one matches these filters.',
  'Plus tard': 'Later',
  'Pour moi': 'For me',
  'Pour les développeurs africains': 'For African developers',
  'Pour toi': 'For you',
  'Post': 'Post',
  'Post introuvable': 'Post not found',
  'Posts': 'Posts',
  'Preuves': 'Proofs',
  'Preuves récentes': 'Recent proof',
  'Profil': 'Profile',
  'Projet': 'Project',
  'Projets': 'Projects',
  'Projets mis en avant': 'Featured projects',
  'Proposer une collaboration': 'Propose a collaboration',
  'Publier': 'Publish',
  'Publier la demande': 'Publish request',
  'Question': 'Question',
  'Recevoir GitHub en temps réel': 'Receive GitHub updates in real time',
  'Réessayer': 'Try again',
  'Réglages': 'Settings',
  'Répondre': 'Reply',
  'Répondre dans le fil': 'Reply in thread',
  'Réponse': 'Reply',
  'Réputation': 'Reputation',
  'Résultats': 'Results',
  'Review': 'Review',
  'Reviews': 'Reviews',
  'Roadmap': 'Roadmap',
  'Rôles': 'Roles',
  'Résumé IA': 'AI summary',
  'Retour': 'Back',
  'Retour au fil': 'Back to feed',
  'Retourner à l’accueil': 'Back to home',
  'Rien à relire.': 'Nothing to review.',
  'Rien dans cette catégorie pour l’instant.': 'Nothing in this category yet.',
  'Sans communauté': 'No community',
  'Sombre': 'Dark',
  'Se connecter': 'Sign in',
  'Se déconnecter': 'Sign out',
  'Se désister': 'Withdraw',
  'Skills': 'Skills',
  'Suivant': 'Next',
  'Système': 'System',
  'Story': 'Story',
  'Sur quoi travailler': 'What to work on',
  'Survole-moi': 'Hover over me',
  'Tes repos publics': 'Your public repositories',
  'Tests': 'Tests',
  'Thème': 'Theme',
  'Thème du profil': 'Profile theme',
  'Type': 'Type',
  'Type de post': 'Post type',
  'Une page ou un lien qui n’existe pas encore.':
    'A page or link that does not exist yet.',
  'Une option choisie reste enfoncée.': 'A selected option stays pressed.',
  'Vague 2': 'Wave 2',
  'Vérifié par GitHub': 'Verified by GitHub',
  'Vision.': 'Vision.',
  'Visibilité': 'Visibility',
  'Voir la demande': 'View request',
  'Voir le profil': 'View profile',
  'Voir les communautés': 'View communities',
  'Voir les demandes d’aide': 'View help requests',
  'Voir les projets': 'View projects',
  'Vue publique · lecture seule': 'Public view · read only',
  'Ajoute au moins un skill pour que le matching trouve les bons développeurs.':
    'Add at least one skill so matching can find the right developers.',
  'Accepte la réponse qui a résolu ton problème : son auteur progresse en Entraide.':
    'Accept the reply that solved your problem. Its author earns a Help contribution.',
  'Avec qui construire': 'Who to build with',
  'Communauté créée': 'Community created',
  'D’où vient ton projet ?': 'Where does your project come from?',
  'Dernière colonne': 'Last column',
  'En indigo : les skills que tu as.': 'In indigo: skills you have.',
  'En train de construire': 'Currently building',
  'Aller au contenu': 'Skip to content',
  'Abonnements': 'Following',
  'Accéder à GitHub': 'Go to GitHub',
  'Acceptée': 'Accepted',
  'Aperçu du projet': 'Project overview',
  'Aucun message pour l’instant.': 'No messages yet.',
  'Aucun membre pour l’instant.': 'No members yet.',
  'Aucun post pour l’instant.': 'No posts yet.',
  'Aucun résultat.': 'No results.',
  'Aucun résultat trouvé.': 'No results found.',
  'Canal': 'Channel',
  'Carte': 'Card',
  'Compte': 'Account',
  'Créer une communauté': 'Create a community',
  'Créer un projet': 'Create a project',
  'Développeurs': 'Developers',
  'Membres': 'Members',
  'Menu du compte': 'Account menu',
  'Mon profil': 'My profile',
  'Navigation principale': 'Main navigation',
  'Notifs': 'Alerts',
  'Pamoja, accueil': 'Pamoja, home',
  'Questions': 'Questions',
  'Rechercher': 'Search',
  'Rechercher un dev, un projet, un skill':
    'Search developers, projects, or skills',
  'Sans réponse': 'Unanswered',
  'Suivis': 'Following',
  'À la une': 'Featured',
  'À relire': 'Needs review',
  'Annonces': 'Announcements',
  'Aide acceptée': 'Help accepted',
  'Aide en cours': 'Help in progress',
  'Aide terminée': 'Help completed',
  'Brouillons': 'Drafts',
  'Candidatures': 'Applications',
  'Canaux du projet': 'Project channels',
  'Contributeurs': 'Contributors',
  'En attente de réponse': 'Awaiting a reply',
  'Enregistré dans les favoris': 'Saved to favorites',
  'Fermée': 'Closed',
  'Issues ouvertes': 'Open issues',
  'Ma demande': 'My request',
  'Mes repos': 'My repositories',
  'Mes projets suivis': 'Projects I follow',
  'Mise à jour': 'Update',
  'Non lues': 'Unread',
  'Non lus': 'Unread',
  'Ouvert': 'Open',
  'Projet introuvable': 'Project not found',
  'Pull requests': 'Pull requests',
  'Réponse envoyée': 'Reply sent',
  'Terminé': 'Done',
  'Tous': 'All',
  'Tout': 'All',
  'Tout marquer comme lu': 'Mark all as read',
  'À propos du projet': 'About the project',
  'À propos de toi': 'About you',
  '#général': '#general',
  '#suivi': '#activity',
  '#aide': '#help',
  '#annonces': '#announcements',
  'aide confirmée': 'confirmed help',
  'aides confirmées': 'confirmed help contributions',
  'développeur aidé': 'developer helped',
  'développeurs aidés': 'developers helped',
  'développeur notifié': 'developer notified',
  'développeurs notifiés': 'developers notified',
  'demande d’aide correspond': 'help request matches',
  'demandes d’aide correspondent': 'help requests match',
  'demande pour toi': 'request for you',
  'demandes pour toi': 'requests for you',
  'PR attend une review': 'pull request awaiting review',
  'PRs attendent une review': 'pull requests awaiting review',
  'membre': 'member',
  'membres': 'members',
  'post': 'post',
  'posts': 'posts',
  'développeur': 'developer',
  'développeurs': 'developers',
  'projet': 'project',
  'projets': 'projects',
  'non lue': 'unread notification',
  'non lues': 'unread notifications',
  'membre affiché': 'member shown',
  'membres affichés': 'members shown',
  'preuve': 'proof',
  'preuves': 'proofs',
  'vérifiée': 'verified',
  'vérifiées': 'verified',
  'donnée de démo': 'demo item',
  'données de démo': 'demo items',
  'réponse': 'reply',
  'réponses': 'replies',
  'étoile': 'star',
  'étoiles': 'stars',
  'contributeur': 'contributor',
  'contributeurs': 'contributors',
  'review confirmée': 'confirmed review',
  'reviews confirmées': 'confirmed reviews',
  'good first issue': 'good first issue',
  'good first issues': 'good first issues',
  'PR mergée': 'pull request merged',
  'PRs mergées': 'pull requests merged',
  'PR en attente de review': 'pull request awaiting review',
  'PRs en attente de review': 'pull requests awaiting review',
  'bloqueur ouvert': 'open blocker',
  'bloqueurs ouverts': 'open blockers',
  'issue': 'issue',
  'issues': 'issues',
  'PR': 'pull request',
  'PRs': 'pull requests',
  'milestone': 'milestone',
  'terminée': 'completed',
  'prévue': 'planned',
  'demandes ouvertes passent': 'open requests meet',
  'demande ouverte passe': 'open request meets',
  'demande d’aide ouverte': 'open help request',
  'demandes d’aide ouvertes': 'open help requests',
  'PR ouverte': 'open pull request',
  'PRs ouvertes': 'open pull requests',
  'terminées': 'completed',
  'prévues': 'planned',
  'ce seuil aujourd’hui': 'this score today',
  'Aucune demande en attente': 'No pending requests',
  'Aucune équipe pour l’instant.': 'No team members yet.',
  'À préparer': 'To do',
  'À traiter': 'To review',
  'Pas encore mesuré': 'Not measured yet',
  'Très actif': 'Very active',
  'CI en échec': 'CI failing',
  'Contenu supprimé': 'Content removed',
  'Décision enregistrée': 'Decision saved',
  'Approuvée par Abdou': 'Approved by Abdou',
  'Contributions réelles': 'Real contributions',
  'Réagir +1': 'React +1',
  'preuve vérifiée': 'verified proof',
  'preuves vérifiées': 'verified proofs',
  'pays relié': 'connected country',
  'pays reliés': 'connected countries',
  '1 à 2 h par semaine': '1–2 hours per week',
  ' · l’auteur est notifié': ' · the author is notified',
  ' · vérifié': ' · verified',
  '#suivi est écrit par la plateforme. Réponds en fil sous une alerte.':
    '#activity is posted by Pamoja. Reply in a thread under an alert.',
  'aidé par': 'helped by',
  'Activité': 'Activity',
  'Dernière release': 'Latest release',
  'Objets · personnes, projets, états': 'Objects · people, projects, statuses',
  'Plaque fantôme · pas encore créée': 'Placeholder tile · not created yet',
  'Règles': 'Rules',
  'Socle · système isométrique': 'Foundation · isometric system',
  'Tolère les fautes : essaie « postgress »': 'Typo-tolerant: try “postgress”',
  'Voir un profil': 'View a profile',
  'Voir le passeport de Moussa': 'View Moussa’s passport',
  'Couleur d’accent': 'Accent color',
  'Clique : la touche s’enfonce dans le sol.':
    'Click: the key sinks into the tile.',
  'Plaque · carte': 'Slab · card',
  'Puits · champs et onglets': 'Recess · fields and tabs',
  'Pulse · 7 derniers jours': 'Pulse · last 7 days',
  'Touches · boutons': 'Keys · buttons',
  'Délai de première review': 'Time to first review',
  'CI sur 7 jours': 'CI over 7 days',
  'Bloqueurs ouverts': 'Open blockers',
  'Accueil des nouveaux': 'New contributor onboarding',
  'Issues fermées': 'Issues closed',
  'Contributeurs arrivés': 'New contributors',
  'Reviews demandées': 'Reviews requested',
  'Moyenne sur 7 jours entre l’ouverture d’une PR et sa première review. Attention au-delà de 24 h.':
    'Seven-day average time from opening a pull request to its first review. More than 24 hours needs attention.',
  'Part des runs CI réussis sur 7 jours. Bon au-dessus de 90 %.':
    'Share of successful CI runs over 7 days. Above 90% is good.',
  'Nombre de personnes qui ont mergé 80 % des PRs sur 90 jours. Fragile en dessous de 3.':
    'Number of people who merged 80% of pull requests over 90 days. Fewer than three is fragile.',
  'Les développeurs de Côte d’Ivoire : Abidjan, Yamoussoukro, Bouaké et au-delà.':
    'Developers in Côte d’Ivoire: Abidjan, Yamoussoukro, Bouaké, and beyond.',
  'Les développeurs du Cameroun, de Douala à Yaoundé.':
    'Developers in Cameroon, from Douala to Yaoundé.',
  'Les développeurs du Sénégal : meetups, projets, entraide.':
    'Developers in Senegal: meetups, projects, and peer support.',
  'La file de modération est vide pour l’instant.':
    'The moderation queue is empty for now.',
  'Pamoja n’a pas pu joindre le serveur. Réessaie dans un instant.':
    'Pamoja could not reach the server. Try again in a moment.',
  'Respecte les autres, signale ce qui pose problème.':
    'Be respectful. Report anything that causes a problem.',
  'Sois précis : du code, un contexte, ce que tu as essayé.':
    'Be specific: share code, context, and what you have tried.',
  'Sois précis et bienveillant.': 'Be specific and kind.',
  'Une place par vague de matching est réservée aux nouveaux profils bien alignés.':
    'Each matching wave reserves a spot for a well-matched new profile.',
  'Instantané': 'Instant',
  'Désactivé': 'Disabled',
  'Sécurité': 'Security',
  'Mentorat': 'Mentoring',
  'Review de code': 'Code review',
  'Recherche de contributeur': 'Find a contributor',
  'Cybersécurité': 'Cybersecurity',
  'Jeu vidéo': 'Game development',
  'Trouver des projets': 'Find projects',
  'Trouver des contributeurs': 'Find contributors',
  'Faire des reviews': 'Review code',
  'Recevoir des reviews': 'Get code reviews',
  'Aider des développeurs': 'Help developers',
  'Contribuer à l’open source': 'Contribute to open source',
  'Mentorer': 'Mentor others',
  'Trouver un mentor': 'Find a mentor',
  'Construire des projets': 'Build projects',
  'Trouver des collaborateurs': 'Find collaborators',
  'Demandes d’aide qui te correspondent, relances.':
    'Matching help requests and follow-ups.',
  'PRs, reviews, CI, candidatures de tes projets.':
    'Pull requests, reviews, CI, and applications for your projects.',
  'Réponses à tes posts et questions.': 'Replies to your posts and questions.',
  'Abonnements, republications, collaborations.':
    'Follows, reposts, and collaborations.',
  'Sécurité du compte et modération.': 'Account security and moderation.',
  'Développeurs, projets, communautés, demandes, skills':
    'Developers, projects, communities, requests, skills',
  'Développeurs, projets, communautés, posts, demandes, skills':
    'Developers, projects, communities, posts, requests, skills',
}

export const translate = (value: string): string => {
  if (language.peek() !== 'en') return value
  const leading = value.match(/^\s*/)?.[0] ?? ''
  const trailing = value.match(/\s*$/)?.[0] ?? ''
  const core = value.slice(leading.length, value.length - trailing.length)
  if (!core) return value
  const dynamic = core
    .replace(/^Notifications, (\d+) non lues?$/, 'Notifications, $1 unread')
    .replace(/^(\d+) demandes ouvertes passent$/, '$1 open requests match')
    .replace(/^(\d+) demande ouverte passe$/, '$1 open request matches')
    .replace(/^Rejoindre (.+)$/, 'Join $1')
    .replace(/^Quitter (.+)$/, 'Leave $1')
    .replace(/^Accepter : (.+)$/, 'Accept: $1')
    .replace(/^Refuser : (.+)$/, 'Decline: $1')
    .replace(/^Message pour (.+)$/, 'Message to $1')
    .replace(/^il y a (\d+) min$/, '$1 min ago')
    .replace(/^il y a (\d+) h$/, '$1 h ago')
    .replace(/^il y a (\d+) j$/, '$1 d ago')
    .replace(/^il y a (\d+) sem\.$/, '$1 wk ago')
  return `${leading}${english[core] ?? dynamic}${trailing}`
}

const previousVNode = options.vnode
options.vnode = (vnode: VNode) => {
  previousVNode?.(vnode)
  if (language.peek() !== 'en') return
  const props = vnode.props as Record<string, unknown>
  for (const name of ['aria-label', 'alt', 'placeholder', 'title']) {
    if (typeof props[name] === 'string') {
      props[name] = translate(props[name] as string)
    }
  }
  const translateChildren = (children: unknown): unknown => {
    if (typeof children === 'string') return translate(children)
    if (Array.isArray(children)) return children.map(translateChildren)
    return children
  }
  props.children = translateChildren(props.children)
}
