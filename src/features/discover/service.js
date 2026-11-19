
import { isMock } from '../../lib/config'
import { store, clone } from '../../lib/mockData'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'

// Fetch all discoverable campus users
export const listCampusUsers = async campus => {
  if (isMock('discover')) {
    const currentUid = store.currentUid

    return clone(
      store.users.filter(
        user =>
          user.uid !== currentUid &&
          (!campus || user.campus === campus) &&
          user.discoverable
      )
    )
  }

  if (!db) {
    throw new Error(
      'Cloud Firestore is not initialized. Check your Firebase configuration.'
    )
  }

  const snapshot = await getDocs(
    query(
      collection(db, 'publicProfiles'),
      where('discoverable', '==', true)
    )
  )

  const currentUid = auth?.currentUser?.uid

  return snapshot.docs
    .map(doc => {
      const data = doc.data()

      return {
        ...data,
        uid: doc.id,
        id: doc.id,
        role: 'student',
        createdAt: data.createdAt?.toMillis?.() ?? 0
      }
    })
    .filter(
      user =>
        user.uid !== currentUid &&
        (!campus || user.campus === campus)
    )
}

// Generate ranked student matches
export const getMatches = async profile => {
  if (!profile?.uid && !profile?.id) {
    throw new Error('A valid user profile is required to generate matches.')
  }

  const currentUid = profile.uid || profile.id

  const overlap = (a = [], b = []) => {
    if (!Array.isArray(a) || !Array.isArray(b)) return []
    return a.filter(value => b.includes(value))
  }

  let users = []

  // Mock implementation
  if (isMock('discover')) {
    users = store.users.filter(
      user =>
        user.uid !== currentUid &&
        user.role === 'student' &&
        user.discoverable
    )
  } else {
    // Firebase implementation
    if (!db) {
      throw new Error(
        'Cloud Firestore is not initialized. Check your Firebase configuration.'
      )
    }

    const snapshot = await getDocs(
      query(
        collection(db, 'publicProfiles'),
        where('discoverable', '==', true)
      )
    )

    users = snapshot.docs
      .map(doc => {
        const data = doc.data()

        return {
          ...data,
          uid: doc.id,
          id: doc.id,
          role: 'student',
          createdAt: data.createdAt?.toMillis?.() ?? 0
        }
      })
      .filter(user => user.uid !== currentUid)
  }

  // Calculate compatibility for every student
  return users
    .map(user => {
      const sharedInterests = overlap(
        profile.interests,
        user.interests
      )

      const sharedLearn = overlap(
        profile.learn,
        user.teach
      )

      const sharedTeach = overlap(
        profile.teach,
        user.learn
      )

      const sharedGoals = overlap(
        profile.lookingFor,
        user.lookingFor
      )

      const reasons = [
        ...sharedLearn.map(
          x => `Can teach ${x}, which you want to learn`
        ),

        ...sharedTeach.map(
          x => `You can teach ${x}, which they want to learn`
        ),

        ...sharedInterests.map(
          x => `You both love ${x}`
        ),

        ...sharedGoals.map(
          x => `You are both looking for a ${x.replaceAll('_', ' ')}`
        )
      ]

      const score =
        sharedLearn.length * 3 +
        sharedTeach.length * 3 +
        sharedInterests.length * 2 +
        sharedGoals.length

      return {
        user: clone(user),
        score,
        reasons,
        sharedInterests,
        sharedLearn,
        sharedTeach,
        sharedGoals
      }
    })
    .sort((a, b) => b.score - a.score)
}
