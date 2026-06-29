import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { trpc } from '@/lib/trpc'

export default function HistoryScreen() {
  const { data: entries, isLoading } = trpc.timesheets.list.useQuery({
    page: 1,
    pageSize: 50,
  })

  function formatDuration(minutes: number | null) {
    if (!minutes) return '—'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  return (
    <FlatList
      data={entries ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No time entries yet</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.date}>
              {new Date(item.clockInAt).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <View style={[
              styles.badge,
              item.status === 'active' ? styles.badgeActive :
              item.status === 'approved' ? styles.badgeApproved : styles.badgeDefault,
            ]}>
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <View>
              <Text style={styles.label}>In</Text>
              <Text style={styles.value}>
                {new Date(item.clockInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View>
              <Text style={styles.label}>Out</Text>
              <Text style={styles.value}>
                {item.clockOutAt
                  ? new Date(item.clockOutAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </Text>
            </View>
            <View>
              <Text style={styles.label}>Total</Text>
              <Text style={[styles.value, styles.duration]}>{formatDuration(item.totalMinutes)}</Text>
            </View>
          </View>

          {(item.jobSiteName ?? item.costCodeCode) && (
            <View style={styles.cardFooter}>
              {item.jobSiteName && <Text style={styles.footerText}>{item.jobSiteName}</Text>}
              {item.costCodeCode && <Text style={styles.footerText}>{item.costCodeCode}</Text>}
            </View>
          )}
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#9ca3af', fontSize: 15 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  date: { fontSize: 14, fontWeight: '600', color: '#111827' },

  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  badgeActive: { backgroundColor: '#f0fdf4' },
  badgeApproved: { backgroundColor: '#eff6ff' },
  badgeDefault: { backgroundColor: '#f9fafb' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#374151' },

  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  value: { fontSize: 16, color: '#374151', fontWeight: '500' },
  duration: { color: '#2563eb', fontWeight: '700' },

  cardFooter: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  footerText: { fontSize: 12, color: '#6b7280', backgroundColor: '#f9fafb', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
})
