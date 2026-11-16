const handleSave = async () => {
  setSaving(true)
  try {
    const profileData = {
      name: p.name,
      campus: p.campus,
      interests: p.interests || [],
      teach: p.teach || [],
      learn: p.learn || [],
      lookingFor: p.lookingFor || [],
      bio: p.bio || '',
      photoURL: p.photoURL || '',
      discoverable: p.discoverable ?? true,
    }

    await updateUser(user.uid, profileData)
    await refreshProfile()
    toast('Profile updated successfully!')
  } catch (err) {
    toast(err.message || 'Could not save profile', 'error')
  } finally {
    setSaving(false)
  }
}