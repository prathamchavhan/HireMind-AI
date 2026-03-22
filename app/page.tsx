'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Filler,
    ChartData,
    ChartOptions
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { ArrowRight, Activity, Code2, Database, LayoutTemplate, Briefcase, LucideIcon } from 'lucide-react'

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Filler
)

interface Role {
    id: string;
    title: string;
    icon: LucideIcon;
    desc: string;
}

const roles: Role[] = [
    { id: 'python-developer', title: 'Python Developer', icon: Code2, desc: 'Backend & Algorithms' },
    { id: 'react-developer', title: 'React Developer', icon: LayoutTemplate, desc: 'Frontend & UI' },
    { id: 'data-analyst', title: 'Data Analyst', icon: Database, desc: 'Analytics & SQL' },
]

export default function HomePage() {
    const router = useRouter()
    const [selectedRole, setSelectedRole] = useState<Role | null>(null)
    const [customRole, setCustomRole] = useState<string>('')
    const [loading, setLoading] = useState<boolean>(false)
    const [mounted, setMounted] = useState<boolean>(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleStart = async () => {
        const roleId = customRole.trim() ? customRole.toLowerCase().replace(/\s+/g, '-') : selectedRole?.id
        const roleTitle = customRole.trim() ? customRole.trim() : selectedRole?.title

        if (!roleId || !roleTitle) return
        setLoading(true)
        router.push(`/interview?role=${roleId}&roleTitle=${encodeURIComponent(roleTitle)}`)
    }

    // Determine if start button is clickable
    const canStart = Boolean(selectedRole || customRole.trim())

    // Config for the display chart
    const chartData: ChartData<'line'> = {
        labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
        datasets: [
            {
                fill: true,
                label: 'Candidate Score',
                data: [45, 60, 75, 85, 95],
                borderColor: 'rgba(255, 255, 255, 1)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#fff',
                borderWidth: 2,
            },
        ],
    }

    const chartOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#000',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: 'rgba(255,255,255,0.2)',
                borderWidth: 1,
                displayColors: false,
            },
        },
        scales: {
            y: { display: false, min: 0, max: 100 },
            x: {
                border: { display: false },
                grid: { display: false },
                ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 12 } },
            },
        },
        interaction: { mode: 'index', intersect: false },
    }

    if (!mounted) return null

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
            {/* Navbar overlay */}
            <nav className="fixed top-0 left-0 right-0 p-6 flex items-center justify-between z-50 mix-blend-difference">
                <div className="text-lg font-bold tracking-tight">HireMind</div>
                <button
                    onClick={() => router.push('/history')}
                    className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center gap-2"
                >
                    <Activity className="w-4 h-4" /> History
                </button>
            </nav>

            <main className="max-w-6xl mx-auto px-6 pt-32 pb-24 grid lg:grid-cols-2 gap-16 items-center min-h-screen">

                {/* Left Side: Content & Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col gap-10"
                >
                    <div className="flex flex-col gap-4">
                        <h1 className="text-5xl md:text-7xl font-semibold tracking-tighter leading-[1.1]">
                            Human-grade interviews, <br />scaled by AI.
                        </h1>
                        <p className="text-lg text-white/60 max-w-md leading-relaxed">
                            Conduct targeted, dynamic assessments using a purely neutral, highly calibrated intelligence. Five core questions to uncover true capability.
                        </p>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-3">
                            <label className="text-xs font-semibold uppercase tracking-widest text-white/50">Custom Role Definition</label>
                            <div className="relative group">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-white transition-colors" />
                                <input
                                    type="text"
                                    placeholder="e.g. Senior DevOps Engineer"
                                    value={customRole}
                                    onChange={(e) => {
                                        setCustomRole(e.target.value)
                                        setSelectedRole(null)
                                    }}
                                    className="w-full bg-transparent border border-white/20 rounded-none px-12 py-4 text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/30"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-4">
                                <div className="h-px bg-white/20 flex-1"></div>
                                <span className="text-xs font-semibold uppercase tracking-widest text-white/50">Or select standard</span>
                                <div className="h-px bg-white/20 flex-1"></div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {roles.map((role) => {
                                    const isSelected = selectedRole?.id === role.id && !customRole
                                    return (
                                        <button
                                            key={role.id}
                                            onClick={() => {
                                                setSelectedRole(role)
                                                setCustomRole('')
                                            }}
                                            className={`
                        text-left p-4 border transition-all duration-300 flex flex-col gap-2
                        ${isSelected ? 'bg-white text-black border-white' : 'bg-transparent border-white/20 hover:border-white/60 text-white'}
                      `}
                                        >
                                            <role.icon className="w-5 h-5 mb-1" strokeWidth={isSelected ? 2 : 1.5} />
                                            <div>
                                                <div className="font-medium text-sm">{role.title}</div>
                                                <div className={`text-xs mt-1 ${isSelected ? 'text-black/60' : 'text-white/40'}`}>
                                                    {role.desc}
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <button
                            onClick={handleStart}
                            disabled={!canStart || loading}
                            className={`
                mt-4 py-4 px-8 border text-sm font-semibold uppercase tracking-widest flex items-center justify-between transition-all duration-500
                ${(!canStart || loading)
                                    ? 'opacity-40 cursor-not-allowed border-white/20 text-white/50'
                                    : 'bg-white text-black hover:bg-white/90 border-white hover:pl-10'
                                }
              `}
                        >
                            <span>{loading ? 'Initializing Interface...' : 'Commence Interview'}</span>
                            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                        </button>
                    </div>
                </motion.div>

                {/* Right Side: Abstract Data Viz */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="hidden lg:flex flex-col gap-6"
                >
                    <div className="border border-white/10 p-8 flex flex-col gap-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 font-mono text-9xl leading-none -mt-4 uppercase pointer-events-none">
                            AI
                        </div>

                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">Session Intelligence</div>
                                <div className="text-2xl font-light">Real-time Trajectory Evaluation</div>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-light">95<span className="text-lg text-white/50">%</span></div>
                                <div className="text-xs uppercase tracking-widest text-white/40 mt-1">Peak Confidence</div>
                            </div>
                        </div>

                        <div className="h-64 w-full mt-4">
                            <Line data={chartData} options={chartOptions} />
                        </div>

                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                            <div>
                                <div className="text-white/50 text-xs uppercase tracking-widest mb-1">Latency</div>
                                <div className="font-mono text-sm">~14ms</div>
                            </div>
                            <div>
                                <div className="text-white/50 text-xs uppercase tracking-widest mb-1">Metric Focus</div>
                                <div className="font-mono text-sm">Clarity, Tone</div>
                            </div>
                            <div>
                                <div className="text-white/50 text-xs uppercase tracking-widest mb-1">Data Model</div>
                                <div className="font-mono text-sm">Gemini 2.0</div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    )
}
