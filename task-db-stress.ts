// Stress rows around abdou, added to the dev database (temporary, untracked)
import { db } from '@01edu/db'
import { now } from '@01edu/time'
import {
  Community,
  CommunityMember,
  Conversation,
  ConversationMember,
  DirectMessage,
  Follow,
  HelpMatch,
  HelpRequest,
  Issue,
  Notification,
  Profile,
  Project,
  ProjectMember,
  PullRequest,
  Repository,
  User,
  UserIntent,
} from '/api/schema.ts'
import { setDeclaredSkills } from '/api/skills.ts'
import { intents } from '/api/vocabulary.ts'
import { publicId } from '/api/lib/ids.ts'
import { people, type Person } from '/web/fixtures/people.ts'

const N = Number(Deno.env.get('STRESS_USERS') ?? 5000)
if (db.prepare(`SELECT 1 FROM user WHERE githubUsername = 'dev00000'`).get()) {
  console.log('already stressed')
  Deno.exit(0)
}

const at = now()
const pick = <T>(list: readonly T[], i: number) => list[i % list.length]
const fixtures = Object.values(people) as Person[]
const skillPool = [...new Set(fixtures.flatMap((p) => p.skills))]
const countries = ['SN', 'NG', 'KE', 'GH', 'CI', 'CM', 'MA', 'RW', 'ZA', 'EG']
const cities = ['Dakar', 'Lagos', 'Nairobi', 'Accra', 'Abidjan', 'Douala']
const first = ['Awa', 'Moussa', 'Fatou', 'Kwame', 'Amina', 'Chinedu', 'Zainab']
const last = ['Diop', 'Okafor', 'Mensah', 'Kamau', 'Traoré', 'Ndiaye', 'Bello']
const long =
  'Ingénieure full-stack passionnée par les systèmes distribués, le paiement mobile et la formation des développeurs juniors en Afrique de l’Ouest'

const abdou = db.prepare(
  `SELECT userId FROM user WHERE githubUsername = 'abdou'`,
).get() as { userId: number }
const me = abdou.userId

const ids: number[] = []
db.transaction(() => {
  for (let i = 0; i < N; i++) {
    const login = `dev${String(i).padStart(5, '0')}`
    const userId = User.insert({
      githubId: -(100000 + i),
      githubUsername: login,
      avatarUrl: '',
      source: 'demo',
      createdAt: at - i * 60,
      updatedAt: at,
    })
    ids.push(userId)
    // Every 7th one has a very long name and headline
    const longOne = i % 7 === 0
    Profile.insert({
      userId,
      displayName: longOne
        ? `${pick(first, i)} ${pick(last, i)}-${pick(last, i + 3)} ${
          pick(first, i + 2)
        } Wonderful-Extraordinarily-Long`
        : `${pick(first, i)} ${pick(last, i + 1)}`,
      headline: longOne ? long : 'Développeur backend',
      bio: long,
      country: pick(countries, i),
      city: pick(cities, i),
      theme: 'minimal',
      accent: 'indigo',
      availability: i % 3 ? 'available' : 'busy',
      matchingMode: 'instant',
      matchingFilters: { helpTypes: ['code_review', 'debugging'] },
      createdAt: at,
      updatedAt: at,
    })
    setDeclaredSkills(userId, {
      skills: [0, 1, 2, 3, 4].map((k) => pick(skillPool, i + k * 7)),
      domains: [],
    })
    UserIntent.insert({ userId, intent: pick(intents, i) })
  }
})()
console.log('users', ids.length)

// Followers and following of abdou
db.transaction(() => {
  ids.forEach((userId, i) => {
    Follow.insert({
      followerId: userId,
      targetType: 'user',
      targetId: me,
      createdAt: at - i,
    })
    if (i % 3 === 0) {
      Follow.insert({
        followerId: me,
        targetType: 'user',
        targetId: userId,
        createdAt: at - i,
      })
    }
  })
})()

// Every community gets everyone
const communityIds = db.prepare(`SELECT communityId FROM community`).all() as {
  communityId: number
}[]
db.transaction(() => {
  for (const { communityId } of communityIds.slice(0, 4)) {
    for (const userId of ids) {
      CommunityMember.insert({
        communityId,
        userId,
        role: 'member',
        joinedAt: at,
      })
    }
  }
  // And 300 more communities
  for (let c = 0; c < 300; c++) {
    Community.insert({
      slug: `stress-${c}`,
      name: `Communauté de test numéro ${c} au nom assez long`,
      type: pick(['technology', 'country', 'domain'], c),
      description: long,
      source: 'demo',
      createdAt: at,
    })
  }
})()

