import { useEffect,useState } from 'react'
import { ArrowLeft, LockKeyhole, MessageCircle, Send, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button,Card,EmptyState,Input,Spinner,Textarea,useToast } from '../components/ui'
import { getSpace,listenSpace,listenPosts,createPost,addComment,deletePost,deleteComment,joinSpace,requestJoinSpace,getJoinRequestStatus,listenJoinRequests,respondJoinRequest } from '../features/spaces/service'
import { useAuth } from '../context/AuthContext'
import { ReportButton } from '../features/admin/components/ReportButton'

export default function Space(){
  const {id}=useParams()
  const {profile}=useAuth()
  const [space,setSpace]=useState(null)
  const [posts,setPosts]=useState([])
  const [text,setText]=useState('')
  const [anon,setAnon]=useState(false)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [accessDenied,setAccessDenied]=useState(false)
  const [requestStatus,setRequestStatus]=useState(null)
  const [joinRequests,setJoinRequests]=useState([])
  const [membershipBusy,setMembershipBusy]=useState(false)
  const toast=useToast()
  useEffect(()=>{
    let active=true
    let unsubscribeSpace=()=>{}
    let unsubscribePosts=()=>{}
    let missing=false
    setSpace(null)
    setPosts([])
    setLoading(true)
    setError('')
    setAccessDenied(false)
    setRequestStatus(null)
    getSpace(id).then(result=>{
      if(!active)return
      setSpace(result)
      unsubscribeSpace=listenSpace(id,liveSpace=>{
        if(!active)return
        if(!liveSpace){
          missing=true
          setSpace(null)
          setPosts([])
          setError('This space is no longer available.')
          setLoading(false)
          unsubscribePosts()
          unsubscribeSpace()
          return
        }
        setSpace(liveSpace)
      })
      if(active&&!missing)unsubscribePosts=listenPosts(id,setPosts)
      else unsubscribeSpace()
      setLoading(false)
    }).catch(reason=>{unsubscribeSpace?.();unsubscribePosts?.();if(active){setSpace(null);setPosts([]);if(reason?.code==='permission-denied'){setAccessDenied(true);getJoinRequestStatus(id).then(setRequestStatus).catch(()=>{})}else{setError('This space could not be loaded.')}setLoading(false)}})
    return()=>{active=false;unsubscribeSpace?.();unsubscribePosts?.()}
  },[id])
  useEffect(()=>{
    if(!space||!(space.createdBy===profile?.uid||['admin','moderator'].includes(profile?.role)))return
    return listenJoinRequests(id,setJoinRequests)
  },[id,space?.id,space?.createdBy,profile?.uid,profile?.role])
  const publish=async()=>{if(!text.trim())return;try{await createPost(id,{text:text.trim(),isAnonymous:anon});setText('');toast('Post shared with the space')}catch(reason){toast(reason.message||'Could not publish post','error')}}
  const join=async()=>{setMembershipBusy(true);try{await joinSpace(id);setSpace(current=>({...current,members:[...new Set([...(current?.members||[]),profile.uid])]}));toast('You joined this space')}catch(reason){toast(reason.message||'Could not join space','error')}finally{setMembershipBusy(false)}}
  const requestAccess=async()=>{setMembershipBusy(true);try{setRequestStatus(await requestJoinSpace(id));toast('Your request was sent to the Space owner')}catch(reason){toast(reason.message||'Could not request access','error')}finally{setMembershipBusy(false)}}
  const answerRequest=async(requesterUid,approved)=>{try{await respondJoinRequest(id,requesterUid,approved);toast(approved?'Member approved':'Request declined')}catch(reason){toast(reason.message||'Could not update request','error')}}
  if(loading)return <Spinner/>
  if(accessDenied)return <Card className="mx-auto max-w-lg text-center"><LockKeyhole className="mx-auto mb-3 text-primary"/><h2 className="font-bold">Private Space</h2><p className="mt-2 text-sm text-muted">This Space is private or unavailable. If you have its link, you can request access from the owner.</p>{requestStatus==='pending'?<p className="mt-4 text-sm font-semibold text-primary">Your request is pending approval.</p>:requestStatus==='rejected'?<p className="mt-4 text-sm text-muted">Your previous request was declined.</p>:<Button className="mt-4" loading={membershipBusy} onClick={requestAccess}>Request to join</Button>}<Link className="mt-4 block font-semibold text-primary" to="/spaces">Back to Spaces</Link></Card>
  if(error)return <Card className="text-center"><p className="text-muted">{error}</p><Link className="mt-4 inline-block font-semibold text-primary" to="/spaces">Back to spaces</Link></Card>
  if(!space)return <EmptyState title="We couldn't find that space"><Link className="mt-4 inline-block font-semibold text-primary" to="/spaces">Explore all spaces</Link></EmptyState>
  const isMember=space.members?.includes(profile?.uid)
  const canReview=space.createdBy===profile?.uid||['admin','moderator'].includes(profile?.role)
  return <div className="mx-auto max-w-4xl space-y-5"><Link to="/spaces" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"><ArrowLeft size={16}/>All spaces</Link>{(space.visibility ?? 'campus') !== 'private' && <div className="flex justify-end"><ReportButton targetType="space" targetId={id}/></div>}<section className="space-detail-hero overflow-hidden rounded-[28px] p-6 text-white sm:p-8"><div className="flex items-start justify-between"><span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/20 bg-white/10"><Sparkles size={25}/></span><div className="flex gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs">{(space.visibility ?? 'campus')==='private'&&<LockKeyhole size={12} />}{(space.visibility ?? 'campus')==='private'?'Private':(space.visibility ?? 'campus')==='campus'?'Campus':'Public'}</span><span className="rounded-full bg-white/15 px-3 py-1.5 text-xs">{space.campus}</span></div></div><h1 className="mt-5 text-3xl font-bold">{space.name}</h1><p className="mt-2 max-w-xl text-white/75">{space.description}</p><p className="mt-4 inline-flex items-center gap-2 text-sm text-white/75"><MessageCircle size={16}/>{space.memberCount} members sharing ideas</p></section>{!isMember&&<Card className="flex items-center justify-between gap-3"><p className="text-sm text-muted">Join to create posts and comments in this Space.</p><Button loading={membershipBusy} onClick={join}>Join Space</Button></Card>}{isMember&&<Card><div className="mb-3 flex items-center justify-between"><div><h2 className="font-bold">Start a conversation</h2><p className="mt-1 text-xs text-muted">Ask a question, share a win, or invite people to join in.</p></div><ShieldCheck className="text-berry" size={20}/></div><Textarea value={text} onChange={event=>setText(event.target.value)} rows={3} placeholder="What's on your mind?"/><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="inline-flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={anon} onChange={event=>setAnon(event.target.checked)} className="accent-primary"/>Post anonymously to other students</label><Button className="inline-flex items-center gap-2" onClick={publish}><Send size={16}/>Share post</Button></div></Card>}{canReview&&<Card><h2 className="mb-3 flex items-center gap-2 font-bold"><Users size={17}/>Pending membership requests</h2>{joinRequests.length?joinRequests.map(request=><div key={request.id} className="flex items-center justify-between border-t border-line py-3"><span className="text-sm">User {request.uid}</span><div className="flex gap-2"><Button size="sm" onClick={()=>answerRequest(request.uid,true)}>Approve</Button><Button size="sm" variant="ghost" onClick={()=>answerRequest(request.uid,false)}>Decline</Button></div></div>):<p className="text-sm text-muted">No pending requests.</p>}</Card>}<div className="space-y-4">{posts.length?posts.map(post=><Post key={post.id} post={post} spaceId={id} role={profile.role} uid={profile.uid} toast={toast} canReport={(space.visibility ?? 'campus') !== 'private'}/>):<EmptyState title="Be the first to post"><p>This space is ready for its first hello.</p></EmptyState>}</div></div>
}

function Post({post,spaceId,uid,role,toast,canReport}){const [text,setText]=useState('');const remove=async()=>{try{await deletePost(spaceId,post.id);toast('Post removed')}catch(reason){toast(reason.message||'Could not remove post','error')}};const reply=async event=>{event.preventDefault();if(!text.trim())return;try{await addComment(spaceId,post.id,{text:text.trim(),isAnonymous:false});setText('')}catch(reason){toast(reason.message||'Could not add reply','error')}};return <Card><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/35 font-bold text-primary">{post.isAnonymous?'?':post.authorName?.[0]}</span><div><b>{post.authorName}</b><p className="text-xs text-muted">{new Date(post.createdAt).toLocaleString()}</p></div></div><div className="flex items-center gap-1">{(post.authorUid===uid||role==='moderator'||role==='admin')&&<Button variant="ghost" onClick={remove}>Delete</Button>}{canReport&&<ReportButton targetType="post" targetId={post.id} spaceId={spaceId}/>}</div></div><p className="my-4 whitespace-pre-wrap leading-relaxed">{post.text}</p>{post.comments.length>0&&<div className="mb-4 space-y-2 border-l-2 border-line pl-4">{post.comments.map(comment=><div key={comment.id} className="rounded-xl bg-background p-3 text-sm"><div className="flex justify-between"><b>{comment.authorName}</b>{(comment.authorUid===uid||role==='moderator'||role==='admin')&&<button className="text-xs text-rose" onClick={()=>deleteComment(spaceId,post.id,comment.id)}>Delete</button>}</div><p className="mt-1">{comment.text}</p></div>)}</div>}<form className="flex gap-2" onSubmit={reply}><Input value={text} onChange={event=>setText(event.target.value)} placeholder="Add a kind reply…" aria-label="Add a comment"/><Button variant="secondary">Reply</Button></form></Card>}
