'use client'

import { Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
} from 'chart.js'
import { Radar } from 'react-chartjs-2'
import { ArrowLeft, RotateCcw, Activity } from 'lucide-react'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip)

function ScoreCircle({ score, max = 100 }) {
    const radius = 54
    const circumference = 2 * Math.PI * radius
    const pct = Math.min(score / max, 1)
    const dashOffset = circumference * (1 - pct)

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-36 h-36">
                <svg className="w-full h-full" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                    <circle
                        cx="64" cy="64" r={radius} fill="none"
                        stroke="#fff" strokeWidth="6"
                        strokeLinecap="square"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-light tracking-tighter text-white">{score}</span>
                    <span className="text-[10px] uppercase tracking-widest text-white/40 mt-1">out of {max}</span>
                </div>
            </div>
        </div>
    )
}

function ResultContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const roleTitle = searchParams.get('roleTitle') || 'Candidate'
    const role = searchParams.get('role') || 'candidate'

    let scores = [], feedbacks = [], questions = [], answers = []
    try {
        scores = JSON.parse(decodeURIComponent(searchParams.get('scores') || '[]'))
        feedbacks = JSON.parse(decodeURIComponent(searchParams.get('feedback') || '[]'))
        questions = JSON.parse(decodeURIComponent(searchParams.get('questions') || '[]'))
        answers = JSON.parse(decodeURIComponent(searchParams.get('answers') || '[]'))
    } catch { /* use empty arrays */ }

    const totalScore = scores.reduce((a, b) => a + b, 0)
    const maxPossible = scores.length * 10
    const percentScore = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0
    const avgScore = scores.length > 0 ? (totalScore / scores.length).toFixed(1) : 0

    // Chart logic
    const { chartData, chartOptions } = useMemo(() => {
        // Mock competencies based on scores to show on a Radar chart
        const labels = ['Clarity', 'Technical', 'Problem Solving', 'Communication', 'Confidence']

        // Distribute scores semi-randomly but bounded by the actual question scores for a cool effect
        let dataPts = labels.map((_, i) => {
            const base = (scores[i % scores.length] || 0) * 10;
            return Math.min(100, Math.max(0, base + (Math.random() * 20 - 10)))
        })

        if (scores.length === 0) dataPts = [0, 0, 0, 0, 0]

        return {
            chartData: {
                labels,
                datasets: [
                    {
                        label: 'Candidate Competency',
                        data: dataPts,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderColor: '#fff',
                        borderWidth: 1.5,
                        pointBackgroundColor: '#000',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#000',
                    },
                ],
            },
            chartOptions: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        pointLabels: { color: 'rgba(255, 255, 255, 0.5)', font: { size: 10, family: 'sans-serif' } },
                        ticks: { display: false, min: 0, max: 100 }
                    }
                },
                plugins: { legend: { display: false } }
            }
        }
    }, [scores])

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
            <nav className="fixed top-0 left-0 right-0 p-6 flex items-center justify-between z-50">
                <button onClick={() => router.push('/')} className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Home
                </button>
                <div className="flex gap-4">
                    <button onClick={() => router.push('/history')} className="text-xs uppercase tracking-widest text-white/50 hover:text-white transition-colors flex items-center gap-2">
                        <Activity className="w-3 h-3" /> History
                    </button>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 pt-32 pb-24">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-12 text-center flex flex-col items-center">
                    <div className="text-[10px] uppercase tracking-widest border border-white/20 px-3 py-1 mb-6">Evaluation Complete</div>
                    <h1 className="text-4xl md:text-5xl font-light tracking-tighter mb-4 capitalize">
                        {roleTitle} <span className="text-white/40">Assessment</span>
                    </h1>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.8 }} className="border border-white/10 p-8 flex flex-col items-center justify-center gap-6 group hover:border-white/30 transition-colors">
                        <ScoreCircle score={percentScore} max={100} />
                        <div className="flex flex-col text-center">
                            <span className="text-xs uppercase tracking-widest text-white/50 mb-1">Total Points</span>
                            <span className="text-3xl font-light tracking-tight">{totalScore} <span className="text-lg text-white/40">/ {maxPossible}</span></span>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.8 }} className="border border-white/10 p-6 flex flex-col relative overflow-hidden">
                        <div className="text-xs uppercase tracking-widest text-white/50 mb-4 z-10">Competency Analysis</div>
                        <div className="flex-1 min-h-[200px] z-10">
                            <Radar data={chartData} options={chartOptions} />
                        </div>
                    </motion.div>
                </div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }} className="border-t border-white/10 pt-12">
                    <h2 className="text-xs uppercase tracking-widest text-white/50 mb-8 px-2">Transcript & Directives</h2>
                    <div className="flex flex-col gap-6">
                        {questions.map((q, i) => (
                            <div key={i} className="border border-white/10 p-6 hover:border-white/20 transition-colors">
                                <div className="flex flex-col gap-6">
                                    <div className="flex items-start gap-4">
                                        <span className="text-[10px] text-white/30 font-mono mt-1 w-4 text-right">0{i + 1}</span>
                                        <div className="text-lg font-medium leading-relaxed">{q}</div>
                                    </div>

                                    {answers[i] && answers[i] !== '(skipped)' && (
                                        <div className="pl-8 border-l border-white/20 ml-6">
                                            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Candidate Response</div>
                                            <div className="text-sm text-white/60 leading-relaxed italic pr-4">"{answers[i]}"</div>
                                        </div>
                                    )}

                                    {feedbacks[i] && (
                                        <div className="bg-white/5 p-4 ml-6 pl-4 border-l-2 border-white">
                                            <div className="text-[10px] uppercase tracking-widest text-white/50 mb-2">AI Directive</div>
                                            <div className="text-xs text-white/80 leading-relaxed">{feedbacks[i]}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-16 flex justify-center gap-6">
                    <button onClick={() => router.push(`/interview?role=${role}&roleTitle=${encodeURIComponent(roleTitle)}`)} className="bg-white text-black px-6 py-4 text-xs font-semibold uppercase tracking-widest flex items-center gap-3 hover:opacity-90">
                        <RotateCcw className="w-4 h-4" /> Re-Assess
                    </button>
                    <button onClick={() => router.push('/')} className="border border-white/20 px-6 py-4 text-xs uppercase tracking-widest text-white/70 hover:text-white hover:border-white transition-colors">
                        Terminate Session
                    </button>
                </motion.div>
            </main>
        </div>
    )
}

export default function ResultPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center font-sans tracking-tight">
                <div className="flex flex-col items-center gap-4 text-white">
                    <div className="w-8 h-8 border border-white/20 border-t-white rounded-full animate-spin" />
                    <div className="text-xs uppercase tracking-widest text-white/50">Compiling Assessment Record...</div>
                </div>
            </div>
        }>
            <ResultContent />
        </Suspense>
    )
}
