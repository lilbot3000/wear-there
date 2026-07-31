import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { serveApi } from './dev/serve-api.js'

// https://vite.dev/config/
export default defineConfig({
  // serveApi runs the api/ functions during `npm run dev`; Vercel serves them
  // in production. It applies to `serve` only, so it is absent from builds.
  plugins: [react(), serveApi()],
})
