import { isMock } from '../../lib/config'
import { store, notify, clone, id } from '../../lib/mockData'
export const signUpEmail = async (email, password, name) => { if (isMock('auth')) { const uid=id('u'); const user={id:uid,uid,name,email,campus:'',role:'student',interests:[],teach:[],learn:[],lookingFor:[],bio:'',photoURL:'',discoverable:true,onboarded:false,createdAt:Date.now()}; store.users.push(user); store.currentUid=uid; notify(); return clone(user) } throw new Error('not implemented') }
export const signInEmail = async (email, password) => { if (isMock('auth')) { const user=store.users.find(x=>x.email===email)||store.users[0]; store.currentUid=user.uid; notify(); return clone(user) } throw new Error('not implemented') }
export const signInGoogle = async () => { if (isMock('auth')) { store.currentUid='u1'; notify(); return clone(store.users[0]) } throw new Error('not implemented') }
export const signOutUser = async () => { if (isMock('auth')) { store.currentUid=null; notify(); return } throw new Error('not implemented') }