// 1,200 conversations, one of them with 3,000 messages
db.transaction(() => {
  for (let c = 0; c < 1200; c++) {
    const other = ids[c]
    const created = at - c * 600
    const conversationId = Conversation.insert({
      startedBy: c % 2 ? me : other,
      status: c % 50 === 1 ? 'pending' : 'accepted',
      createdAt: created,
      updatedAt: created,
      publicId: publicId(),
    })
    ConversationMember.insert({
      conversationId,
      userId: me,
      lastReadAt: c % 4 ? created : null,
    })
    ConversationMember.insert({ conversationId, userId: other })
    const messages = c === 0 ? 3000 : 3
    for (let m = 0; m < messages; m++) {
      DirectMessage.insert({
        conversationId,
        authorId: m % 2 ? me : other,
        body: m % 10 === 0
          ? `${long} ${long} https://example.com/${'tres-long-'.repeat(12)}`
          : `Message ${m} de la conversation ${c}`,
        createdAt: created - (messages - m) * 30,
      })
    }
  }
})()
console.log('conversations')

// 3,000 notifications
const types = ['help_match', 'help_accepted', 'help_delivered', 'help_message']
db.transaction(() => {
  for (let n = 0; n < 3000; n++) {
    Notification.insert({
      userId: me,
      type: pick(types, n),
      category: n % 2 ? 'for-you' : 'projects',
      actorId: ids[n % ids.length],
      payload: {
        helpRequestId: 1,
        title: n % 5 ? `Demande ${n}` : long,
        project: 'openpay-africa',
        score: 80,
        skills: ['Go'],
        excerpt: long,
      },
      readAt: n % 3 ? at : null,
      createdAt: at - n * 120,
    })
  }
})()

// 60 projects of abdou, one with a repository of 3,000 issues and 2,000 PRs
db.transaction(() => {
  for (let p = 0; p < 60; p++) {
    const projectId = Project.insert({
      ownerId: p % 2 ? me : ids[p],
      name: p % 6 ? `Projet ${p}` : `Projet au nom vraiment très long numéro ${p}`,
      slug: `stress-project-${p}`,
      description: long,
      visibility: 'public',
      status: 'active',
      source: 'demo',
      createdAt: at - p * 3600,
      updatedAt: at,
      skills: [],
    })
    ProjectMember.insert({
      projectId,
      userId: me,
      role: p % 2 ? 'owner' : 'contributor',
      joinedAt: at,
    })
    for (let m = 0; m < (p === 0 ? 400 : 20); m++) {
      if (p % 2 === 0 && m === p) continue
      ProjectMember.insert({
        projectId,
        userId: ids[(p * 20 + m) % ids.length],
        role: 'contributor',
        joinedAt: at,
      })
    }
    if (p !== 0) continue
    const repositoryId = Repository.insert({
      projectId,
      githubId: 990000001,
      owner: 'stress',
      name: 'big-repo',
      fullName: 'stress/big-repo',
      defaultBranch: 'main',
      syncMode: 'poll',
      lastSyncedAt: at,
      source: 'demo',
      readme: long,
      stats: {},
    })
    for (let i = 1; i <= 3000; i++) {
      Issue.insert({
        repositoryId,
        githubId: 880000000 + i,
        number: i,
        title: i % 9 ? `Issue ${i}` : long,
        state: i % 4 ? 'open' : 'closed',
        labels: i % 5 ? ['bug'] : ['good first issue', 'help wanted'],
        authorGithubId: 1,
        authorLogin: 'someone',
        comments: i % 13,
        source: 'demo',
        createdAt: at - i * 300,
        updatedAt: at,
      })
    }
    for (let i = 1; i <= 2000; i++) {
      PullRequest.insert({
        repositoryId,
        githubId: 770000000 + i,
        number: 3000 + i,
        title: i % 9 ? `PR ${i}` : long,
        state: i % 3 ? 'open' : 'merged',
        authorGithubId: 1,
        authorLogin: 'someone',
        additions: 10,
        deletions: 2,
        branch: `feature/${i}`,
        source: 'demo',
        createdAt: at - i * 300,
        updatedAt: at,
        skills: [],
      })
    }
  }
})()
console.log('projects')

// 1,500 requests to abdou, and 1,500 matches for him
db.transaction(() => {
  for (let h = 0; h < 3000; h++) {
    const helpRequestId = HelpRequest.insert({
      authorId: ids[h % ids.length],
      targetUserId: h < 1500 ? me : null,
      category: 'code_review',
      title: h % 8 ? `Demande d’aide ${h}` : long,
      description: long,
      skills: [1, 2],
      status: 'open',
      expiresAt: at + 7 * 86400,
      source: 'demo',
      createdAt: at - h * 200,
      updatedAt: at,
    })
    if (h >= 1500) {
      HelpMatch.insert({
        helpRequestId,
        userId: me,
        score: 50 + (h % 50),
        reasons: [],
        wave: 1,
        newcomerSlot: 0,
        notifiedAt: at,
        status: 'notified',
      })
    }
  }
})()
console.log('help requests')
