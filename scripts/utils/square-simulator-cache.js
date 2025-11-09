const fs = require('fs')
const path = require('path')

const CACHE_DIR = path.join(process.cwd(), '.cache')
const CACHE_FILE = path.join(CACHE_DIR, 'square-simulator.json')

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

function loadCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return {}
    }

    const raw = fs.readFileSync(CACHE_FILE, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    console.warn('Warning: Failed to read simulator cache. Starting fresh.', error.message)
    return {}
  }
}

function saveCache(data) {
  ensureCacheDir()
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf8')
}

module.exports = {
  CACHE_FILE,
  loadCache,
  saveCache
}
