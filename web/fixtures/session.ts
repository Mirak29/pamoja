import { signal } from '@preact/signals'

// Session until the GitHub login exists (PAM-110): signed in as `me`, signed
// out after « Se déconnecter », back after the simulated GitHub page
export const signedIn = signal(true)

/** POST/api/auth/logout */
export const signOut = () => signedIn.value = false

/** POST/api/auth/github/callback */
export const signIn = () => signedIn.value = true
