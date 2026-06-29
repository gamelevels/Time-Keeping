import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import { gpsQueue } from '@/lib/storage'

export const BACKGROUND_LOCATION_TASK = 'ONTIME_BACKGROUND_LOCATION'
export const GEOFENCING_TASK = 'ONTIME_GEOFENCING'

// Generates a simple local ID without Date.now()
function generateLocalId() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundLocation]', error.message)
    return
  }

  const { locations } = data as { locations: Location.LocationObject[] }

  for (const loc of locations) {
    gpsQueue.push({
      localId: generateLocalId(),
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? undefined,
      speed: loc.coords.speed ?? undefined,
      recordedAt: new Date(loc.timestamp).toISOString(),
    })
  }
})

TaskManager.defineTask(GEOFENCING_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[Geofencing]', error.message)
    return
  }

  const { region, eventType } = data as {
    region: { identifier: string }
    eventType: Location.GeofencingEventType
  }

  if (eventType === Location.GeofencingEventType.Enter) {
    // Geofence entered — app will handle clock-in prompt when foregrounded
    // Store the geofence entry event in MMKV for the app to pick up
    const { storage } = await import('@/lib/storage')
    storage.set(
      'pending_geofence_enter',
      JSON.stringify({ geofenceId: region.identifier, enteredAt: new Date().toISOString() }),
    )
  }
})

export async function startBackgroundLocationTracking(timeEntryId: string) {
  const { status } = await Location.requestBackgroundPermissionsAsync()
  if (status !== 'granted') {
    console.warn('[BackgroundLocation] Permission not granted')
    return
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK)
  if (!isRegistered) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 120_000, // 2 minutes
      distanceInterval: 50, // or when moved 50m
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'OnTime',
        notificationBody: 'Tracking location while clocked in',
        notificationColor: '#2563eb',
      },
    })
  }
}

export async function stopBackgroundLocationTracking() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK)
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
  }
}

export async function startGeofencing(
  regions: Array<{ identifier: string; latitude: number; longitude: number; radius: number }>,
) {
  if (regions.length === 0) return
  await Location.startGeofencingAsync(GEOFENCING_TASK, regions)
}

export async function stopGeofencing() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCING_TASK)
  if (isRegistered) {
    await Location.stopGeofencingAsync(GEOFENCING_TASK)
  }
}
