import { VercelRequest, VercelResponse } from '@vercel/node'

export function setCorsHeaders(res: VercelResponse, origin?: string) {
  const allowedOrigins = [
    'http://localhost:5173',
    'https://autopay-vault.vercel.app',
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN
  ].filter(Boolean)
  
  const corsOrigin = origin && allowedOrigins.includes(origin) 
    ? origin 
    : allowedOrigins[0] || 'http://localhost:5173'
  
  res.setHeader('Access-Control-Allow-Origin', corsOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin as string
  setCorsHeaders(res, origin)
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return true
  }
  
  return false
}
