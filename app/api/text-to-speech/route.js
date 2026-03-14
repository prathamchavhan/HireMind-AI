import Groq from 'groq-sdk'
import { NextResponse } from 'next/server'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req) {
    try {
        const { text, voice = 'Fritz-PlayAI' } = await req.json()

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 })
        }

        // Groq TTS supported voices:
        // Fritz-PlayAI, Aaliyah-PlayAI, Athena-PlayAI, etc.
        const response = await groq.audio.speech.create({
            model: 'playai-tts',
            input: text,
            voice: voice,
            response_format: 'wav',
        })

        const audioBuffer = await response.arrayBuffer()

        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/wav',
                'Content-Length': audioBuffer.byteLength.toString(),
                'Cache-Control': 'no-cache',
            },
        })
    } catch (error) {
        console.error('Text-to-speech error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to convert text to speech' },
            { status: 500 }
        )
    }
}
