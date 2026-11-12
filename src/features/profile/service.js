import { isMock } from '../../lib/config'
import { store, notify, clone } from '../../lib/mockData'
export const getUser = async uid => { if (isMock('profile')) { const user=store.users.find(x=>x.uid===uid||x.id===uid); if (!user) throw new Error('User not found'); return clone(user) } throw new Error('not implemented') }
export const updateUser = async (uid,data) => { if (isMock('profile')) { const user=store.users.find(x=>x.uid===uid||x.id===uid); Object.assign(user,data); notify(); return clone(user) } throw new Error('not implemented') }
export const completeOnboarding = async (uid,data) => { if (isMock('profile')) { return updateUser(uid,{...data,onboarded:true}) } throw new Error('not implemented') }
