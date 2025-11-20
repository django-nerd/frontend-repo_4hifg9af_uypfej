import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'

// Exclusions for the ZIP
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'logs', '__pycache__'])
const EXCLUDE_FILES = new Set(['.DS_Store'])

async function zipDirectory(baseDir) {
  const zip = new JSZip()
  async function addDir(currentDir, zipFolder, base) {
    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        // skip hidden files/dirs except .env files we might include explicitly later
        if (entry.name !== '.env' && entry.name !== '.env.local') continue
      }
      if (entry.isDirectory()) {
        if (EXCLUDE_DIRS.has(entry.name)) continue
        const nextDir = path.join(currentDir, entry.name)
        const nextZip = zipFolder.folder(entry.name)
        await addDir(nextDir, nextZip, base)
      } else {
        if (EXCLUDE_FILES.has(entry.name)) continue
        const fullPath = path.join(currentDir, entry.name)
        if (fullPath.includes(`${path.sep}logs${path.sep}`)) continue
        try {
          const data = await fs.promises.readFile(fullPath)
          const rel = path.relative(base, fullPath)
          zip.file(rel, data)
        } catch (e) {
          // ignore unreadable files
        }
      }
    }
  }
  await addDir(baseDir, zip, baseDir)
  const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  return content
}

function exportPlugin() {
  return {
    name: 'frontend-export-plugin',
    configureServer(server) {
      server.middlewares.use('/export/frontend.zip', async (req, res) => {
        try {
          const projectRoot = server.config.root || process.cwd()
          const zipBuffer = await zipDirectory(projectRoot)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/zip')
          res.setHeader('Content-Disposition', 'attachment; filename=frontend.zip')
          res.end(zipBuffer)
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ detail: `zip error: ${String(e)}` }))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), exportPlugin()],
  optimizeDeps: {
    // Exclude packages that shouldn't be pre-bundled
    exclude: [],
    // Entries point for dependency pre-bundling
    entries: ['./src/**/*.{js,jsx,ts,tsx}'],
    // Hold the first optimizeDeps run until all dependencies are discovered
    holdUntilCrawlEnd: true
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    hmr: false,
    watch: false,
    cors: {
      origin: '*',
      credentials: true
    },
    allowedHosts: [
      '.modal.host',
      'localhost',
      '127.0.0.1'
    ]
  }
})
