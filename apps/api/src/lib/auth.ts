import { betterAuth } from 'better-auth'
import { db } from './db'
import { env } from '../env'

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: {
    type: 'postgresql',
    url: process.env.DATABASE_URL!,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // update session if older than 1 day
  },
  trustedOrigins: ['http://localhost:3000', 'http://localhost:19006'],
})

export type AuthSession = typeof auth.$Infer.Session
