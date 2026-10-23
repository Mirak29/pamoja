import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import {
  entries,
  Entry,
  type EntryListener,
  entryNames,
  type EntryTypeName,
} from '/api/entries.ts'

// Who receives what (§13.3), for every type of entry: one line each, and a
// new type fails here until its audience is written down. The client only
// learns that something changed; a wrong audience leaks the activity of a
// project or of a help request to someone outside it (§16).

const restore = makeRestorePoint()

type Role =
  | 'actor' // the developer the entry is about (`userId`)
  | 'member' // member of the project
  | 'follower' // follows the project
  | 'requester' // wrote the help request
  | 'helper' // accepted it
  | 'matched' // was matched with it
  | 'communityMember'
  | 'moderator' // moderates the community
  | 'fan' // follows the actor
  | 'correspondent' // the other one of a conversation with the actor
  | 'stranger'

const project: Role[] = ['member', 'follower']
const help: Role[] = ['actor', 'requester', 'helper', 'matched']

const audience: Record<EntryTypeName, Role[]> = {
  // Nobody: the journal, the reputation, the reindexing (§13.3)
  USER_LOGIN: [],
  PROFILE_UPDATED: [],
  PROJECT_CREATED: [],
  HELP_REQUEST_CREATED: [],
  POST_UPDATED: [],
  ANSWER_ACCEPTED: [],
  // The developer only
  BADGE_UNLOCKED: ['actor'],
  NOTIFICATION_CREATED: ['actor'],
  HELP_REQUEST_MATCHED: ['actor'],
  // A project: its members and followers
  PROJECT_UPDATED: project,
  PULSE_READY: project,
  PR_OPENED: project,
  PR_UPDATED: project,
  PR_REVIEWED: project,
  PR_MERGED: project,
  PR_CLOSED: project,
  PR_REVIEW_STALE: project,
  ISSUE_UPDATED: project,
  RELEASE_PUBLISHED: project,
  CI_FAILED: project,
  CI_FIXED: project,
  COMMITS_PUSHED: project,
  // The new member receives the project at once
  PROJECT_MEMBER_JOINED: ['actor', ...project],
  // The team only: the board, a message outside #annonces
  TASK_UPDATED: ['member'],
  MESSAGE_CREATED: ['member'],
  // A help request
  HELP_REQUEST_ACCEPTED: [...help, 'member'],
  REVIEW_SUBMITTED: ['requester', 'member'],
  REVIEW_HELP_CONFIRMED: ['actor', 'member'],
  HELP_CONFIRMED: ['actor', 'member'],
  HELP_REQUEST_WITHDRAWN: help,
  HELP_REQUEST_RELEASED: help,
  HELP_REQUEST_REOPENED: help,
  HELP_REQUEST_EXPIRED: help,
  HELP_REQUEST_CANCELLED: help,
  HELP_REQUEST_DELIVERED: help,
  HELP_MESSAGE_CREATED: help,
  HELP_REQUEST_CLOSED: help,
  // Communities
  POST_CREATED: ['communityMember'],
  POST_REPLIED: ['communityMember'],
  POST_REPOSTED: ['communityMember', 'fan'],
  CONTENT_REPORTED: ['moderator'],
  MODERATION_ACTION: ['actor', 'moderator'],
  // Direct messages: the two of the conversation only (§10.6)
  DIRECT_MESSAGE_CREATED: ['actor', 'correspondent'],
  CONVERSATION_UPDATED: ['actor', 'correspondent'],
  DIRECT_MESSAGE_UPDATED: ['actor', 'correspondent'],
}

const roles: Role[] = [
  'actor',
  'member',
  'follower',
  'requester',
  'helper',
  'matched',
  'communityMember',
  'moderator',
  'fan',
  'correspondent',
  'stranger',
]

