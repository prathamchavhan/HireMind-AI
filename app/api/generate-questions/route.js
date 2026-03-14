import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export async function POST(req) {
    try {
        const { role, previousQuestions = [] } = await req.json()

        if (!role) {
            return NextResponse.json({ error: 'Role is required' }, { status: 400 })
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-pro' })

        let avoidPrompt = '';
        if (previousQuestions.length > 0) {
            avoidPrompt = `\nCRITICAL: DO NOT ASK any of these past questions. You must generate completely NEW and UNIQUE questions:\n${previousQuestions.slice(-40).map(q => "- " + q).join('\n')}\n`
        }

        const prompt = `You are an expert HR interview coach. Generate exactly 5 professional interview questions for a ${role} position.

Mix of question types:
- 1 HR/behavioral question (e.g. teamwork, strengths, challenges)
- 2 technical questions specific to ${role}
- 1 problem-solving/situational question
- 1 career growth question
${avoidPrompt}
Return ONLY a valid JSON array of strings, no markdown, no extra text.
Example format: ["Question 1?", "Question 2?", ...]

Generate varied, realistic, professional, and entirely fresh questions.`

        let text = ''
        try {
            const result = await model.generateContent(prompt)
            text = result.response.text().trim()
        } catch (err) {
            const isRateLimit = err.message?.includes('429') || err.message?.includes('Quota') || err.status === 429
            if (isRateLimit) {
                console.warn('[Gemini Rate Limit Hit] Returning instantaneous fallback questions to prevent long delays.')
                // Immediately return fallback questions for a smoother UX
                const fallbackQuestions = [
                    `Can you tell me about a time you had to overcome a significant challenge while working on a ${role} project?`,
                    `What are your biggest strengths and weaknesses when it comes to your day-to-day work?`,
                    `How do you stay updated with the latest trends and best practices in your field?`,
                    `Can you describe a complex problem you solved recently and the approach you took?`,
                    `How do you ensure the quality and reliability of your work before delivering it?`
                ]
                return NextResponse.json({ questions: fallbackQuestions })
            }
            throw err
        }

        // Parse JSON from response
        let questions
        try {
            // Remove markdown code blocks if present
            const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
            questions = JSON.parse(cleaned)
        } catch {
            // Fallback: extract array from text
            const match = text.match(/\[[\s\S]*\]/)
            if (match) {
                questions = JSON.parse(match[0])
            } else {
                throw new Error('Failed to parse questions from AI response')
            }
        }

        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('Invalid questions format from AI')
        }

        return NextResponse.json({ questions })
    } catch (error) {
        console.error('Generate questions error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate questions' },
            { status: 500 }
        )
    }
}
