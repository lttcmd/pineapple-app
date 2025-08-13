# OFC Pineapple Tournament

A mobile card game built with React Native and Expo.

## Quick Deploy for Testing

### Backend Server Deployment

1. **Deploy to DigitalOcean App Platform:**
   - Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
   - Create new app
   - Connect your GitHub repo
   - **Source Directory**: Leave empty (or set to `/` for root)
   - **Build Command**: Leave empty (Dockerfile handles this)
   - **Run Command**: Leave empty (Dockerfile handles this)
   - **Dockerfile Path**: `Dockerfile` (or leave empty if Dockerfile is in root)
   - Set environment variables:
     - `NODE_ENV=production`
     - `PORT=3000`
     - `JWT_SECRET=your-secure-secret`

2. **Get your server URL** (e.g., `https://your-app-name.ondigitalocean.app`)

### Mobile App Testing

1. **Update server URL in mobile app:**
   - Edit `mobile/app/config/env.js`
   - Replace the server URL with your DigitalOcean domain

2. **Start Expo development server:**
   ```bash
   cd mobile
   npx expo start
   ```

3. **Share with friends:**
   - Friends download Expo Go from App Store/Google Play
   - Scan the QR code from your terminal
   - They can now test the app with your hosted backend!

## Development

```bash
# Start backend server
npm run dev

# Start mobile app
cd mobile
npx expo start
```

## Production Build (Optional)

When ready for production distribution:
```bash
cd mobile
npx expo build:android --type apk
npx expo build:ios --type archive
```


🔄 Switching Between Local and Online
For Online Testing:

Backend: DigitalOcean (https://seal-app-hikwk.ondigitalocean.app/)

in\Mobile: npx expo start --tunnel

Config: mobile/app/config/env.js points to DigitalOcean URL " export const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || "https://lionfish-app-b4g2i.ondigitalocean.app"; "


For Local Testing:

Backend: run npm start from root. 

\Mobile: npx expo start " export const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || "http://192.168.1.78:3000"; "

node monitor-server.js > let me look at all active rooms

node view-room.js ROOMID lets me look at the room specifically.    