import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useState, useEffect } from 'react'
import * as Location from 'expo-location'
import { trpc } from '@/lib/trpc'

export default function ClockScreen() {
  const utils = trpc.useUtils()
  const { data: activeEntry, isLoading: loadingEntry } = trpc.timesheets.getActiveEntry.useQuery()
  const { data: jobSites } = trpc.jobSites.list.useQuery()

  const [selectedJobSiteId, setSelectedJobSiteId] = useState<string | undefined>()
  const [locationStatus, setLocationStatus] = useState<'checking' | 'granted' | 'denied'>('checking')
  const [clocking, setClocking] = useState(false)

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      setLocationStatus(status === 'granted' ? 'granted' : 'denied')
    })
  }, [])

  const clockIn = trpc.timesheets.clockIn.useMutation({
    onSuccess: () => {
      utils.timesheets.getActiveEntry.invalidate()
    },
    onError: (err) => {
      Alert.alert('Clock In Failed', err.message)
    },
  })

  const clockOut = trpc.timesheets.clockOut.useMutation({
    onSuccess: () => {
      utils.timesheets.getActiveEntry.invalidate()
    },
    onError: (err) => {
      Alert.alert('Clock Out Failed', err.message)
    },
  })

  async function getCurrentLocation() {
    if (locationStatus !== 'granted') return undefined
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
      })
      return {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? undefined,
      }
    } catch {
      return undefined
    }
  }

  async function handleClockIn() {
    setClocking(true)
    try {
      const loc = await getCurrentLocation()
      await clockIn.mutateAsync({
        jobSiteId: selectedJobSiteId,
        lat: loc?.lat,
        lng: loc?.lng,
        accuracy: loc?.accuracy,
        source: 'mobile_manual',
      })
    } finally {
      setClocking(false)
    }
  }

  async function handleClockOut() {
    if (!activeEntry) return
    setClocking(true)
    try {
      const loc = await getCurrentLocation()
      await clockOut.mutateAsync({
        timeEntryId: activeEntry.id,
        lat: loc?.lat,
        lng: loc?.lng,
        accuracy: loc?.accuracy,
      })
    } finally {
      setClocking(false)
    }
  }

  const isClockedIn = !!activeEntry
  const elapsed = activeEntry
    ? Math.floor((Date.now() - new Date(activeEntry.clockInAt).getTime()) / 60_000)
    : 0
  const hours = Math.floor(elapsed / 60)
  const minutes = elapsed % 60

  if (loadingEntry) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status Card */}
      <View style={[styles.statusCard, isClockedIn ? styles.statusCardActive : styles.statusCardIdle]}>
        <Text style={styles.statusLabel}>
          {isClockedIn ? 'Currently Clocked In' : 'Not Clocked In'}
        </Text>
        {isClockedIn ? (
          <>
            <Text style={styles.duration}>
              {hours > 0 ? `${hours}h ` : ''}{minutes}m
            </Text>
            <Text style={styles.clockInTime}>
              Since {new Date(activeEntry.clockInAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </>
        ) : (
          <Text style={styles.idleText}>Tap Clock In to start your shift</Text>
        )}
      </View>

      {/* Job Site Picker (only when not clocked in) */}
      {!isClockedIn && jobSites && jobSites.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Job Site</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
            <TouchableOpacity
              style={[styles.jobChip, !selectedJobSiteId && styles.jobChipSelected]}
              onPress={() => setSelectedJobSiteId(undefined)}
            >
              <Text style={[styles.jobChipText, !selectedJobSiteId && styles.jobChipTextSelected]}>
                None
              </Text>
            </TouchableOpacity>
            {jobSites.map((site) => (
              <TouchableOpacity
                key={site.id}
                style={[styles.jobChip, selectedJobSiteId === site.id && styles.jobChipSelected]}
                onPress={() => setSelectedJobSiteId(site.id)}
              >
                <Text style={[styles.jobChipText, selectedJobSiteId === site.id && styles.jobChipTextSelected]}>
                  {site.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* GPS Status */}
      {locationStatus === 'denied' && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            Location permission denied — GPS verification unavailable
          </Text>
        </View>
      )}

      {/* Clock Button */}
      <TouchableOpacity
        style={[
          styles.clockButton,
          isClockedIn ? styles.clockButtonOut : styles.clockButtonIn,
          clocking && styles.clockButtonDisabled,
        ]}
        onPress={isClockedIn ? handleClockOut : handleClockIn}
        disabled={clocking}
        activeOpacity={0.85}
      >
        {clocking ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.clockButtonText}>
            {isClockedIn ? 'Clock Out' : 'Clock In'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  statusCard: {
    borderRadius: 16,
    padding: 28,
    marginBottom: 20,
    alignItems: 'center',
  },
  statusCardActive: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  statusCardIdle: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },

  statusLabel: { fontSize: 14, color: '#6b7280', fontWeight: '500', marginBottom: 8 },
  duration: { fontSize: 52, fontWeight: '700', color: '#2563eb', letterSpacing: -1 },
  clockInTime: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  idleText: { fontSize: 15, color: '#9ca3af', marginTop: 8 },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  jobChip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    backgroundColor: '#fff',
  },
  jobChipSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  jobChipText: { fontSize: 14, color: '#374151' },
  jobChipTextSelected: { color: '#2563eb', fontWeight: '600' },

  warning: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warningText: { color: '#92400e', fontSize: 13 },

  clockButton: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  clockButtonIn: { backgroundColor: '#2563eb' },
  clockButtonOut: { backgroundColor: '#dc2626' },
  clockButtonDisabled: { opacity: 0.6 },
  clockButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
})
