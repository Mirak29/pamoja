import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { Entry, maybe } from '/api/entries.ts'
import { github, seconds } from '/api/github.ts'
import { log } from '/api/lib/log.ts'
import { createNotification } from '/api/notifications.ts'

// The review of a help request is done on GitHub (§7.5). It validates the
// request when all five hold:
//   1. the request is accepted and about this PR;
//   2. the reviewer is the helper who accepted (same githubId);
//   3. the reviewer is neither the author of the PR nor the requester;
//   4. the review came after the acceptance;
//   5. it approves, asks for changes, or comments with at least one comment.
// The request then goes to review_submitted; it is completed only once the
// requester confirms (PAM-212).

export type GithubReview = {
  id: number
  user: { id: number; login: string } | null
  state: string
  body: string | null
  submitted_at: string | null
}

const getUserId = sql<{ userId: number }, number>`
  SELECT userId FROM user WHERE githubId = ?
`.get

// The exact count of comments is read later: never lower it
const writeReview = sql<undefined, Record<string, string | number | null>>`
  INSERT INTO review (pullRequestId, githubReviewId, reviewerGithubId,
    reviewerUserId, state, commentCount, submittedAt, source)
  VALUES (:pullRequestId, :githubReviewId, :reviewerGithubId,
    :reviewerUserId, :state, :commentCount, :submittedAt, 'github')
  ON CONFLICT (githubReviewId) DO UPDATE SET
    state = excluded.state,
    commentCount = max(commentCount, excluded.commentCount),
    reviewerUserId = coalesce(excluded.reviewerUserId, reviewerUserId)
`.run

/**
 * A review as GitHub sends it, from a webhook or a resync. Its body counts
 * as one comment; the inline ones are counted later when they matter.
 */
export const upsertReview = (pullRequestId: number, review: GithubReview) => {
  const reviewerUserId = review.user
    ? getUserId(review.user.id)?.userId ?? null
    : null
  writeReview({
    pullRequestId,
    githubReviewId: review.id,
    reviewerGithubId: review.user?.id ?? 0,
    reviewerUserId,
    // approved, changes_requested, commented or dismissed
    state: review.state.toLowerCase(),
    commentCount: review.body?.trim() ? 1 : 0,
    submittedAt: seconds(review.submitted_at) ?? now(),
  })
  return reviewerUserId
}

type Waiting = {
  helpRequestId: number
  title: string
  authorId: number
  projectId: number | null
  acceptedBy: number
  acceptedAt: number
  helperGithubId: number
  requesterGithubId: number
  prAuthorGithubId: number
}

// Condition 1: accepted, about this PR
const listWaiting = sql<Waiting, number>`
  SELECT helpRequest.helpRequestId, helpRequest.title, helpRequest.authorId,
    helpRequest.projectId, acceptedBy, acceptedAt,
    helper.githubId AS helperGithubId, author.githubId AS requesterGithubId,
    pullRequest.authorGithubId AS prAuthorGithubId
  FROM helpRequest
  JOIN user AS helper ON helper.userId = helpRequest.acceptedBy
  JOIN user AS author ON author.userId = helpRequest.authorId
  JOIN pullRequest ON pullRequest.pullRequestId = helpRequest.pullRequestId
  WHERE helpRequest.pullRequestId = ? AND helpRequest.status = 'accepted'
`.all

// Conditions 2, 4 and 5; a review validates one request only
const findReview = sql<
  { reviewId: number },
  { pullRequestId: number; reviewer: number; since: number }
>`
  SELECT reviewId FROM review
  WHERE pullRequestId = :pullRequestId AND reviewerGithubId = :reviewer
    AND helpRequestId IS NULL AND submittedAt > :since
    AND (state IN ('approved', 'changes_requested')
      OR (state = 'commented' AND commentCount >= 1))
  ORDER BY submittedAt, reviewId
  LIMIT 1
`.get

const setSubmitted = sql<undefined, { helpRequestId: number; at: number }>`
  UPDATE helpRequest SET status = 'review_submitted', deliveredAt = :at,
    updatedAt = :at
  WHERE helpRequestId = :helpRequestId AND status = 'accepted'
`.run

const linkReview = sql<undefined, { reviewId: number; helpRequestId: number }>`
  UPDATE review SET helpRequestId = :helpRequestId WHERE reviewId = :reviewId
`.run

