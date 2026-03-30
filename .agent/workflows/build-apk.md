---
description: How to build and update the SmartBus Android APK
---

# Build & Update SmartBus APK

## Prerequisites
- Android Studio installed on your machine
- Node.js and npm installed
- The Render backend URL configured in `.env.production`

## Steps to Build a New APK

### 1. Update the Version Numbers
Before building, bump the version in these files:
- **`client/src/App.jsx`** → Update `APP_VERSION` (e.g., `'1.0.2'`)
- **`server/server.js`** → Update `LATEST_APP_VERSION` in `/api/app-update` endpoint to match
- **`client/android/app/build.gradle`** → Increment `versionCode` and update `versionName`

### 2. Set the Backend URL in `.env.production`
Edit `client/.env.production` and replace `YOUR-RENDER-APP-NAME` with your actual Render backend URL:
```
VITE_API_URL=https://your-actual-render-url.onrender.com/api
VITE_SOCKET_URL=https://your-actual-render-url.onrender.com
```

### 3. Build the Web App for Production
// turbo
```bash
cd client && npm run build
```

### 4. Sync with Capacitor
// turbo
```bash
cd client && npx cap sync android
```

### 5. Open in Android Studio and Build APK
// turbo
```bash
cd client && npx cap open android
```
Then in Android Studio:
- Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- Wait for the build to complete
- The APK is located at: `android/app/build/outputs/apk/debug/app-debug.apk`

### 6. Copy the APK to public/downloads
Copy the built APK to `client/public/downloads/SmartBus.apk` to make it available for download on the website.

### 7. Deploy the Updated Server
Push your server changes to Render so the `/api/app-update` endpoint has the new version number.

### 8. Deploy the Updated Website
Push your client changes to Vercel so the new APK is available at `/downloads/SmartBus.apk`.

## How the Update System Works
1. When the APK launches, it calls `/api/app-update` on your backend
2. If the server returns a newer `latestVersion` than the APK's built-in `APP_VERSION`, a banner shows
3. User taps "Download Update" → opens the APK download URL
4. Android handles the APK installation
5. **This only happens inside the APK** — the website never shows this banner
