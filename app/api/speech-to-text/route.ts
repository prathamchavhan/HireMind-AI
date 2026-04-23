import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const audioFile = formData.get('audio') as File | null

        if (!audioFile) {
            return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
        }

        if (audioFile.size < 100) {
            return NextResponse.json({ error: 'Audio file is too small — no speech detected' }, { status: 400 })
        }

        const arrayBuffer = await audioFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Detect the correct MIME type and file extension
        const mimeType = audioFile.type || 'audio/webm'
        let fileName = audioFile.name || 'audio.webm'
        // Ensure the file has a proper extension that Whisper accepts
        if (!fileName.match(/\.(webm|mp3|mp4|m4a|wav|ogg|flac)$/i)) {
            if (mimeType.includes('mp4')) fileName = 'audio.mp4'
            else if (mimeType.includes('ogg')) fileName = 'audio.ogg'
            else if (mimeType.includes('wav')) fileName = 'audio.wav'
            else fileName = 'audio.webm'
        }

        const file = new File([buffer], fileName, { type: mimeType })

        console.log(`Transcribing: ${fileName} (${mimeType}), size: ${buffer.length} bytes`)

        const transcription = await groq.audio.transcriptions.create({
            file,
            model: 'whisper-large-v3',
            language: 'en',
            response_format: 'json',
        })

        return NextResponse.json({ text: transcription.text })
    } catch (e) {
        const error = e as any;
        console.error('Speech-to-text error:', error?.message || error)

        // Provide user-friendly error messages
        let message = 'Failed to transcribe audio. Please try again.'
        if (error?.message?.includes('api_key')) {
            message = 'Transcription service configuration error. Please check API key.'
        } else if (error?.message?.includes('rate_limit')) {
            message = 'Too many requests. Please wait a moment and try again.'
        } else if (error?.message?.includes('invalid_file') || error?.message?.includes('format')) {
            message = 'Audio format not supported. Please try a different browser.'
        }

        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
