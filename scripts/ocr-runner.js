const fs = require('fs')
const path = require('path')
const https = require('https')

const TESSDATA_ROOT = path.join(__dirname, '..', 'tesseract-data')
const CACHE_DIR = path.join(TESSDATA_ROOT, 'cache')
const DATA_DIR = path.join(TESSDATA_ROOT, 'data')
const LANG_URL = 'https://github.com/tesseract-ocr/tessdata_fast/raw/main'

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        file.close()
        fs.unlink(dest, () => {})
        reject(new Error(`Failed to download ${url} (status ${res.statusCode})`))
        return
      }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', (err) => {
      file.close()
      fs.unlink(dest, () => {})
      reject(err)
    })
  })
}

async function ensureLanguageData(langCode = 'eng') {
  ensureDir(TESSDATA_ROOT)
  const trainedDataPath = path.join(TESSDATA_ROOT, `${langCode}.traineddata`)
  try {
    await fs.promises.access(trainedDataPath, fs.constants.R_OK)
    return trainedDataPath
  } catch {
    const downloadUrl = `${LANG_URL}/${langCode}.traineddata`
    await downloadFile(downloadUrl, trainedDataPath)
    return trainedDataPath
  }
}

async function runOcr(buffer, mimeType) {
  ensureDir(TESSDATA_ROOT)
  ensureDir(CACHE_DIR)
  ensureDir(DATA_DIR)
  await ensureLanguageData('eng')

  const { createWorker } = require('tesseract.js')
  const worker = await createWorker(
    'eng',
    undefined,
    {
      cachePath: CACHE_DIR,
      langPath: `${TESSDATA_ROOT.replace(/[/\\]+$/, '')}${path.sep}`,
      gzip: false,
      workerPath: path.join(__dirname, '..', 'node_modules', 'tesseract.js', 'src', 'worker-script', 'node', 'index.js'),
      corePath: path.join(__dirname, '..', 'node_modules', 'tesseract.js-core', 'tesseract-core.wasm.js')
    }
  )

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: '6' // Assume a uniform block of text to avoid OSD requirements
    })
    const { data } = await worker.recognize(buffer)
    await worker.terminate()
    return {
      text: data.text || '',
      confidence: data.confidence || 0
    }
  } catch (error) {
    await worker.terminate()
    throw error
  }
}

module.exports = { runOcr }

if (require.main === module) {
  const sendMessage = (payload) => {
    if (typeof process.send === 'function') {
      process.send(payload)
    } else {
      const channel = payload.type === 'OCR_RESULT' ? console.log : console.error
      channel(JSON.stringify(payload))
    }
  }

  process.on('message', async (message) => {
    if (!message || message.type !== 'RUN_OCR') return

    try {
      const buffer = Buffer.from(message.payload.buffer, 'base64')
      const result = await runOcr(buffer, message.payload.mimeType)
      sendMessage({ type: 'OCR_RESULT', payload: result })
      process.exit(0)
    } catch (error) {
      sendMessage({
        type: 'OCR_ERROR',
        error: error?.message || 'Unknown OCR runner error',
        stack: error?.stack
      })
      process.exit(1)
    }
  })
}
