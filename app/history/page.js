'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getAllInterviews } from '@/lib/firestore'
import { motion } from 'framer-motion'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { ArrowLeft, Target, Award, ListChecks, TrendingUp } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

export default function HistoryPage() {
    const router = useRouter()
    const [interviews, setInterviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadHistory()
    }, [])

    const loadHistory = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await getAllInterviews()
            setInterviews(data)
        } catch (err) {
            setError('Could not load history. Make sure Firebase is configured correctly.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const { chartData, avgScoreStr, bestScoreStr, completedCount } = useMemo(() => {
        const completed = interviews.filter(i => i.completed)
        const sortedOldestFirst = [...completed].reverse()
        const recentLimit = sortedOldestFirst.slice(-10) // Display up to last 10

        const labels = recentLimit.map((_, i) => `S-${i + 1}`)
        const scores = recentLimit.map(i => Math.round((i.averageScore || 0) * 10))

        const cData = {
            labels,
            datasets: [{
                fill: true,
                label: 'Session Score',
                data: scores,
                borderColor: 'rgba(255, 255, 255, 1)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#fff',
                borderWidth: 2,
            }]
        }

        const avgScore = interviews.length > 0
            ? Math.round(interviews.reduce((a, i) => a + (i.averageScore || 0), 0) / interviews.length * 10)
            : 0
        const bestScore = interviews.length > 0
            ? Math.max(...interviews.map(i => Math.round(i.averageScore * 10 || 0)))
            : 0

        return { chartData: cData, avgScoreStr: `${avgScore}%`, bestScoreStr: `${bestScore}%`, completedCount: completed.length }
    }, [interviews])

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: '#000', titleColor: '#fff', bodyColor: '#fff', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1, displayColors: false },
        },
        scales: {
            y: { display: false, min: 0, max: 100 },
            x: { grid: { display: false, drawBorder: false }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } } },
        },
        interaction: { mode: 'index', intersect: false },
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans tracking-tight">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border border-white/20 border-t-white rounded-full animate-spin" />
                    <div className="text-xs uppercase tracking-widest text-white/50">Fetching Archives...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black pb-24">
            <nav className="fixed top-0 left-0 right-0 p-6 flex items-center justify-between z-50 mix-blend-difference">
                <button onClick={() => router.push('/')} className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Home
                </button>
                <div className="text-lg font-bold tracking-tight">HireMind Intelligence</div>
            </nav>

            <main className="max-w-6xl mx-auto px-6 pt-32">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter mb-4">Interview History.</h1>
                    <p className="text-white/50 max-w-xl text-sm leading-relaxed">
                        A strictly objective record of your performance. Observe trends, identify regressions, and optimize your delivery.
                    </p>
                </motion.div>

                {error ? (
                    <div className="border border-white/20 p-6 flex items-center justify-between">
                        <div className="text-white/60 text-sm">{error}</div>
                        <button onClick={loadHistory} className="border border-white px-4 py-2 text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-colors">
                            Retry
                        </button>
                    </div>
                ) : interviews.length === 0 ? (
                    <div className="border border-white/20 p-12 flex flex-col items-center justify-center gap-6 text-center">
                        <div className="text-white/40 text-sm max-w-xs">No records found. The intelligence has not yet assessed your capabilities.</div>
                        <button onClick={() => router.push('/')} className="bg-white text-black px-6 py-3 text-xs font-semibold uppercase tracking-widest hover:opacity-90 transition-opacity">
                            Initiate First Session
                        </button>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-[1fr_2fr] gap-12">
                        {/* Summary & Chart */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }} className="flex flex-col gap-8">
                            <div className="grid grid-cols-2 gap-px bg-white/10 border border-white/10">
                                {[
                                    { label: 'Total Sessions', v: interviews.length, ic: Target },
                                    { label: 'Completed', v: completedCount, ic: ListChecks },
                                    { label: 'Avg Accuracy', v: avgScoreStr, ic: TrendingUp },
                                    { label: 'Peak Capacity', v: bestScoreStr, ic: Award },
                                ].map((s, i) => (
                                    <div key={i} className="bg-black p-6 flex flex-col gap-4">
                                        <s.ic className="w-4 h-4 text-white/50" />
                                        <div>
                                            <div className="text-2xl font-light">{s.v}</div>
                                            <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1">{s.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border border-white/10 p-6">
                                <div className="text-xs uppercase tracking-widest text-white/50 mb-6">Performance Trajectory</div>
                                {completedCount > 1 ? (
                                    <div className="h-48 w-full"><Line data={chartData} options={chartOptions} /></div>
                                ) : (
                                    <div className="h-48 flex items-center justify-center text-white/30 text-xs">Insufficient data for trajectory.</div>
                                )}
                            </div>
                        </motion.div>

                        {/* List */}
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="flex flex-col gap-4">
                            {interviews.map((session, idx) => {
                                const pct = Math.round((session.averageScore || 0) * 10)
                                const dateStr = session.createdAt?.toDate ? session.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'

                                return (
                                    <div key={session.id} className="group border border-white/10 hover:border-white/40 transition-colors p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold text-sm capitalize">{session.role} <span className="text-white/40 font-normal">Candidate</span></span>
                                                {session.completed ? (
                                                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-white text-black font-semibold">Completed</span>
                                                ) : (
                                                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 border border-white/30 text-white/60">Partial</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-white/40">{dateStr} • {session.questions?.length || 0} Questions</div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="hidden sm:flex flex-col items-end gap-1">
                                                <div className="h-1 w-24 bg-white/10 overflow-hidden">
                                                    <div className="h-full bg-white transition-all duration-1000" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                            <div className="text-right min-w-[3rem]">
                                                <div className="text-lg font-light">{pct}<span className="text-xs text-white/50">%</span></div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </motion.div>
                    </div>
                )}
            </main>
        </div>
    )
}