/**
 * Checks the accepted requests of a PR against its reviews; a valid review
 * moves its request to review_submitted, and the requester is told.
 * Synchronous: it runs inside the transaction of a webhook.
 */
export const verifyReviews = (pullRequestId: number) => {
  for (const request of listWaiting(pullRequestId)) {
    // Condition 3
    if (
      request.helperGithubId === request.prAuthorGithubId ||
      request.helperGithubId === request.requesterGithubId
    ) continue
    const review = findReview({
      pullRequestId,
      reviewer: request.helperGithubId,
      since: request.acceptedAt,
    })
    if (!review) continue
    if (!setSubmitted({ helpRequestId: request.helpRequestId, at: now() })) {
      continue
    }
    linkReview({
      reviewId: review.reviewId,
      helpRequestId: request.helpRequestId,
    })
    Entry.insert.REVIEW_SUBMITTED({
      userId: request.acceptedBy,
      projectId: maybe(request.projectId),
      helpRequestId: request.helpRequestId,
      pullRequestId,
      source: 'github',
    })
    createNotification({
      userId: request.authorId,
      type: 'help_reviewed',
      category: 'for-you',
      actorId: request.acceptedBy,
      payload: { helpRequestId: request.helpRequestId, title: request.title },
    })
  }
}

/*
 * The inline comments of a « commented » review without a body: GitHub does
 * not send their count, it is read once the webhook is done
 */

type Uncounted = {
  reviewId: number
  githubReviewId: number
  number: number
  fullName: string
}

const listUncounted = sql<Uncounted, number>`
  SELECT review.reviewId, review.githubReviewId, pullRequest.number,
    repository.fullName
  FROM review
  JOIN pullRequest ON pullRequest.pullRequestId = review.pullRequestId
  JOIN repository ON repository.repositoryId = pullRequest.repositoryId
  JOIN helpRequest ON helpRequest.pullRequestId = review.pullRequestId
    AND helpRequest.status = 'accepted'
  JOIN user AS helper ON helper.userId = helpRequest.acceptedBy
    AND helper.githubId = review.reviewerGithubId
  WHERE review.pullRequestId = ? AND review.state = 'commented'
    AND review.commentCount = 0 AND review.helpRequestId IS NULL
`.all

const setCommentCount = sql<undefined, { reviewId: number; count: number }>`
  UPDATE review SET commentCount = :count WHERE reviewId = :reviewId
`.run

/** Reads the inline comments of the reviews that need them, then checks */
export const countReviewComments = async (pullRequestId: number) => {
  const reviews = listUncounted(pullRequestId)
  if (!reviews.length) return
  for (const review of reviews) {
    const path =
      `/repos/${review.fullName}/pulls/${review.number}/reviews/${review.githubReviewId}/comments?per_page=100`
    try {
      const answer = await github<unknown[]>(path)
      if (answer.status !== 200) continue
      setCommentCount({ reviewId: review.reviewId, count: answer.data.length })
    } catch (err) {
      log.warn('github-review-comments-error', {
        path,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }
  db.transaction(() => verifyReviews(pullRequestId))()
}

/** After the webhook: GitHub is never called inside its transaction (§5.5) */
export const scheduleCommentCount = (pullRequestId: number) =>
  setTimeout(() => countReviewComments(pullRequestId), 0)

/*
 * The resync: a lost webhook does not lose a review (§5.6, §7.5)
 */

const listPullsWithHelp =
  sql<{ pullRequestId: number; number: number }, number>`
  SELECT DISTINCT pullRequest.pullRequestId, pullRequest.number
  FROM helpRequest
  JOIN pullRequest ON pullRequest.pullRequestId = helpRequest.pullRequestId
  WHERE pullRequest.repositoryId = ? AND helpRequest.status = 'accepted'
`.all

/** Reads the reviews of the PRs that wait for one, from the resync */
export const resyncReviews = async (repositoryId: number, fullName: string) => {
  for (const pull of listPullsWithHelp(repositoryId)) {
    const answer = await github<GithubReview[]>(
      `/repos/${fullName}/pulls/${pull.number}/reviews?per_page=100`,
    )
    if (answer.status !== 200) continue
    db.transaction(() => {
      for (const review of answer.data) {
        review.submitted_at && upsertReview(pull.pullRequestId, review)
      }
      verifyReviews(pull.pullRequestId)
    })()
    await countReviewComments(pull.pullRequestId)
  }
}
