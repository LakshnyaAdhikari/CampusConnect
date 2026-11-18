import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { ToastProvider, Spinner } from '../components/ui'
import AppLayout from '../layouts/AppLayout'
import ErrorBoundary from './ErrorBoundary'
import Landing from '../pages/Landing'
import Auth from '../pages/Auth'
import Onboarding from '../pages/Onboarding'
import Discover from '../pages/Discover'
import Profile from '../pages/Profile'
import Connections from '../pages/Connections'
import Notifications from '../pages/Notifications'
import Messages from '../pages/Messages'
import Spaces from '../pages/Spaces'
import Space from '../pages/Space'
import JoinedSpaces from '../pages/JoinedSpaces'
import Settings from '../pages/Settings'
import Admin from '../pages/Admin'
import ConnectMap from '../pages/ConnectMap'

function StudentRoutes() {
  const { user, profile, role, loading, roleLoading } = useAuth()
  if (loading || roleLoading) return <Spinner />
  if (!user) return <Navigate to="/auth" replace />
  if (role === 'admin') return <Navigate to="/admin" replace />
  if (!profile?.onboarded) return <Navigate to="/onboarding" replace />
  return <AppLayout />
}

function AuthOnly({ signup = false, audience = 'student' }) {
  const { user, profile, role, loading, roleLoading } = useAuth()
  if (loading || roleLoading) return <Spinner />
  if (!user) return <Auth key={`${signup}-${audience}`} initialMode={signup} initialAudience={audience} />
  if (role === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to={profile?.onboarded ? '/discover' : '/onboarding'} replace />
}

function Onboard() {
  const { user, profile, role, loading, roleLoading } = useAuth()
  if (loading || roleLoading) return <Spinner />
  if (!user) return <Navigate to="/auth" replace />
  if (role === 'admin') return <Navigate to="/admin" replace />
  return profile?.onboarded ? <Navigate to="/discover" replace /> : <Onboarding />
}

function AdminAccess() {
  const { user, role, loading, roleLoading } = useAuth()
  if (loading || roleLoading) return <Spinner />
  if (!user) return <Navigate to="/admin/login" replace />
  if (role !== 'admin') return <Admin denied />
  return <Admin />
}

export default function App() {
  return <BrowserRouter><AuthProvider><ToastProvider><ErrorBoundary><Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/auth" element={<AuthOnly />} />
    <Route path="/signup" element={<AuthOnly signup />} />
    <Route path="/admin/login" element={<AuthOnly audience="admin" />} />
    <Route path="/admin" element={<AdminAccess />} />
    <Route path="/onboarding" element={<Onboard />} />
    <Route element={<StudentRoutes />}>
      <Route path="/discover" element={<Discover />} />
      <Route path="/discover/people" element={<Discover />} />
      <Route path="/profile/:uid" element={<Profile />} />
      <Route path="/connections" element={<Connections />} />
      <Route path="/connect-map" element={<ConnectMap />} />
      <Route path="/connectmap" element={<ConnectMap />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/messages/:chatId" element={<Messages />} />
      <Route path="/spaces" element={<Spaces />} />
      <Route path="/spaces/joined" element={<JoinedSpaces />} />
      <Route path="/spaces/:id" element={<Space />} />
      <Route path="/settings" element={<Settings />} />
    </Route>
    <Route path="*" element={<div className="p-10">Page not found</div>} />
  </Routes></ErrorBoundary></ToastProvider></AuthProvider></BrowserRouter>
}
