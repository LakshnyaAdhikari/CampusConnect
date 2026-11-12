import { isMock } from '../../lib/config'
import { store, notify, subscribe, clone, id } from '../../lib/mockData'
import { pairId } from '../../lib/schema'
export const openChat = async otherUid => { if (isMock('messages')) { const chatId=pairId(store.currentUid,otherUid); if(!store.chats.find(x=>x.id===chatId)) store.chats.push({id:chatId,participants:[store.currentUid,otherUid],lastMessage:'',updatedAt:Date.now(),messages:[]}); notify(); return chatId } throw new Error('not implemented') }
export const listenChats = (uid,cb) => { if (isMock('messages')) { const push=()=>cb(clone(store.chats.filter(x=>x.participants.includes(uid)).sort((a,b)=>b.updatedAt-a.updatedAt))); push(); return subscribe(push) } throw new Error('not implemented') }
export const listenMessages = (chatId,cb) => { if (isMock('messages')) { const push=()=>cb(clone(store.chats.find(x=>x.id===chatId)?.messages||[])); push(); return subscribe(push) } throw new Error('not implemented') }
export const sendMessage = async (chatId,text) => { if (isMock('messages')) { const chat=store.chats.find(x=>x.id===chatId); const item={id:id('m'),senderUid:store.currentUid,text,createdAt:Date.now()}; chat.messages.push(item); chat.lastMessage=text; chat.updatedAt=item.createdAt; notify(); return clone(item) } throw new Error('not implemented') }
