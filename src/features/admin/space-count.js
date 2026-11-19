import { collection, getDocs, query, where } from 'firebase/firestore'
import { isSpaceActive } from '../spaces/status.js'

/**
 * Count all active Spaces visible in the Overview's existing public/campus
 * scope. Missing isActive fields are treated as active for legacy documents.
 */
export const getActiveVisibleSpaceCount = async (firestore, campus) => {
  const publicQuery = query(
    collection(firestore, 'spaces'),
    where('visibility', '==', 'public'),
  )
  const campusQuery = campus
    ? query(
      collection(firestore, 'spaces'),
      where('visibility', '==', 'campus'),
      where('campus', '==', campus),
    )
    : null
  const [publicSnapshot, campusSnapshot] = await Promise.all([
    getDocs(publicQuery),
    campusQuery ? getDocs(campusQuery) : Promise.resolve(null),
  ])
  const documents = [...publicSnapshot.docs, ...(campusSnapshot?.docs || [])]
  return documents.filter(snapshot => isSpaceActive(snapshot.data())).length
}
