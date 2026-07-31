/**
 * Serve the `api/` functions during `npm run dev`.
 *
 * Vercel runs these in production; Vite does not know about them, so without
 * this the packing list only works once deployed. This adapts a Node request
 * to the small slice of the Vercel signature our handler actually uses.
 *
 * Dev only — never imported by the built app.
 */

import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local', quiet: true })
loadEnv({ path: '.env', quiet: true })

export function serveApi() {
  return {
    name: 'wear-there-dev-api',
    apply: 'serve',

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/generate-list')) return next()

        const response = adapt(res)

        try {
          if (!process.env.ANTHROPIC_API_KEY) {
            // Without a key there is nothing to call, and failing here would
            // block all UI work on having one. The mock is confined to this
            // dev-only file: the deployed function has no such path, so a
            // fake list can never reach anyone.
            server.config.logger.warn(
              '\n  [wear-there] No ANTHROPIC_API_KEY — serving a MOCK packing list.\n' +
                '  Put the key in .env.local to generate real ones.\n',
            )
            return response.status(200).json(await mockList())
          }

          req.body = await readBody(req)
          const { default: handler } = await server.ssrLoadModule('/api/generate-list.js')
          await handler(req, response)
        } catch (error) {
          server.config.logger.error(`  [wear-there] /api failed: ${error.message}`)
          if (!res.writableEnded) response.status(500).json({ error: 'Dev API failed.' })
        }
      })
    },
  }
}

function adapt(res) {
  return {
    status(code) {
      res.statusCode = code
      return this
    },
    json(payload) {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(payload))
    },
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

/** A plausible list, shaped exactly like a real one, with a visible tell. */
async function mockList() {
  await new Promise((resolve) => setTimeout(resolve, 1800))

  return {
    categories: [
      {
        name: 'Tops',
        items: [
          { label: 'Linen shirts', quantity: 3, why: 'MOCK — feels-like 31° and you notice humidity' },
          { label: 'T-shirts', quantity: 4 },
          { label: 'Long-sleeve layer', quantity: 1, why: 'MOCK — drops to 14° after dark' },
        ],
      },
      {
        name: 'Bottoms',
        items: [
          { label: 'Light trousers', quantity: 2 },
          { label: 'Shorts', quantity: 2, why: 'MOCK — well past your 22° summer threshold' },
        ],
      },
      {
        name: 'Footwear',
        items: [
          { label: 'Sandals', quantity: 1 },
          { label: 'Trainers', quantity: 1, why: 'MOCK — for the walking days' },
        ],
      },
      {
        name: 'Accessories',
        items: [
          { label: 'Sunglasses', quantity: 1 },
          { label: 'Compact umbrella', quantity: 1, why: 'MOCK — 60% rain on Wednesday' },
        ],
      },
      {
        name: 'Essentials',
        items: [
          { label: 'Underwear', quantity: 6 },
          { label: 'Socks', quantity: 4 },
          { label: 'Sun cream', quantity: 1 },
        ],
      },
    ],
  }
}
