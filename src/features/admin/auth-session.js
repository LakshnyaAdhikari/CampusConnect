export const resolveAuthenticatedUser = async (auth, expectedUid) => {
  if (!auth) {
    throw Object.assign(new Error('Firebase Authentication is not initialized.'), { code: 'auth/not-initialized' })
  }

  await auth.authStateReady()
  const user = auth.currentUser
  if (!user) {
    throw Object.assign(new Error('Firebase authentication is still initializing. Please retry once sign-in has finished.'), { code: 'auth/no-current-user' })
  }
  if (expectedUid && user.uid !== expectedUid) {
    throw Object.assign(new Error('The active Firebase user does not match the authenticated application session.'), { code: 'auth/user-mismatch' })
  }
  return { uid: user.uid, user }
}
