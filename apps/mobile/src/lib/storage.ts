import { MMKV } from 'react-native-mmkv'

export const storage = new MMKV({ id: 'ontime-storage' })

export const secureStorage = {
  get: (key: string): string | undefined => storage.getString(key),
  set: (key: string, value: string) => storage.set(key, value),
  delete: (key: string) => storage.delete(key),
}

// Offline GPS queue — append-only during active shift
export const gpsQueue = {
  getAll: (): GpsEntry[] => {
    const raw = storage.getString('gps_queue')
    return raw ? (JSON.parse(raw) as GpsEntry[]) : []
  },
  push: (entry: GpsEntry) => {
    const existing = gpsQueue.getAll()
    storage.set('gps_queue', JSON.stringify([...existing, entry]))
  },
  clear: () => storage.delete('gps_queue'),
  size: () => gpsQueue.getAll().length,
}

export type GpsEntry = {
  localId: string
  lat: number
  lng: number
  accuracy?: number
  speed?: number
  batteryLevel?: number
  recordedAt: string
  timeEntryId?: string
  synced?: boolean
}
