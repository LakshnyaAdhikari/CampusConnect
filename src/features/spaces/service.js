import { isMock } from '../../lib/config'
import { store, notify, subscribe, clone, id } from '../../lib/mockData'
const user=()=>store.users.find(x=>x.uid===store.currentUid)
const space=id=>store.spaces.find(x=>x.id===id)
export const listSpaces = async campus => { if (isMock('spaces')) return clone(store.spaces.filter(x=>x.campus===campus)); throw new Error('not implemented') }
export const createSpace = async ({name,description,category}) => { if (isMock('spaces')) { const item={id:id('space'),name,description,category:category||'Campus Life',campus:user().campus,createdBy:store.currentUid,memberCount:1,createdAt:Date.now(),members:[store.currentUid],posts:[]}; store.spaces.push(item);notify();return clone(item)} throw new Error('not implemented') }
export const joinSpace = async spaceId => { if (isMock('spaces')) { const s=space(spaceId);if(!s.members.includes(store.currentUid)){s.members.push(store.currentUid);s.memberCount++}notify();return } throw new Error('not implemented') }
export const leaveSpace = async spaceId => { if (isMock('spaces')) { const s=space(spaceId);s.members=s.members.filter(x=>x!==store.currentUid);s.memberCount--;notify();return } throw new Error('not implemented') }
export const isMember = async (spaceId,uid) => { if (isMock('spaces')) return space(spaceId).members.includes(uid); throw new Error('not implemented') }
export const listenPosts = (spaceId,cb) => { if (isMock('spaces')) { const push=()=>cb(clone(space(spaceId)?.posts||[]));push();return subscribe(push)} throw new Error('not implemented') }
export const createPost = async (spaceId,{text,isAnonymous}) => { if (isMock('spaces')) { const u=user();const item={id:id('p'),authorName:isAnonymous?'Anonymous':u.name,isAnonymous, ...(isAnonymous?{}:{authorUid:u.uid}),text,createdAt:Date.now(),comments:[]};space(spaceId).posts.unshift(item);notify();return clone(item)} throw new Error('not implemented') }
export const deletePost = async (spaceId,postId) => { if (isMock('spaces')) { const s=space(spaceId);s.posts=s.posts.filter(x=>x.id!==postId);notify();return} throw new Error('not implemented') }
export const listenComments = (spaceId,postId,cb) => { if (isMock('spaces')) { const push=()=>cb(clone(space(spaceId)?.posts.find(x=>x.id===postId)?.comments||[]));push();return subscribe(push)} throw new Error('not implemented') }
export const addComment = async (spaceId,postId,{text,isAnonymous}) => { if (isMock('spaces')) { const u=user();const item={id:id('c'),authorName:isAnonymous?'Anonymous':u.name,isAnonymous,...(isAnonymous?{}:{authorUid:u.uid}),text,createdAt:Date.now()};space(spaceId).posts.find(x=>x.id===postId).comments.push(item);notify();return clone(item)} throw new Error('not implemented') }
export const deleteComment = async (spaceId,postId,commentId) => { if (isMock('spaces')) { const p=space(spaceId).posts.find(x=>x.id===postId);p.comments=p.comments.filter(x=>x.id!==commentId);notify();return} throw new Error('not implemented') }
