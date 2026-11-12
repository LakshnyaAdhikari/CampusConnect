import { isMock } from '../../lib/config'
import { store, notify, subscribe, clone } from '../../lib/mockData'
import { pairId } from '../../lib/schema'
const me=()=>store.currentUid
export const sendRequest = async toUid => { if (isMock('connections')) { const item={id:pairId(me(),toUid),fromUid:me(),toUid,participants:[me(),toUid],status:'pending',createdAt:Date.now()}; store.connections.push(item); notify(); return clone(item) } throw new Error('not implemented') }
export const respondRequest = async (otherUid,status) => { if (isMock('connections')) { const index=store.connections.findIndex(x=>x.id===pairId(me(),otherUid)); if(status==='rejected') store.connections.splice(index,1); else store.connections[index].status='accepted'; notify(); return } throw new Error('not implemented') }
export const cancelRequest = async otherUid => { if (isMock('connections')) { store.connections=store.connections.filter(x=>x.id!==pairId(me(),otherUid)); notify(); return } throw new Error('not implemented') }
export const removeConnection = async otherUid => { if (isMock('connections')) return cancelRequest(otherUid); throw new Error('not implemented') }
export const listenConnections = (uid,cb) => { if (isMock('connections')) { const push=()=>cb(clone(store.connections.filter(x=>x.participants.includes(uid)))); push(); return subscribe(push) } throw new Error('not implemented') }
