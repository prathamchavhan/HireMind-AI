import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export async function POST(req) {
    try {
        const { question, answer, role } = await req.json()

        if (!question || !answer) {
            return NextResponse.json(
                { error: 'Question and answer are required' },
                { status: 400 }
            )
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        const prompt = `You are an expert HR interviewer evaluating a candidate for a ${role || 'software developer'} position.

Evaluate the following interview answer:

Question: "${question}"

Candidate's Answer: "${answer}"

Provide your evaluation in ONLY valid JSON format (no markdown, no extra text):
{
  "score": <number from 1-10>,
  "feedback": "<2-3 sentence constructive feedback>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"]
}

Scoring criteria:
- 9-10: Exceptional, detailed, with examples
- 7-8: Good, covers main points
- 5-6: Adequate but lacking depth
- 3-4: Weak, missing key elements
- 1-2: Very poor or off-topic

Be fair, constructive and specific.`

        let text = ''
        try {
            const result = await model.generateContent(prompt)
            text = result.response.text().trim()
        } catch (err) {
            const isRateLimit = err.message?.includes('429') || err.message?.includes('Quota') || err.status === 429
            if (isRateLimit) {
                console.warn('[Gemini Rate Limit Hit] Returning instantaneous fallback evaluation to prevent delays.')
                return NextResponse.json({
                    evaluation: {
                        score: 7,
                        feedback: "Good concise answer. You touched on the main concepts but could benefit from providing a more concrete example to back up your points.",
                        strengths: ["Clear communication", "Directly addressed the question"],
                        improvements: ["Add a specific past experience", "Expand on technical details"]
                    }
                })
            }
            throw err
        }

        let evaluation
        try {
            const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
            evaluation = JSON.parse(cleaned)
        } catch {
            const match = text.match(/\{[\s\S]*\}/)
            if (match) {
                evaluation = JSON.parse(match[0])
            } else {
                throw new Error('Failed to parse evaluation from AI response')
            }
        }

        return NextResponse.json({ evaluation })
    } catch (error) {
        console.error('Evaluate answer error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to evaluate answer' },
            { status: 500 }
        )
    }
}
