import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth"

import type { AuthAdapter, AuthUser } from "@/auth/types"
import { getFirebaseAuth } from "@/lib/firebase"
import { normalizeEmail } from "@/lib/email"

/** Where the verification link sends the student after verifying (PLAN.md §4.1). */
export function verificationContinueUrl(): string {
  return `${window.location.origin}/dashboard`
}

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null
  return { uid: user.uid, email: user.email ?? "", emailVerified: user.emailVerified }
}

function requireUser(): User {
  const user = getFirebaseAuth().currentUser
  if (!user) throw Object.assign(new Error("Not signed in"), { code: "auth/no-current-user" })
  return user
}

export const firebaseAdapter: AuthAdapter = {
  onChange(callback) {
    return onAuthStateChanged(getFirebaseAuth(), (user) => callback(toAuthUser(user)))
  },

  async signUp(email, password) {
    const cred = await createUserWithEmailAndPassword(
      getFirebaseAuth(),
      normalizeEmail(email),
      password
    )
    await sendEmailVerification(cred.user, { url: verificationContinueUrl() })
    return toAuthUser(cred.user)!
  },

  async signIn(email, password) {
    const cred = await signInWithEmailAndPassword(getFirebaseAuth(), normalizeEmail(email), password)
    return toAuthUser(cred.user)!
  },

  async signOut() {
    await firebaseSignOut(getFirebaseAuth())
  },

  async sendVerification() {
    await sendEmailVerification(requireUser(), { url: verificationContinueUrl() })
  },

  async sendPasswordReset(email) {
    await sendPasswordResetEmail(getFirebaseAuth(), normalizeEmail(email))
  },

  async refresh() {
    const auth = getFirebaseAuth()
    const user = auth.currentUser
    if (!user) return null
    await reload(user)
    // Force a new token so the `email_verified` claim the API sees is current.
    await user.getIdToken(true)
    return toAuthUser(auth.currentUser)
  },

  async getIdToken() {
    const user = getFirebaseAuth().currentUser
    return user ? user.getIdToken() : null
  },
}
