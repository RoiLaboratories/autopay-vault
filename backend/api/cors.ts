import { VercelRequest, VercelResponse } from '@vercel/node'

export function setCorsHeaders(res: VercelResponse) {
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
  
  res.setHeader('Access-Control-Allow-Origin', corsOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  setCorsHeaders(res)
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return true
  }
  
  return false
}
