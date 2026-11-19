
import { isMock } from '../../lib/config'
import { store, notify, subscribe, clone, id } from '../../lib/mockData'
import { pairId } from '../../lib/schema'
import { auth, db } from '../../lib/firebase'

import {
  collection,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getDb = () => {
  if (!db) {
    throw new Error('Cloud Firestore is not initialized. Check your Firebase configuration.')
  }
  return db
}

const getAuthUid = () => {
  const currentUid = auth?.currentUser?.uid

  if (!currentUid) {
    throw new Error('Unauthorized: A signed-in user is required.')
  }

  return currentUid
}

const getMockUid = () => {
  const currentUid = store.currentUid

  if (!currentUid) {
    throw new Error('Unauthorized: An authenticated user is required.')
  }

  return currentUid
}

const validateUid = (uid) => {
  if (!uid || typeof uid !== 'string' || !uid.trim()) {
    throw new Error('A valid user ID is required.')
  }

  return uid.trim()
}

const validateChatId = (chatId) => {
  if (!chatId || typeof chatId !== 'string' || !chatId.trim()) {
    throw new Error('A valid conversation ID is required.')
  }

  return chatId.trim()
}

const toMillis = value => {
  return value?.toMillis?.() ??
    (typeof value === 'number' ? value : Date.now())
}

// --------------------------------------------------
// OPEN OR CREATE CHAT
// --------------------------------------------------

export const openChat = async otherUid => {
  const targetUid = validateUid(otherUid)

  if (isMock('messages')) {
    const currentUid = getMockUid()

    if (targetUid === currentUid) {
      throw new Error('Cannot start a conversation with yourself.')
    }

    const chatId = pairId(currentUid, targetUid)

    if (!store.chats.find(x => x.id === chatId)) {
      store.chats.push({
        id: chatId,
        participants: [currentUid, targetUid],
        lastMessage: '',
        updatedAt: Date.now(),
        messages: []
      })

      notify()
    }

    return chatId
  }

  const firestore = getDb()
  const currentUid = getAuthUid()

  if (targetUid === currentUid) {
    throw new Error('Cannot start a conversation with yourself.')
  }

  const chatId = pairId(currentUid, targetUid)

  const connectionRef = doc(firestore, 'connections', chatId)
  const chatRef = doc(firestore, 'chats', chatId)

  await runTransaction(firestore, async transaction => {
    const connectionSnap = await transaction.get(connectionRef)

    if (!connectionSnap.exists()) {
      throw new Error('You must be connected with this user to start a conversation.')
    }

    const connection = connectionSnap.data()

    if (
      connection.status !== 'accepted' ||
      !connection.participants?.includes(currentUid) ||
      !connection.participants?.includes(targetUid)
    ) {
      throw new Error('You must have an accepted connection to start a conversation.')
    }

    const chatSnap = await transaction.get(chatRef)

    if (chatSnap.exists()) {
      const chat = chatSnap.data()

      if (
        !chat.participants?.includes(currentUid) ||
        !chat.participants?.includes(targetUid)
      ) {
        throw new Error('Unauthorized: Invalid conversation participants.')
      }

      return
    }

    transaction.set(chatRef, {
      id: chatId,
      participants: [currentUid, targetUid],
      lastMessage: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  })

  return chatId
}

// --------------------------------------------------
// LISTEN TO USER CONVERSATIONS
// --------------------------------------------------

export const listenChats = (uid, cb) => {
  const targetUid = validateUid(uid)

  if (typeof cb !== 'function') {
    throw new Error('A callback function is required.')
  }

  if (isMock('messages')) {
    const push = () => {
      const chats = store.chats
        .filter(x => x.participants?.includes(targetUid))
        .sort((a, b) => b.updatedAt - a.updatedAt)

      cb(clone(chats))
    }

    push()
    return subscribe(push)
  }

  const firestore = getDb()
  const currentUid = getAuthUid()

  if (currentUid !== targetUid) {
    throw new Error('Unauthorized: You can only listen to your own conversations.')
  }

  const q = query(
    collection(firestore, 'chats'),
    where('participants', 'array-contains', targetUid)
  )

  return onSnapshot(
    q,
    snapshot => {
      const chats = snapshot.docs.map(docSnap => {
        const data = docSnap.data()

        return {
          ...data,
          id: docSnap.id,
          createdAt: toMillis(data.createdAt),
          updatedAt: toMillis(data.updatedAt)
        }
      })

      chats.sort((a, b) => b.updatedAt - a.updatedAt)

      cb(chats)
    },
    error => {
      console.error('Error listening to conversations:', error)
      cb([])
    }
  )
}

// --------------------------------------------------
// LISTEN TO MESSAGES IN A CONVERSATION
// --------------------------------------------------

export const listenMessages = (chatId, cb) => {
  const targetChatId = validateChatId(chatId)

  if (typeof cb !== 'function') {
    throw new Error('A callback function is required.')
  }

  if (isMock('messages')) {
    const push = () => {
      const messages = store.chats.find(x => x.id === targetChatId)?.messages || []

      cb(clone(messages))
    }

    push()
    return subscribe(push)
  }

  const firestore = getDb()
  const currentUid = getAuthUid()

  const messagesRef = collection(
    firestore,
    'chats',
    targetChatId,
    'messages'
  )

  return onSnapshot(
    messagesRef,
    snapshot => {
      const messages = snapshot.docs.map(docSnap => {
        const data = docSnap.data()

        return {
          ...data,
          id: docSnap.id,
          createdAt: toMillis(data.createdAt)
        }
      })

      messages.sort((a, b) => a.createdAt - b.createdAt)

      cb(messages)
    },
    error => {
      console.error('Error listening to messages:', error)
      cb([])
    }
  )
}

// --------------------------------------------------
// SEND MESSAGE
// --------------------------------------------------

export const sendMessage = async (chatId, text) => {
  const targetChatId = validateChatId(chatId)

  const messageText = typeof text === 'string' ? text.trim() : ''

  if (!messageText) {
    throw new Error('Message cannot be empty.')
  }

  if (messageText.length > 5000) {
    throw new Error('Message cannot exceed 5000 characters.')
  }

  if (isMock('messages')) {
    const currentUid = getMockUid()

    const chat = store.chats.find(x => x.id === targetChatId)

    if (!chat) {
      throw new Error('Conversation not found.')
    }

    if (!chat.participants?.includes(currentUid)) {
      throw new Error('Unauthorized: You are not a participant in this conversation.')
    }

    const item = {
      id: id('m'),
      senderUid: currentUid,
      text: messageText,
      createdAt: Date.now()
    }

    chat.messages.push(item)
    chat.lastMessage = messageText
    chat.updatedAt = item.createdAt

    notify()

    return clone(item)
  }

  const firestore = getDb()
  const currentUid = getAuthUid()

  const chatRef = doc(firestore, 'chats', targetChatId)
  const chatSnapshot = await getDoc(chatRef)
  if (!chatSnapshot.exists()) throw new Error('Conversation not found.')
  const participants = chatSnapshot.data().participants || []
  if (!participants.includes(currentUid)) {
    throw new Error('Unauthorized: You are not a participant in this conversation.')
  }
  const recipientUid = participants.find(uid => uid !== currentUid)
  if (!recipientUid) throw new Error('Conversation recipient could not be determined.')

  const profileSnapshot = await getDoc(doc(firestore, 'users', currentUid))
  const actorName = profileSnapshot.data()?.name?.trim()
  if (!actorName) throw new Error('Complete your profile name before sending a message.')

  const messageRef = doc(
    collection(firestore, 'chats', targetChatId, 'messages')
  )

  const batch = writeBatch(firestore)

  const item = {
    id: messageRef.id,
    senderUid: currentUid,
    text: messageText,
    createdAt: serverTimestamp()
  }

  batch.set(messageRef, item)
  batch.set(doc(firestore, 'notifications', `message_${messageRef.id}`), {
    recipientUid,
    type: 'message_received',
    actorUid: currentUid,
    actorName,
    createdAt: serverTimestamp(),
    read: false,
    chatId: targetChatId,
    messageId: messageRef.id,
  })

  batch.update(chatRef, {
    lastMessage: messageText,
    updatedAt: serverTimestamp()
  })

  await batch.commit()

  return {
    ...item,
    createdAt: Date.now()
  }
}
