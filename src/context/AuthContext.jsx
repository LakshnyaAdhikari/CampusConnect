import { createContext, useContext, useEffect, useState } from 'react'
import { isMock } from '../lib/config'
import { store, subscribe, clone } from '../lib/mockData'
import * as authService from '../features/auth/service'
import { getUser } from '../features/profile/service'
const Context=createContext(null)
export const AuthProvider=({children})=>{const [user,setUser]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true); const sync=()=>{const p=store.users.find(x=>x.uid===store.currentUid);setUser(p?{uid:p.uid,email:p.email}:null);setProfile(p?clone(p):null);setLoading(false)};useEffect(()=>{if(isMock('auth')){sync();return subscribe(sync)}},[]);const wrap=fn=>async(...args)=>{const result=await fn(...args);sync();return result};const refreshProfile=async()=>{if(user)setProfile(await getUser(user.uid))};return <Context.Provider value={{user,profile,role:profile?.role,loading,signUp:wrap(authService.signUpEmail),signIn:wrap(authService.signInEmail),signInWithGoogle:wrap(authService.signInGoogle),signOut:wrap(authService.signOutUser),refreshProfile}}>{children}</Context.Provider>}
export const useAuth=()=>useContext(Context)
