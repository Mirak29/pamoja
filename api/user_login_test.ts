import { assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import type { GithubUser } from '/api/github-oauth.ts'
import { User } from '/api/schema.ts'
import { findOrCreateGithubUser, getLogin } from '/api/user.ts'

const restore = makeRestorePoint()

const github = (id: number, login: string): GithubUser => ({
  id,
  login,
  avatar_url: '',
  name: login,
  email: null,
  bio: null,
  blog: null,
  location: null,
  languages: [],
})

const logins = () =>
  db.prepare(
    'SELECT githubId, githubUsername, githubLogin FROM user ORDER BY userId',
  ).all()

Deno.test('login: a demo account reached by a real one keeps its demo login (§14)', () => {
  restore()
  // The seed links « abdou » of the demo to a real GitHub account
  User.insert({
    githubId: 500,
    githubUsername: 'abdou',
    avatarUrl: '',
    source: 'demo',
    createdAt: now(),
    updatedAt: now(),
  })
  const { userId, created } = findOrCreateGithubUser(
    github(500, 'Mirak29'),
    'github',
  )
  assertEquals(created, false)
  assertEquals(logins(), [
    { githubId: 500, githubUsername: 'abdou', githubLogin: 'Mirak29' },
  ])
  // Its repos are read on GitHub under the real login
  assertEquals(getLogin(userId), 'Mirak29')
})

Deno.test('login: a renamed GitHub account follows, and a login names one account', () => {
  restore()
  findOrCreateGithubUser(github(600, 'sena'), 'github')
  findOrCreateGithubUser(github(600, 'sena-diop'), 'github')
  // Someone else takes the freed login on GitHub, in another case
  findOrCreateGithubUser(github(601, 'kofi'), 'github')
  findOrCreateGithubUser(github(602, 'Kofi'), 'github')
  assertEquals(logins(), [
    { githubId: 600, githubUsername: 'sena-diop', githubLogin: 'sena-diop' },
    { githubId: 601, githubUsername: 'kofi~601', githubLogin: 'kofi' },
    { githubId: 602, githubUsername: 'Kofi', githubLogin: 'Kofi' },
  ])
  // The database refuses two accounts on one login, whatever the case
  assertThrows(() =>
    User.insert({
      githubId: 603,
      githubUsername: 'KOFI',
      avatarUrl: '',
      source: 'github',
      createdAt: now(),
      updatedAt: now(),
    })
  )
})
