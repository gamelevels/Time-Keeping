import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@ontime/api/router'
import Constants from 'expo-constants'

export const trpc = createTRPCReact<AppRouter>()

const apiUrl =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:3001'

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${apiUrl}/api/trpc`,
        headers: () => {
          const token = require('./storage').secureStorage.get('auth_token')
          return token ? { Authorization: `Bearer ${token}` } : {}
        },
      }),
    ],
  })
}
