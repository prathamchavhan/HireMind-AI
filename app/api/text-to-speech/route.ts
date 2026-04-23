import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const { text, voice = 'Celeste-PlayAI' } = await req.json()

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 })
        }

        const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'playai-tts',
                input: text,
                voice: voice as 'Fritz-PlayAI',
                response_format: 'wav',
            }),
        })

        if (!response.ok) {
            const errText = await response.text()
            throw new Error(`Groq TTS API error: ${response.status} - ${errText}`)
        }

        const audioBuffer = await response.arrayBuffer()

        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/wav',
                'Content-Length': audioBuffer.byteLength.toString(),
                'Cache-Control': 'no-cache',
            },
        })
    } catch (e) {
        const error = e as any;
        console.error('Text-to-speech error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to convert text to speech' },
            { status: 500 }
        )
    }
}
