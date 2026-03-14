import Groq from 'groq-sdk'
import { NextResponse } from 'next/server'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req) {
    try {
        const formData = await req.formData()
        const audioFile = formData.get('audio')

        if (!audioFile) {
            return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
        }

        // Convert to buffer for Groq
        const arrayBuffer = await audioFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Create a File-like object for Groq
        const file = new File([buffer], 'audio.webm', { type: audioFile.type || 'audio/webm' })

        const transcription = await groq.audio.transcriptions.create({
            file,
            model: 'whisper-large-v3',
            language: 'en',
            response_format: 'json',
        })

        return NextResponse.json({ text: transcription.text })
    } catch (error) {
        console.error('Speech-to-text error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to transcribe audio' },
            { status: 500 }
        )
    }
}

