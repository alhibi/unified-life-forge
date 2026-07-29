# Health Connect — Android setup

The app now uses `@capgo/capacitor-health` as its primary health-data source, replacing the
retired Google Fit REST integration. This document covers the one-time native Android
configuration. iOS/HealthKit is intentionally out of scope for this pass.

## 1. Bump `minSdkVersion`

Health Connect requires Android 8.0 (API 26) minimum. In `android/variables.gradle`:

```gradle
ext {
  minSdkVersion = 26
}
```

## 2. Declare permissions in `AndroidManifest.xml`

Inside `<manifest>` (before `<application>`):

```xml
<uses-permission android:name="android.permission.health.READ_STEPS" />
<uses-permission android:name="android.permission.health.READ_DISTANCE" />
<uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED" />
<uses-permission android:name="android.permission.health.READ_TOTAL_CALORIES_BURNED" />
<uses-permission android:name="android.permission.health.READ_HEART_RATE" />
<uses-permission android:name="android.permission.health.READ_SLEEP" />
<uses-permission android:name="android.permission.health.READ_EXERCISE" />

<queries>
  <package android:name="com.google.android.apps.healthdata" />
  <intent>
    <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
  </intent>
</queries>
```

## 3. Add the permissions-rationale activity

Health Connect requires a rationale activity. Inside `<application>`:

```xml
<activity-alias
  android:name="ViewPermissionUsageActivity"
  android:exported="true"
  android:targetActivity=".MainActivity"
  android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
  <intent-filter>
    <action android:name="android.intent.action.VIEW_PERMISSION_USAGE" />
    <category android:name="android.intent.category.HEALTH_PERMISSIONS" />
  </intent-filter>
</activity-alias>

<activity
  android:name="androidx.health.connect.client.PermissionController"
  android:exported="true">
  <intent-filter>
    <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
  </intent-filter>
</activity>
```

## 4. Sync and run

```bash
npm install
npx cap sync android
npx cap run android
```

## 5. Runtime flow

1. Open the Fitness tab → the Health Connect card checks availability.
2. If Health Connect is missing, the card shows an Install-from-Play link
   (`com.google.android.apps.healthdata`).
3. Tap "منح الأذونات" to open Health Connect's permission sheet.
4. Tap "مزامنة الآن" to pull the last 30 days into `fitness_daily_metrics` and
   import exercise sessions into `fitness_activities` (source = `health_connect`).
   Sessions overlapping an existing GPS activity are skipped to avoid duplicates.
5. Denied permissions? The card exposes a settings button that deep-links into
   Health Connect settings.

## Notes

- The retired Google Fit REST integration is not present in the codebase.
- iOS/HealthKit is supported by the same plugin — a later pass can enable it by
  adding `NSHealthShareUsageDescription` to `Info.plist`.
