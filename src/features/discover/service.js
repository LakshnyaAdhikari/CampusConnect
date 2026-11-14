import { isMock } from '../../lib/config'
import { store, clone } from '../../lib/mockData'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'

export const listCampusUsers = async campus => {
  if (isMock('discover')) {
    const currentUid = store.currentUid
    return clone(store.users.filter(user => user.uid !== currentUid && (!campus || user.campus === campus) && user.discoverable))
  }
  if (!db) throw new Error('Cloud Firestore is not initialized. Check your Firebase configuration.')

  const snapshot = await getDocs(query(collection(db, 'publicProfiles'), where('discoverable', '==', true)))
  const currentUid = auth?.currentUser?.uid

  return snapshot.docs
    .map(profile => {
      const data = profile.data()
      return {
        ...data,
        uid: profile.id,
        id: profile.id,
        role: 'student',
        createdAt: data.createdAt?.toMillis?.() ?? 0
      }
    })
    .filter(profile => profile.uid !== currentUid && (!campus || profile.campus === campus))
}

export const getMatches = async profile => { if (isMock('discover')) { const overlap=(a=[],b=[])=>a.filter(x=>b.includes(x)); return store.users.filter(x=>x.uid!==profile.uid&&x.role==='student'&&x.discoverable).map(user=>{const shared=overlap(profile.interests,user.interests),learn=overlap(profile.learn,user.teach),teach=overlap(profile.teach,user.learn),goals=overlap(profile.lookingFor,user.lookingFor);const reasons=[...shared.map(x=>`You both like ${x}`),...learn.map(x=>`They can teach ${x}, which you want to learn`),...teach.map(x=>`You can teach ${x}, which they want to learn`),...goals.map(x=>`You are both looking for a ${x.replaceAll('_',' ')}`)];const score=learn.length*3+teach.length*3+shared.length*2+goals.length;return {user:clone(user),score,reasons}}).sort((a,b)=>b.score-a.score) } throw new Error('not implemented') }
