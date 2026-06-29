import type { ExpoConfig } from 'expo/config'

const appName = process.env.APP_NAME ?? 'OnTime'
const bundleId = process.env.BUNDLE_ID ?? 'com.ontime.app'
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'

const config: ExpoConfig = {
  name: appName,
  slug: 'ontime',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#2563eb',
  },
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: bundleId,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'OnTime uses your location to verify your position when clocking in and out.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'OnTime uses your location to automatically detect when you arrive at or leave a job site.',
      NSLocationAlwaysUsageDescription:
        'OnTime uses background location to track time while you are clocked in.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#2563eb',
    },
    package: bundleId,
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
    ],
  },
  plugins: [
    'expo-router',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'OnTime tracks your location while clocked in to verify job site attendance.',
        locationWhenInUsePermission:
          'OnTime uses your location when clocking in and out.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#2563eb',
      },
    ],
  ],
  extra: {
    apiUrl,
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '',
    },
  },
  scheme: 'ontime',
}

export default config
