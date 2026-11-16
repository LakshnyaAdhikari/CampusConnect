import { useEffect,useState } from 'react'
import { ArrowLeft, MessageCircle, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button,Card,EmptyState,Input,Spinner,Textarea,useToast } from '../components/ui'
import { getSpace,listenSpace,listenPosts,createPost,addComment,deletePost,deleteComment } from '../features/spaces/service'
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
    }).catch(()=>{unsubscribeSpace?.();unsubscribePosts?.();if(active){setSpace(null);setPosts([]);setError('This space could not be loaded.');setLoading(false)}})
    return()=>{active=false;unsubscribeSpace?.();unsubscribePosts?.()}
  },[id])
  const publish=async()=>{if(!text.trim())return;try{await createPost(id,{text:text.trim(),isAnonymous:anon});setText('');toast('Post shared with the space')}catch(reason){toast(reason.message||'Could not publish post','error')}}
  if(loading)return <Spinner/>
  if(error)return <Card className="text-center"><p className="text-muted">{error}</p><Link className="mt-4 inline-block font-semibold text-primary" to="/spaces">Back to spaces</Link></Card>
  if(!space)return <EmptyState title="We couldn't find that space"><Link className="mt-4 inline-block font-semibold text-primary" to="/spaces">Explore all spaces</Link></EmptyState>
  return <div className="mx-auto max-w-4xl space-y-5"><Link to="/spaces" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"><ArrowLeft size={16}/>All spaces</Link><section className="space-detail-hero overflow-hidden rounded-[28px] p-6 text-white sm:p-8"><div className="flex items-start justify-between"><span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/20 bg-white/10"><Sparkles size={25}/></span><span className="rounded-full bg-white/15 px-3 py-1.5 text-xs">{space.campus}</span></div><h1 className="mt-5 text-3xl font-bold">{space.name}</h1><p className="mt-2 max-w-xl text-white/75">{space.description}</p><p className="mt-4 inline-flex items-center gap-2 text-sm text-white/75"><MessageCircle size={16}/>{space.memberCount} members sharing ideas</p></section><Card><div className="mb-3 flex items-center justify-between"><div><h2 className="font-bold">Start a conversation</h2><p className="mt-1 text-xs text-muted">Ask a question, share a win, or invite people to join in.</p></div><ShieldCheck className="text-berry" size={20}/></div><Textarea value={text} onChange={event=>setText(event.target.value)} rows={3} placeholder="What's on your mind?"/><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="inline-flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={anon} onChange={event=>setAnon(event.target.checked)} className="accent-primary"/>Post anonymously to other students</label><Button className="inline-flex items-center gap-2" onClick={publish}><Send size={16}/>Share post</Button></div></Card><div className="space-y-4">{posts.length?posts.map(post=><Post key={post.id} post={post} spaceId={id} role={profile.role} uid={profile.uid} toast={toast}/>):<EmptyState title="Be the first to post"><p>This space is ready for its first hello.</p></EmptyState>}</div></div>
}

function Post({post,spaceId,uid,role,toast}){const [text,setText]=useState('');const remove=async()=>{try{await deletePost(spaceId,post.id);toast('Post removed')}catch(reason){toast(reason.message||'Could not remove post','error')}};const reply=async event=>{event.preventDefault();if(!text.trim())return;try{await addComment(spaceId,post.id,{text:text.trim(),isAnonymous:false});setText('')}catch(reason){toast(reason.message||'Could not add reply','error')}};return <Card><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/35 font-bold text-primary">{post.isAnonymous?'?':post.authorName?.[0]}</span><div><b>{post.authorName}</b><p className="text-xs text-muted">{new Date(post.createdAt).toLocaleString()}</p></div></div><div className="flex items-center gap-1">{(post.authorUid===uid||role==='moderator'||role==='admin')&&<Button variant="ghost" onClick={remove}>Delete</Button>}<ReportButton targetType="post" targetId={post.id} spaceId={spaceId}/></div></div><p className="my-4 whitespace-pre-wrap leading-relaxed">{post.text}</p>{post.comments.length>0&&<div className="mb-4 space-y-2 border-l-2 border-line pl-4">{post.comments.map(comment=><div key={comment.id} className="rounded-xl bg-background p-3 text-sm"><div className="flex justify-between"><b>{comment.authorName}</b>{(comment.authorUid===uid||role==='moderator'||role==='admin')&&<button className="text-xs text-rose" onClick={()=>deleteComment(spaceId,post.id,comment.id)}>Delete</button>}</div><p className="mt-1">{comment.text}</p></div>)}</div>}<form className="flex gap-2" onSubmit={reply}><Input value={text} onChange={event=>setText(event.target.value)} placeholder="Add a kind reply…" aria-label="Add a comment"/><Button variant="secondary">Reply</Button></form></Card>}
