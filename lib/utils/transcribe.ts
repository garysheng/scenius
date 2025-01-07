import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const file = new File([buffer], 'audio.wav', { type: 'audio/wav' })

    console.log('Sending to OpenAI Whisper API...')

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en'
    })

    if (!transcription.text) {
      throw new Error('No transcription text returned')
    }

    console.log('Whisper transcription successful:', transcription.text.substring(0, 100) + '...')
    return transcription.text
  } catch (error) {
    console.error('Error transcribing audio:', error)
    throw error
  }
} 