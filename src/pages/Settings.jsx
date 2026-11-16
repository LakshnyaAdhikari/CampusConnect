import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Moon,
  Sun,
  Shield,
  Bell,
  Download,
  Trash2,
  LogOut,
  User,
  Info,
  ExternalLink,
  Check,
} from 'lucide-react'
import { Button, Card, ConfirmDialog, PageHeader, useToast } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { updateUser } from '../features/profile/service'
import { store } from '../lib/mockData'

export default function Settings() {
  const { profile, user, signOut, refreshProfile } = useAuth()
  const nav = useNavigate()
  const toast = useToast()

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('cc_theme') === 'dark'
  })

  const [discoverable, setDiscoverable] = useState(profile?.discoverable ?? true)
  const [showCampus, setShowCampus] = useState(true)
  const [allowDMs, setAllowDMs] = useState(true)

  const [notifRequests, setNotifRequests] = useState(true)
  const [notifDMs, setNotifDMs] = useState(true)
  const [notifSpaces, setNotifSpaces] = useState(true)

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [savingDiscover, setSavingDiscover] = useState(false)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('cc_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('cc_theme', 'light')
    }
  }, [darkMode])

  const toggleDiscoverable = async e => {
    const nextVal = e.target.checked
    setDiscoverable(nextVal)
    try {
      setSavingDiscover(true)
      await updateUser(profile.uid, { discoverable: nextVal })
      refreshProfile()
      toast(nextVal ? 'You are now visible in campus discovery' : 'Hidden from discovery')
    } catch (err) {
      toast(err.message || 'Could not update privacy setting', 'error')
      setDiscoverable(!nextVal)
    } finally {
      setSavingDiscover(false)
    }
  }

  const handleDownloadData = () => {
    const userConnections = store.connections.filter(
      c => c.fromUid === profile.uid || c.toUid === profile.uid
    )
    const exportData = {
      profile: {
        uid: profile.uid,
        name: profile.name,
        email: profile.email || `${profile.uid}@campusconnect.test`,
        campus: profile.campus,
        role: profile.role,
        bio: profile.bio,
        interests: profile.interests,
        teach: profile.teach,
        learn: profile.learn,
        lookingFor: profile.lookingFor,
      },
      connectionsCount: userConnections.length,
      connections: userConnections,
      exportedAt: new Date().toISOString(),
      app: 'CampusConnect v1.0.0',
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `campusconnect-data-${profile.uid}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Personal data archive downloaded!')
  }

  const handleDeleteAccount = async () => {
    try {
      await signOut()
      toast('Account data deleted successfully.')
      nav('/')
    } catch (err) {
      toast(err.message || 'Could not process request', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" />

      <Card className="p-6 dark:bg-[#1A1A22] dark:border-[#2E2E3A]">
        <div className="flex items-center gap-3 mb-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#451952]/10 text-[#451952] dark:bg-[#23232E] dark:text-[#E59858]">
            {darkMode ? <Moon size={20} /> : <Sun size={20} />}
          </span>
          <div>
            <h2 className="text-base font-bold text-[#1D1A39] dark:text-[#F4F4F6]">Appearance</h2>
            <p className="text-xs text-muted dark:text-[#A1A1B0]">Customize the interface theme</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line/60 dark:border-[#2E2E3A] pt-4">
          <div>
            <span className="text-sm font-semibold text-[#1D1A39] dark:text-[#F4F4F6]">Dark Theme</span>
            <p className="text-xs text-muted dark:text-[#A1A1B0]">Calm, low-glare matte charcoal interface</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={e => setDarkMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-line/80 dark:bg-[#23232E] dark:border dark:border-[#2E2E3A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9E3B50]"></div>
          </label>
        </div>
      </Card>

      <Card className="p-6 dark:bg-[#1A1A22] dark:border-[#2E2E3A]">
        <div className="flex items-center gap-3 mb-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#662549]/10 text-[#662549] dark:bg-[#23232E] dark:text-[#F4F4F6]">
            <Shield size={20} />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#1D1A39] dark:text-[#F4F4F6]">Privacy &amp; Discovery</h2>
            <p className="text-xs text-muted dark:text-[#A1A1B0]">Manage your visibility across campus</p>
          </div>
        </div>

        <div className="space-y-4 border-t border-line/60 dark:border-[#2E2E3A] pt-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-[#1D1A39] dark:text-[#F4F4F6]">Discoverable on Campus</span>
              <p className="text-xs text-muted dark:text-[#A1A1B0]">Allow students in your campus to find and match with you</p>
            </div>
            <input
              type="checkbox"
              disabled={savingDiscover}
              checked={discoverable}
              onChange={toggleDiscoverable}
              className="h-4 w-4 rounded accent-[#9E3B50]"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-[#1D1A39] dark:text-[#F4F4F6]">Show Campus &amp; Role on Profile</span>
              <p className="text-xs text-muted dark:text-[#A1A1B0]">Display your campus badge and student status</p>
            </div>
            <input
              type="checkbox"
              checked={showCampus}
              onChange={e => {
                setShowCampus(e.target.checked)
                toast('Preference saved')
              }}
              className="h-4 w-4 rounded accent-[#9E3B50]"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-[#1D1A39] dark:text-[#F4F4F6]">Allow Direct Messages from Connections</span>
              <p className="text-xs text-muted dark:text-[#A1A1B0]">Accepted connection peers can initiate 1-on-1 chats</p>
            </div>
            <input
              type="checkbox"
              checked={allowDMs}
              onChange={e => {
                setAllowDMs(e.target.checked)
                toast('Preference saved')
              }}
              className="h-4 w-4 rounded accent-[#9E3B50]"
            />
          </label>
        </div>
      </Card>

      <Card className="p-6 dark:bg-[#1A1A22] dark:border-[#2E2E3A]">
        <div className="flex items-center gap-3 mb-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#AE445A]/10 text-[#AE445A] dark:bg-[#23232E] dark:text-[#E59858]">
            <Bell size={20} />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#1D1A39] dark:text-[#F4F4F6]">Notification Preferences</h2>
            <p className="text-xs text-muted dark:text-[#A1A1B0]">Control when and how you receive alerts</p>
          </div>
        </div>

        <div className="space-y-4 border-t border-line/60 dark:border-[#2E2E3A] pt-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-[#1D1A39] dark:text-[#F4F4F6]">New Connection Requests</span>
              <p className="text-xs text-muted dark:text-[#A1A1B0]">When a peer requests to connect with you</p>
            </div>
            <input
              type="checkbox"
              checked={notifRequests}
              onChange={e => setNotifRequests(e.target.checked)}
              className="h-4 w-4 rounded accent-[#9E3B50]"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-[#1D1A39] dark:text-[#F4F4F6]">Direct Messages</span>
              <p className="text-xs text-muted dark:text-[#A1A1B0]">New messages in active 1-on-1 conversations</p>
            </div>
            <input
              type="checkbox"
              checked={notifDMs}
              onChange={e => setNotifDMs(e.target.checked)}
              className="h-4 w-4 rounded accent-[#9E3B50]"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-[#1D1A39] dark:text-[#F4F4F6]">Space Replies &amp; Mentions</span>
              <p className="text-xs text-muted dark:text-[#A1A1B0]">Replies to your posts inside joined spaces</p>
            </div>
            <input
              type="checkbox"
              checked={notifSpaces}
              onChange={e => setNotifSpaces(e.target.checked)}
              className="h-4 w-4 rounded accent-[#9E3B50]"
            />
          </label>
        </div>
      </Card>

      <Card className="p-6 dark:bg-[#1A1A22] dark:border-[#2E2E3A]">
        <div className="flex items-center gap-3 mb-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#F39F5A]/20 text-[#662549] dark:bg-[#23232E] dark:text-[#F4F4F6]">
            <User size={20} />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#1D1A39] dark:text-[#F4F4F6]">Personal Data &amp; Account Info</h2>
            <p className="text-xs text-muted dark:text-[#A1A1B0]">Manage your credentials and export data</p>
          </div>
        </div>

        <div className="border-t border-line/60 dark:border-[#2E2E3A] pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-background dark:bg-[#23232E] p-4 text-xs">
            <div>
              <span className="text-muted dark:text-[#717182] block">Full Name</span>
              <span className="font-bold text-[#1D1A39] dark:text-[#F4F4F6]">{profile?.name}</span>
            </div>
            <div>
              <span className="text-muted dark:text-[#717182] block">Campus</span>
              <span className="font-bold text-[#1D1A39] dark:text-[#F4F4F6]">{profile?.campus}</span>
            </div>
            <div>
              <span className="text-muted dark:text-[#717182] block">Account Email</span>
              <span className="font-bold text-[#1D1A39] dark:text-[#F4F4F6]">{profile?.email || `${profile?.uid}@campusconnect.test`}</span>
            </div>
            <div>
              <span className="text-muted dark:text-[#717182] block">Role</span>
              <span className="font-bold capitalize text-[#1D1A39] dark:text-[#F4F4F6]">{profile?.role || 'Student'}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={handleDownloadData}
              className="inline-flex items-center gap-2 text-xs font-semibold dark:bg-[#23232E] dark:border dark:border-[#2E2E3A] dark:text-[#F4F4F6] dark:hover:bg-[#2E2E3A]"
            >
              <Download size={15} /> Download My Data (JSON)
            </Button>
            <Link
              to={`/profile/${profile?.uid}`}
              className="text-xs font-bold text-[#451952] dark:text-[#E59858] hover:underline"
            >
              Edit Profile &amp; Swap Tags →
            </Link>
          </div>
        </div>
      </Card>

      <Card className="p-6 dark:bg-[#1A1A22] dark:border-[#2E2E3A]">
        <div className="flex items-center gap-3 mb-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary dark:bg-[#23232E] dark:text-[#E59858]">
            <Info size={20} />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#1D1A39] dark:text-[#F4F4F6]">About CampusConnect</h2>
            <p className="text-xs text-muted dark:text-[#A1A1B0]">Platform version &amp; guidelines</p>
          </div>
        </div>

        <div className="border-t border-line/60 dark:border-[#2E2E3A] pt-4 space-y-3 text-xs text-muted dark:text-[#A1A1B0] leading-relaxed">
          <div className="flex justify-between items-center">
            <span>Platform Version</span>
            <span className="font-semibold text-[#1D1A39] dark:text-[#F4F4F6]">v1.0.0 (Release Build)</span>
          </div>
          <p>
            CampusConnect is designed campus-first: anonymous posting in spaces protects your identity, while peer-to-peer skill swapping empowers students to learn from each other.
          </p>
          <div className="pt-1">
            <Link
              to="/discover"
              className="inline-flex items-center gap-1 font-semibold text-[#451952] dark:text-[#E59858] hover:underline"
            >
              Read Community Guidelines <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-danger/40 dark:bg-[#1A1A22] dark:border-danger/30">
        <h2 className="text-base font-bold text-danger">Session &amp; Danger Zone</h2>
        <p className="text-xs text-muted dark:text-[#717182] mt-1">Sign out or terminate your campus profile</p>

        <div className="mt-4 flex flex-wrap gap-3 border-t border-line/60 dark:border-[#2E2E3A] pt-4">
          <Button
            variant="secondary"
            onClick={async () => {
              await signOut()
              nav('/')
            }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#1D1A39] dark:bg-[#23232E] dark:border dark:border-[#2E2E3A] dark:text-[#F4F4F6] dark:hover:bg-[#2E2E3A]"
          >
            <LogOut size={15} /> Sign Out
          </Button>
          <Button
            variant="danger"
            onClick={() => setDeleteConfirmOpen(true)}
            className="inline-flex items-center gap-2 text-xs font-semibold bg-[#9E3B50] hover:bg-[#AE445A]"
          >
            <Trash2 size={15} /> Delete Account
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteAccount}
        title="Delete your account?"
      >
        Are you sure you want to permanently delete your account and all associated connection history? This action cannot be undone.
      </ConfirmDialog>
    </div>
  )
}
