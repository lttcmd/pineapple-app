// Development: http://192.168.1.78:3000
// Production: https://your-app.ondigitalocean.app (replace with your actual DigitalOcean URL)
export const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || "http://192.168.0.20:3000";

// The Socket.IO endpoint will use the same origin.
// RN connects as: io(SERVER_URL, { auth: { token } })
