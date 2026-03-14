import { db } from './firebase'
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    getDocs,
    query,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore'

const COLLECTION = 'interviews'

/**
 * Create a new interview session document
 */
export async function createInterview({ userId, role }) {
    const docRef = await addDoc(collection(db, COLLECTION), {
        userId: userId || 'anonymous',
        role,
        questions: [],
        answers: [],
        scores: [],
        feedback: [],
        totalScore: 0,
        averageScore: 0,
        completed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })
    return docRef.id
}

/**
 * Update interview with answers, scores and feedback
 */
export async function updateInterview(interviewId, data) {
    const ref = doc(db, COLLECTION, interviewId)
    await updateDoc(ref, {
        ...data,
        updatedAt: serverTimestamp(),
    })
}

/**
 * Get a single interview by ID
 */
export async function getInterview(interviewId) {
    const ref = doc(db, COLLECTION, interviewId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() }
}

/**
 * Get all interviews (history)
 */
export async function getAllInterviews() {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Mark interview as complete and compute scores
 */
export async function completeInterview(interviewId, scores, feedback) {
    const total = scores.reduce((a, b) => a + b, 0)
    const average = scores.length > 0 ? total / scores.length : 0
    await updateInterview(interviewId, {
        scores,
        feedback,
        totalScore: total,
        averageScore: parseFloat(average.toFixed(1)),
        completed: true,
    })
}
