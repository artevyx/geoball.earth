import type { NextConfig } from 'next';


const PWA = require('next-pwa')({
  dest: 'public', // Service worker and workbox files will be output here
  register: true, // Automatically registers the service worker
  skipWaiting: true, // Forces the waiting service worker to become active
  disable: process.env.NODE_ENV === 'development', // Disable in dev to avoid hot-reload issues
});

const config: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: [
    'nonboiling-lorilee-manageable.ngrok-free.dev',
  ],
  devIndicators: {
    position: 'bottom-right',
  },
};


export default PWA(config);
