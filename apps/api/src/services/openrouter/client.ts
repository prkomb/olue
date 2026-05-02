import OpenAI from 'openai'
import { config } from '../../config.js'

export const openrouter = new OpenAI({
  apiKey: config.OPENROUTER_API_KEY,
  baseURL: config.OPENROUTER_BASE_URL,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/olue',
    'X-Title': 'olue',
  },
})