/** One row of each kind an entry can point at, owned by the right people */
const world = () => {
  const ids = Object.fromEntries(roles.map((role, i) => {
    db.exec(`INSERT INTO user (githubId, githubUsername, avatarUrl, source,
      createdAt, updatedAt) VALUES (${i + 1}, '${role}', '', 'demo', 0, 0)`)
    return [role, db.lastInsertRowId]
  })) as Record<Role, number>
  const insert = (sql: string) => {
    db.exec(sql)
    return db.lastInsertRowId
  }
  const projectId = insert(`INSERT INTO project (ownerId, name, slug,
    description, visibility, status, source, createdAt, updatedAt)
    VALUES (${ids.member}, 'OpenPay', 'openpay', '', 'public', 'beta',
    'demo', 0, 0)`)
  const repositoryId = insert(`INSERT INTO repository (projectId, githubId,
    owner, name, fullName, defaultBranch, syncMode, source)
    VALUES (${projectId}, 1, 'o', 'r', 'o/r', 'main', 'poll', 'github')`)
  const relations = {
    userId: ids.actor,
    projectId,
    helpRequestId: insert(`INSERT INTO helpRequest (authorId, category,
      title, description, skills, status, acceptedBy, expiresAt, source,
      createdAt, updatedAt) VALUES (${ids.requester}, 'debugging', 't', '',
      '[]', 'accepted', ${ids.helper}, 0, 'demo', 0, 0)`),
    pullRequestId: insert(`INSERT INTO pullRequest (repositoryId, githubId,
      number, title, state, authorGithubId, additions, deletions, source,
      createdAt, updatedAt) VALUES (${repositoryId}, 1, 1, 't', 'open', 1, 0,
      0, 'github', 0, 0)`),
    issueId: insert(`INSERT INTO issue (repositoryId, githubId, number, title,
      state, labels, authorGithubId, source, createdAt, updatedAt)
      VALUES (${repositoryId}, 1, 1, 't', 'open', '[]', 1, 'github', 0, 0)`),
    taskId: insert(`INSERT INTO task (projectId, boardColumn, title, rank,
      createdAt, updatedAt) VALUES (${projectId}, 'backlog', 't', 'a', 0, 0)`),
    // A message of #général: #annonces is checked in entries_test.ts
    messageId: insert(`INSERT INTO projectMessage (projectId, channel,
      authorId, body, source, createdAt) VALUES (${projectId}, 'general',
      ${ids.member}, 'm', 'demo', 0)`),
    postId: insert(`INSERT INTO post (authorId, type, body, source, createdAt,
      updatedAt) VALUES (${ids.actor}, 'discussion', 'p', 'demo', 0, 0)`),
    communityId: insert(`INSERT INTO community (slug, name, type, description,
      source, createdAt) VALUES ('go', 'Go', 'technology', '', 'demo', 0)`),
    notificationId: insert(`INSERT INTO notification (userId, type, category,
      payload, createdAt) VALUES (${ids.actor}, 't', 'system', '{}', 0)`),
  }
  const conversationId = insert(`INSERT INTO conversation (startedBy, status,
    createdAt, updatedAt) VALUES (${ids.actor}, 'accepted', 0, 0)`)
  for (const userId of [ids.actor, ids.correspondent]) {
    db.exec(`INSERT INTO conversationMember (conversationId, userId)
      VALUES (${conversationId}, ${userId})`)
  }
  db.exec(`INSERT INTO helpMatch (helpRequestId, userId, score, reasons, wave,
    newcomerSlot, status) VALUES (${relations.helpRequestId}, ${ids.matched},
    80, '[]', 1, 0, 'notified')`)
  return { ids, relations, conversationId }
}

/** A listener per role, with what the server computes for it (§13.2) */
const listeners = (
  ids: Record<Role, number>,
  projectId: number,
  communityId: number,
) => {
  const received = new Map<Role, string[]>()
  const decoder = new TextDecoder()
  for (const role of roles) {
    const list: string[] = []
    received.set(role, list)
    const sub: EntryListener = {
      userId: ids[role],
      projectIds: new Set(role === 'member' ? [projectId] : []),
      followedProjectIds: new Set(role === 'follower' ? [projectId] : []),
      communityIds: new Set(role === 'communityMember' ? [communityId] : []),
      moderatedCommunityIds: new Set(role === 'moderator' ? [communityId] : []),
      followedUserIds: new Set(role === 'fan' ? [ids.actor] : []),
      connectionId: role,
      controller: {
        enqueue: (chunk: Uint8Array) => {
          const [, type] = JSON.parse(decoder.decode(chunk).slice(6))
          list.push(entryNames[type as keyof typeof entryNames])
        },
      } as unknown as ReadableStreamDefaultController,
    }
    Entry.insertListeners.add(sub)
  }
  return received
}

Deno.test('triggers: every type of entry reaches exactly its audience (§13.3)', () => {
  restore()
  Entry.insertListeners.clear()
  const { ids, relations, conversationId } = world()
  const received = listeners(ids, relations.projectId, relations.communityId)
  // Every relation given: the trigger decides alone who receives it
  const insert = Entry.insert as unknown as Record<
    string,
    (params: Record<string, unknown>) => number
  >
  const types = Object.keys(entries) as EntryTypeName[]
  // The conversation travels in the data of a message entry
  for (const type of types) {
    insert[type]({ ...relations, data: { conversationId } })
  }
  Entry.insertListeners.clear()

  const got = Object.fromEntries(types.map((type) => [
    type,
    roles.filter((role) => received.get(role)!.includes(type)),
  ]))
  const expected = Object.fromEntries(types.map((type) => [
    type,
    roles.filter((role) => audience[type]?.includes(role)),
  ]))
  assertEquals(got, expected)
  // A stranger receives nothing at all
  assertEquals(received.get('stranger'), [])
})

Deno.test('triggers: no type is left without its audience', () => {
  assertEquals(
    (Object.keys(entries) as EntryTypeName[]).filter((type) =>
      !(type in audience)
    ),
    [],
  )
})
