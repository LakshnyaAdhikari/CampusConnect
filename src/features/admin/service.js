import { isMock } from '../../lib/config'
import { store, notify, subscribe, clone, id } from '../../lib/mockData'
export const createReport = async data => { if (isMock('admin')) { const item={id:id('r'),reporterUid:store.currentUid,...data,status:'open',createdAt:Date.now()};store.reports.push(item);notify();return clone(item)} throw new Error('not implemented') }
export const listenReports = cb => { if (isMock('admin')) { const push=()=>cb(clone(store.reports));push();return subscribe(push)} throw new Error('not implemented') }
export const resolveReport = async reportId => { if (isMock('admin')) { store.reports.find(x=>x.id===reportId).status='resolved';notify();return} throw new Error('not implemented') }
export const listUsers = async () => { if (isMock('admin')) return clone(store.users); throw new Error('not implemented') }
export const setUserRole = async (uid,role) => { if (isMock('admin')) { store.users.find(x=>x.uid===uid).role=role;notify();return} throw new Error('not implemented') }
