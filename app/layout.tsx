import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'HireMind AI – Smart AI-Powered HR Interviews',
    description: 'Experience real-time AI-driven interviews with voice questions, speech recognition, and instant feedback powered by Gemini and Groq.',
    keywords: 'AI interview, HR interview, technical interview, speech recognition, Gemini AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
            </head>
            <body className={inter.className}>{children}</body>
        </html>
    )
}
