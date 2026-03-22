'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createInterview, updateInterview, completeInterview } from '@/lib/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Volume2, VolumeX, ArrowRight, SkipForward, ArrowLeft } from 'lucide-react'

// ─── Audio Wave Visualizer ───────────────────────────────────────────────────
function AudioWave({ isRecording }: { isRecording: boolean }) {
    const bars = 16
    return (
        <div className="flex items-center justify-center gap-[2px] h-10">
            {[...Array(bars)].map((_, i) => (
                <div
                    key={i}
                    className="w-1 bg-white transition-all ease-out"
                    style={{
                        height: isRecording ? `${Math.random() * 28 + 6}px` : '4px',
                        opacity: isRecording ? 1 : 0.2,
                        transitionDuration: '100ms',
                    }}
                />
            ))}
        </div>
    )
}

// ─── Main Interview Component ─────────────────────────────────────────────────
function InterviewContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const role = searchParams.get('role') || 'candidate'
    const roleTitle = searchParams.get('roleTitle') || 'Candidate'

    const [questions, setQuestions] = useState<string[]>([])
    const [currentIdx, setCurrentIdx] = useState<number>(0)
    const [answers, setAnswers] = useState<string[]>([])
    const [scores, setScores] = useState<number[]>([])
    const [feedbacks, setFeedbacks] = useState<string[]>([])
    const [transcript, setTranscript] = useState<string>('')
    const [isRecording, setIsRecording] = useState<boolean>(false)
    const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false)
    const [isTranscribing, setIsTranscribing] = useState<boolean>(false)
    const [isEvaluating, setIsEvaluating] = useState<boolean>(false)
    const [isSaving, setIsSaving] = useState<boolean>(false)
    const [status, setStatus] = useState<'loading' | 'ready' | 'recording' | 'transcribing' | 'evaluating' | 'done' | 'error'>('loading')
    const [interviewId, setInterviewId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [audioEnabled, setAudioEnabled] = useState<boolean>(true)
    const [timeLeft, setTimeLeft] = useState<number>(600)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const userVideoRef = useRef<HTMLVideoElement>(null)
    const userStreamRef = useRef<MediaStream | null>(null)

    const currentQuestion = questions[currentIdx]

    useEffect(() => {
        if (status === 'loading' || status === 'error' || status === 'done' || timeLeft <= 0) return;
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
        return () => clearInterval(timer)
    }, [status, timeLeft])

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s < 10 ? '0' : ''}${s}`
    }

    useEffect(() => {
        const loadCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true })
                userStreamRef.current = stream
                if (userVideoRef.current) userVideoRef.current.srcObject = stream
            } catch (err) {
                console.warn('Could not load user camera:', err)
            }
        }
        loadCamera()
        loadQuestions()

        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
            if (userStreamRef.current) userStreamRef.current.getTracks().forEach(t => t.stop())
        }
    }, [])

    const loadQuestions = async () => {
        setStatus('loading')
        setError(null)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000)

            let pastQuestions: string[] = []
            try { pastQuestions = JSON.parse(localStorage.getItem('hiremind_past_questions') || '[]') } catch (e) { }

            const res = await fetch('/api/generate-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: roleTitle, previousQuestions: pastQuestions }),
                signal: controller.signal
            })
            clearTimeout(timeoutId);

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to generate questions')

            setQuestions(data.questions)
            const updatedPast = [...pastQuestions, ...data.questions]
            if (updatedPast.length > 40) updatedPast.splice(0, updatedPast.length - 40)
            try { localStorage.setItem('hiremind_past_questions', JSON.stringify(updatedPast)) } catch (e) { }

            try {
                const id = await createInterview({ userId: 'user_' + Date.now(), role: roleTitle })
                setInterviewId(id)
                await updateInterview(id, { questions: data.questions })
            } catch (fbErr) {
                console.warn('Firestore fallback')
            }

            setStatus('ready')
            setTimeout(() => speakQuestion(data.questions[0]), 800)
        } catch (err: any) {
            const defaultFallback = [
                `Can you tell me about your background and experience in ${roleTitle}?`,
                `What's the most challenging project you've completed recently?`,
                `How do you handle tight deadlines and high pressure?`,
                `Tell me about a time you disagreed with a colleague on a technical decision.`,
                `What are your top three technical strengths?`
            ]
            setQuestions(defaultFallback)
            setStatus('ready')
            setTimeout(() => speakQuestion(defaultFallback[0]), 800)
        }
    }

    const fallbackBrowserTTS = useCallback((text: string) => {
        if (!window.speechSynthesis) {
            setIsPlayingAudio(false)
            return
        }
        const utterance = new SpeechSynthesisUtterance(text)
        const voices = window.speechSynthesis.getVoices()
        const voice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Female')) || voices.find(v => v.lang.startsWith('en'))
        if (voice) utterance.voice = voice
        utterance.onend = () => setIsPlayingAudio(false)
        utterance.onerror = () => setIsPlayingAudio(false)
        window.speechSynthesis.speak(utterance)
    }, [])

    const speakQuestion = useCallback(async (text: string) => {
        if (!audioEnabled || !text) return
        setIsPlayingAudio(true)
        try {
            const res = await fetch('/api/text-to-speech', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text })
            })
            if (!res.ok) throw new Error('TTS failed')
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)
            audio.onended = () => { setIsPlayingAudio(false); URL.revokeObjectURL(url) }
            audio.onerror = () => fallbackBrowserTTS(text)
            audio.play().catch(() => fallbackBrowserTTS(text))
        } catch { fallbackBrowserTTS(text) }
    }, [audioEnabled, fallbackBrowserTTS])

    const startRecording = async () => {
        setError(null); setTranscript('')
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream
            audioChunksRef.current = []
            const mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' })
            mediaRecorderRef.current = mediaRecorder
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
            mediaRecorder.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                stream.getTracks().forEach(t => t.stop())
                await transcribeAudio(blob)
            }
            mediaRecorder.start(250)
            setIsRecording(true); setStatus('recording')
        } catch (err) { setError('Microphone access denied.') }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false); setStatus('transcribing')
        }
    }

    const toggleRecording = () => isRecording ? stopRecording() : startRecording()

    const transcribeAudio = async (blob: Blob) => {
        setIsTranscribing(true)
        try {
            const formData = new FormData()
            formData.append('audio', blob, 'recording.webm')
            const res = await fetch('/api/speech-to-text', { method: 'POST', body: formData })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setTranscript(data.text || '')
            setStatus('ready')
        } catch (err: any) {
            setError(err.message || 'Transcription failed.')
            setStatus('ready')
        } finally { setIsTranscribing(false) }
    }

    const evaluateAnswer = async () => {
        if (!transcript.trim()) { setError('Please record an answer.'); return }
        setIsEvaluating(true); setStatus('evaluating'); setError(null)
        try {
            const res = await fetch('/api/evaluate-answer', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: currentQuestion, answer: transcript, role: roleTitle })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            const evalData = data.evaluation
            const newAns = [...answers, transcript]
            const newSco = [...scores, evalData.score]
            const newFdb = [...feedbacks, evalData.feedback]

            setAnswers(newAns); setScores(newSco); setFeedbacks(newFdb)
            if (interviewId) {
                try { await updateInterview(interviewId, { answers: newAns, scores: newSco, feedback: newFdb }) } catch { }
            }
            setIsEvaluating(false); goNext(newAns, newSco, newFdb)
        } catch (err: any) {
            setError(err.message); setStatus('ready'); setIsEvaluating(false)
        }
    }

    const goNext = async (newAnswers = answers, newScores = scores, newFeedbacks = feedbacks) => {
        const isLast = currentIdx === questions.length - 1
        if (isLast) {
            setIsSaving(true); setStatus('done')
            try { if (interviewId) await completeInterview(interviewId, newScores, newFeedbacks) } catch { }
            router.push(`/result?role=${role}&roleTitle=${encodeURIComponent(roleTitle)}&scores=${encodeURIComponent(JSON.stringify(newScores))}&feedback=${encodeURIComponent(JSON.stringify(newFeedbacks))}&questions=${encodeURIComponent(JSON.stringify(questions))}&answers=${encodeURIComponent(JSON.stringify(newAnswers))}${interviewId ? `&id=${interviewId}` : ''}`)
            return
        }
        const nextIdx = currentIdx + 1
        setCurrentIdx(nextIdx); setTranscript(''); setStatus('ready')
        setTimeout(() => speakQuestion(questions[nextIdx]), 500)
    }

    if (status === 'loading') return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans tracking-tight">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border border-white/20 border-t-white rounded-full animate-spin" />
                <div className="text-xs uppercase tracking-widest text-white/50">Initializing Environment...</div>
            </div>
        </div>
    )

    if (status === 'error') return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans pr-6 pl-6">
            <div className="border border-white/20 p-8 max-w-md w-full text-center flex flex-col items-center gap-6">
                <div className="text-sm text-white/50 uppercase tracking-widest">Initialization Failure</div>
                <div className="text-white font-mono text-xs">{error}</div>
                <button onClick={loadQuestions} className="bg-white text-black px-6 py-2 text-xs uppercase tracking-widest font-semibold">Retry</button>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black pb-12 overflow-hidden">
            {/* Nav */}
            <header className="px-6 py-4 flex items-center justify-between z-50 mix-blend-difference border-b border-white/10">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/')} className="text-xs font-semibold uppercase tracking-widest hover:text-white/70 flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Abort
                    </button>
                    <span className="text-white/20 text-xs">|</span>
                    <span className="text-xs uppercase tracking-widest">{roleTitle} Assessment</span>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={() => setAudioEnabled(!audioEnabled)} className="text-white/60 hover:text-white transition-colors">
                        {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> Live Session
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8">
                {/* Visual Field */}
                <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr] gap-6 items-start relative">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative border border-white/20 aspect-video bg-white/5 overflow-hidden">
                        <video ref={videoRef} autoPlay loop muted playsInline className="w-full h-full object-cover">
                            <source src="/videos/hr-interviewer.mp4" type="video/mp4" />
                        </video>
                        <div className="absolute inset-0 border border-white/10 pointer-events-none" />
                        <div className="absolute top-4 left-4 bg-black text-white text-[10px] font-mono uppercase tracking-widest px-2 py-1 border border-white/20">
                            T-MINUS {formatTime(timeLeft)}
                        </div>
                        <div className="absolute bottom-4 left-4 flex gap-3 items-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                            <div>
                                <div className="text-xs font-semibold">HR Interrogator</div>
                                <div className="text-[10px] uppercase tracking-widest text-white/50">Protocol Active</div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.6 }} className="relative border border-white/20 aspect-video bg-black overflow-hidden flex flex-col">
                        <video ref={userVideoRef} autoPlay muted playsInline className="flex-1 w-full object-cover scale-x-[-1]" />
                        <div className="absolute top-4 right-4 bg-black text-white text-[10px] font-mono px-2 py-1 flex gap-2 items-center border border-white/20">
                            Subject <div className="w-1.5 h-1.5 bg-white animate-pulse" />
                        </div>
                    </motion.div>
                </div>

                {/* Prompt Field */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="border border-white/20 p-8 flex flex-col gap-4 relative">
                    <div className="absolute top-0 right-0 p-6 text-[10px] uppercase tracking-widest text-white/30 font-mono">SEQ_0{currentIdx + 1}/0{questions.length}</div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-2">
                        {isPlayingAudio ? 'System Vocalizing...' : 'Target Prompt'}
                    </div>
                    <h2 className="text-2xl font-normal leading-tight max-w-4xl">{currentQuestion}</h2>
                </motion.div>

                {/* Response Interface */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="border border-white/20 p-8">
                    <div className="flex flex-col items-center gap-6">
                        <div className="h-12 w-full max-w-sm flex items-center justify-center">
                            {isRecording ? <AudioWave isRecording={true} /> : <div className="text-xs uppercase tracking-widest text-white/30">Awaiting audio input...</div>}
                        </div>

                        <button
                            onClick={toggleRecording}
                            disabled={isTranscribing || isEvaluating || isSaving || isPlayingAudio}
                            className={`
                                w-16 h-16 rounded-full border flex items-center justify-center transition-all duration-300
                                ${isRecording ? 'border-white bg-white text-black scale-90' : 'border-white/50 hover:border-white text-white hover:scale-110'}
                                ${(isTranscribing || isEvaluating) && 'opacity-30 cursor-not-allowed'}
                            `}
                        >
                            {isRecording ? <Square className="fill-black w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>

                        <div className="text-[10px] uppercase tracking-widest font-mono text-white/50">
                            {isRecording ? 'Recording // Tap to finalize' : isTranscribing ? 'Parsing semantics...' : isEvaluating ? 'Evaluating synthesis...' : 'Tap Mic to Respond'}
                        </div>
                    </div>

                    <AnimatePresence>
                        {transcript && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8 pt-8 border-t border-white/10 flex flex-col gap-6">
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Transcribed Response Base</div>
                                    <div className="text-sm leading-relaxed border-l border-white/20 pl-4 max-w-4xl">{transcript}</div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                                    <button onClick={() => { setTranscript(''); setError(null) }} disabled={isEvaluating} className="border border-white/20 p-4 text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors text-center">
                                        Discard & Retry
                                    </button>
                                    <button onClick={evaluateAnswer} disabled={isEvaluating} className="lg:col-span-2 bg-white text-black p-4 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                                        {isEvaluating ? 'Compiling Analysis...' : currentIdx === questions.length - 1 ? 'Finalize Assesment' : 'Submit & Advance'}
                                        {!isEvaluating && <ArrowRight className="w-4 h-4" />}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!transcript && !isRecording && !isTranscribing && (
                        <div className="mt-8 flex justify-center">
                            <button onClick={() => goNext()} className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white flex items-center gap-2 transition-colors">
                                <SkipForward className="w-3 h-3" /> Bypass Question
                            </button>
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    )
}

export default function InterviewPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center tracking-tight">
                <div className="w-8 h-8 border border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        }>
            <InterviewContent />
        </Suspense>
    )
}
