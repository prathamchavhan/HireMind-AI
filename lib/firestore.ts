import { db } from './firebase';
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
    DocumentData,
    QuerySnapshot,
    DocumentSnapshot,
    DocumentReference
} from 'firebase/firestore';

export interface Interview {
    id?: string;
    userId: string;
    role: string;
    questions?: string[];
    answers?: string[];
    scores?: number[];
    feedback?: string[];
    totalScore?: number;
    averageScore?: number;
    completed?: boolean;
    createdAt?: any;
    updatedAt?: any;
}

const COLLECTION = 'interviews';

/**
 * Create a new interview session document
 */
export async function createInterview({ userId, role }: { userId?: string, role: string }): Promise<string> {
    const docRef: DocumentReference<DocumentData> = await addDoc(collection(db, COLLECTION), {
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
    });
    return docRef.id;
}

/**
 * Update interview with answers, scores and feedback
 */
export async function updateInterview(interviewId: string, data: Partial<Interview>): Promise<void> {
    const ref = doc(db, COLLECTION, interviewId);
    await updateDoc(ref, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Get a single interview by ID
 */
export async function getInterview(interviewId: string): Promise<Interview | null> {
    const ref = doc(db, COLLECTION, interviewId);
    const snap: DocumentSnapshot<DocumentData> = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Interview;
}

/**
 * Get all interviews (history)
 */
export async function getAllInterviews(): Promise<Interview[]> {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Interview));
}

/**
 * Mark interview as complete and compute scores
 */
export async function completeInterview(interviewId: string, scores: number[], feedback: string[]): Promise<void> {
    const total = scores.reduce((a, b) => a + b, 0);
    const average = scores.length > 0 ? total / scores.length : 0;
    await updateInterview(interviewId, {
        scores,
        feedback,
        totalScore: total,
        averageScore: parseFloat(average.toFixed(1)),
        completed: true,
    });
}
