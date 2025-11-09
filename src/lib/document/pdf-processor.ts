import fs from 'fs'
import path from 'path'
import { fork } from 'child_process'
import { InvoiceTextAnalysis } from '@/types/invoice'

// Dynamic imports for document processing libraries
let PDFParser: any = null
let pdfjsLib: any = null

const TESSERACT_DATA_DIR = path.join(process.cwd(), 'tesseract-data')
const TESSERACT_LANG_URL = 'https://github.com/tesseract-ocr/tessdata_fast/raw/main'
const OCR_RUNNER_PATH = path.join(process.cwd(), 'scripts', 'ocr-runner.js')

async function ensureDirectory(dirPath: string) {
  await fs.promises.mkdir(dirPath, { recursive: true })
}

async function ensureTesseractLanguageData(langCode: string) {
  const trainedDataPath = path.join(TESSERACT_DATA_DIR, `${langCode}.traineddata`)
  try {
    await fs.promises.access(trainedDataPath, fs.constants.R_OK)
    return trainedDataPath
  } catch {
    await ensureDirectory(TESSERACT_DATA_DIR)
    const downloadUrl = `${TESSERACT_LANG_URL}/${langCode}.traineddata`
    console.log(`⬇️ Downloading Tesseract language data from ${downloadUrl}`)
    const response = await fetch(downloadUrl)
    if (!response.ok) {
      throw new Error(`Failed to download ${langCode}.traineddata.gz (${response.status})`)
    }
    const arrayBuffer = await response.arrayBuffer()
    await fs.promises.writeFile(trainedDataPath, Buffer.from(arrayBuffer))
    console.log(`✅ Downloaded ${langCode}.traineddata to ${trainedDataPath}`)
    return trainedDataPath
  }
}

async function getPdfParser() {
  if (!PDFParser) {
    try {
      const pdf2jsonModule = await import('pdf2json')
      PDFParser = pdf2jsonModule.default
      console.log('✅ pdf2json library loaded successfully')
    } catch (error: any) {
      console.error('Failed to load pdf2json:', error)
      throw new Error(`PDF parsing library not available: ${error.message}`)
    }
  }
  return PDFParser
}

async function getPdfJs() {
  if (!pdfjsLib) {
    try {
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
      if (pdfjsLib?.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = ''
      }
      console.log('✅ pdfjs-dist fallback library loaded successfully')
    } catch (error: any) {
      console.error('Failed to load pdfjs-dist:', error)
      throw new Error(`PDF fallback parser not available: ${error.message}`)
    }
  }
  return pdfjsLib
}

interface OcrRunnerMessage {
  type: 'RUN_OCR'
  payload: {
    buffer: string
    mimeType: string
  }
}

interface OcrRunnerResponse {
  type: 'OCR_RESULT'
  payload: {
    text: string
    confidence?: number
  }
}

async function runOcrInIsolatedProcess(buffer: Buffer, mimeType: string) {
  return new Promise<{ text: string; confidence?: number }>((resolve, reject) => {
    const child = fork(OCR_RUNNER_PATH, [], {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      env: {
        ...process.env,
        TESSDATA_PREFIX: TESSERACT_DATA_DIR
      }
    })

    let settled = false

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        child.kill()
        reject(new Error('OCR processing timeout after 3 minutes'))
      }
    }, 180000)

    const cleanup = () => {
      clearTimeout(timeout)
      child.removeAllListeners('message')
      child.removeAllListeners('error')
      child.removeAllListeners('exit')
    }

    child.on('message', (message: OcrRunnerResponse | { type: 'OCR_ERROR'; error: string }) => {
      if (settled) return
      if (!message) return

      if (message.type === 'OCR_RESULT') {
        settled = true
        cleanup()
        resolve(message.payload)
        child.kill()
      } else if (message.type === 'OCR_ERROR') {
        settled = true
        cleanup()
        reject(new Error(message.error || 'OCR runner failed'))
        child.kill()
      }
    })

    child.on('error', (error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    })

    child.on('exit', (code) => {
      if (settled) return
      if (code === 0) {
        settled = true
        cleanup()
        reject(new Error('OCR runner exited without returning a result'))
      } else {
        settled = true
        cleanup()
        reject(new Error(`OCR runner exited with code ${code}`))
      }
    })

    const message: OcrRunnerMessage = {
      type: 'RUN_OCR',
      payload: {
        buffer: buffer.toString('base64'),
        mimeType
      }
    }

    child.send(message)
  })
}

export interface DocumentProcessingResult {
  success: boolean
  text?: string
  rawText?: string
  cleanText?: string
  analysis?: InvoiceTextAnalysis
  metadata?: {
    pages: number
    fileSize: number
    extractionMethod: string
    confidence?: number // OCR confidence score
    needsOcr?: boolean
  }
  errors?: string[]
}

export interface InvoiceTextValidationResult {
  isValid: boolean
  confidence: number
  indicators: string[]
  warnings: string[]
  keywordMatches: number
  priceMatchCount: number
  dateMatchCount: number
  lineItemMatchCount: number
}

/**
 * Extract text from image buffer using OCR
 */
export async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<DocumentProcessingResult> {
  try {
    console.log('🖼️ Starting OCR text extraction, size:', buffer.length, 'type:', mimeType)

    // Check image size - very large images can cause timeouts
    if (buffer.length > 10 * 1024 * 1024) { // 10MB
      console.log('⚠️ Large image detected, may take longer to process')
    }

    await ensureDirectory(TESSERACT_DATA_DIR)
    await ensureTesseractLanguageData('eng')

    const { text, confidence } = await runOcrInIsolatedProcess(buffer, mimeType)
    const extractedText = text.trim()

    if (!extractedText || extractedText.length < 10) {
      return {
        success: false,
        errors: ['Image appears to contain no readable text. Ensure the image is clear and contains text.']
      }
    }

    console.log('✅ OCR text extraction completed, length:', extractedText.length)
    console.log('📊 OCR confidence:', confidence)

    return {
      success: true,
      text: extractedText,
      metadata: {
        pages: 1,
        fileSize: buffer.length,
        extractionMethod: 'tesseract-ocr',
        confidence
      }
    }
  } catch (error: any) {
    console.error('OCR setup error:', error)
    return {
      success: false,
      errors: [`OCR extraction failed: ${error.message}`]
    }
  }
}

/**
 * Extract text from PDF buffer
 */
async function extractWithPdf2Json(buffer: Buffer): Promise<DocumentProcessingResult> {
  console.log('📄 Starting PDF text extraction with pdf2json, size:', buffer.length)
  const Pdf2Json = await getPdfParser()
  const pdfParser = new Pdf2Json(null, true)

  return new Promise((resolve, reject) => {
    let extractedText = ''

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        if (pdfData.Pages && pdfData.Pages.length > 0) {
          for (const page of pdfData.Pages) {
            if (page.Texts && page.Texts.length > 0) {
              for (const textBlock of page.Texts) {
                if (textBlock.R && textBlock.R.length > 0) {
                  for (const textRun of textBlock.R) {
                    if (textRun.T) {
                      extractedText += decodeURIComponent(textRun.T) + ' '
                    }
                  }
                }
              }
              extractedText += '\n'
            }
          }
        }

        const cleanedText = extractedText.trim()
        if (!cleanedText || cleanedText.length < 10) {
          reject(new Error('PDF appears to contain no extractable text'))
          return
        }

        console.log('✅ PDF text extraction completed via pdf2json, length:', cleanedText.length)
        resolve({
          success: true,
          text: cleanedText,
          metadata: {
            pages: pdfData.Pages?.length || 1,
            fileSize: buffer.length,
            extractionMethod: 'pdf2json'
          }
        })
      } catch (error) {
        reject(error)
      }
    })

    pdfParser.on('pdfParser_dataError', (error: any) => {
      reject(new Error(error.parserError || error.message || 'Unknown pdf2json error'))
    })

    pdfParser.parseBuffer(buffer)
  })
}

async function extractWithPdfJs(buffer: Buffer): Promise<DocumentProcessingResult> {
  console.log('📄 Falling back to pdfjs-dist for text extraction')
  const pdfjs = await getPdfJs()
  const loadingTask = pdfjs.getDocument({ data: buffer })

  try {
    const doc = await loadingTask.promise
    let extractedText = ''

    const totalPages = doc.numPages || 1

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => (item.str ? item.str : ''))
        .join(' ')

      extractedText += pageText + '\n'
    }

    await doc.destroy?.()

    const cleanedText = extractedText.trim()
    if (!cleanedText || cleanedText.length < 10) {
      throw new Error('PDF fallback produced insufficient text')
    }

    return {
      success: true,
      text: cleanedText,
      metadata: {
        pages: totalPages,
        fileSize: buffer.length,
        extractionMethod: 'pdfjs-dist'
      }
    }
  } finally {
    await loadingTask.destroy()
  }
}

export async function extractTextFromPDF(buffer: Buffer): Promise<DocumentProcessingResult> {
  try {
    return await extractWithPdf2Json(buffer)
  } catch (primaryError: any) {
    console.warn('⚠️ pdf2json extraction failed, trying pdfjs-dist fallback:', primaryError.message)
    try {
      return await extractWithPdfJs(buffer)
    } catch (fallbackError: any) {
      console.error('❌ PDF fallback extraction failed:', fallbackError)
      return {
        success: false,
        errors: [
          `PDF extraction failed: ${primaryError.message}`,
          `Fallback error: ${fallbackError.message}`
        ]
      }
    }
  }
}

/**
 * Download and process invoice file (PDF or image) from Supabase Storage URL or path
 */
export async function processInvoiceFile(fileUrl: string, fileType: string, filePath?: string): Promise<DocumentProcessingResult> {
  try {
    console.log('🔄 Processing invoice file:', fileUrl, 'type:', fileType)

    // Determine processing method based on file type
    const isPdf = fileType === 'application/pdf' || fileUrl.toLowerCase().endsWith('.pdf')
    const isImage = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(fileType) ||
                    /\.(png|jpg|jpeg|webp)$/i.test(fileUrl)

    if (!isPdf && !isImage) {
      console.log('❌ Unsupported file type:', fileType)
      return {
        success: false,
        errors: ['Only PDF files and images (PNG, JPG, JPEG, WebP) are supported for text extraction.']
      }
    }

    // Try to download using Supabase client first if we have a path
    let buffer: Buffer

    if (filePath) {
      try {
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()
        
        console.log('📥 Downloading file via Supabase client:', filePath)
        const { data, error } = await supabase.storage
          .from('invoices')
          .download(filePath)

        if (error) {
          console.log('❌ Supabase download failed:', error.message)
          throw error
        }

        const arrayBuffer = await data.arrayBuffer()
        buffer = Buffer.from(arrayBuffer)
        console.log('✅ File downloaded via Supabase client, size:', buffer.length)
      } catch (supabaseError) {
        console.log('⚠️ Supabase download failed, trying direct fetch:', supabaseError)
        // Fall back to direct fetch
        const response = await fetch(fileUrl)
        
        if (!response.ok) {
          console.log('❌ File download failed:', response.status, response.statusText)
          return {
            success: false,
            errors: [`Failed to download file: ${response.status} ${response.statusText}`]
          }
        }

        const arrayBuffer = await response.arrayBuffer()
        buffer = Buffer.from(arrayBuffer)
        console.log('✅ File downloaded via direct fetch, size:', buffer.length)
      }
    } else {
      // Direct fetch fallback
      console.log('📥 Downloading file from:', fileUrl)
      const response = await fetch(fileUrl)
      
      if (!response.ok) {
        console.log('❌ File download failed:', response.status, response.statusText)
        return {
          success: false,
          errors: [`Failed to download file: ${response.status} ${response.statusText}`]
        }
      }

      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      console.log('✅ File downloaded successfully, size:', buffer.length)
    }

    // Extract text based on file type
    let result: DocumentProcessingResult
    
    if (isPdf) {
      console.log('📄 Processing as PDF document')
      result = await extractTextFromPDF(buffer)
    } else if (isImage) {
      console.log('🖼️ Processing as image with OCR')
      result = await extractTextFromImage(buffer, fileType)
    } else {
      return {
        success: false,
        errors: ['Unsupported file type for processing']
      }
    }
    
    if (!result.success || !result.text) {
      return result
    }

    // Additional text cleanup + normalization for invoice processing
    const rawText = result.text || ''
    const cleanedText = cleanExtractedText(rawText)
    const { normalizedText, normalizationSteps } = normalizeInvoiceText(cleanedText)
    const validation = validateInvoiceText(normalizedText)
    const analysis = buildTextAnalysis({
      normalizedText,
      rawText,
      validation,
      metadata: result.metadata,
      normalizationSteps
    })

    const metadata = result.metadata ? { ...result.metadata } : undefined
    if (metadata) {
      metadata.needsOcr = analysis.needs_ocr || false
    }

    return {
      ...result,
      metadata,
      rawText,
      text: normalizedText,
      cleanText: normalizedText,
      analysis
    }

  } catch (error: any) {
    console.error('File processing error:', error)
    return {
      success: false,
      errors: [`File processing failed: ${error.message}`]
    }
  }
}

/**
 * Clean and normalize extracted text for better AI parsing
 */
function cleanExtractedText(text: string): string {
  if (!text) return ''

  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\t+/g, '  ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]{3,}/g, '  ')
    .trim()
}

interface NormalizationResult {
  normalizedText: string
  normalizationSteps: string[]
}

function normalizeInvoiceText(text: string): NormalizationResult {
  if (!text) {
    return { normalizedText: '', normalizationSteps: [] }
  }

  let normalized = text
  const normalizationSteps: string[] = []

  const applyReplacement = (
    source: string,
    pattern: RegExp,
    replacer: string | ((match: string, ...groups: string[]) => string),
    note: string
  ) => {
    let replaced = false
    const next = source.replace(pattern, (match: string, ...args: string[]) => {
      replaced = true
      if (typeof replacer === 'function') {
        return replacer(match, ...args)
      }
      return replacer
    })
    if (replaced) {
      normalizationSteps.push(note)
    }
    return next
  }

  normalized = applyReplacement(normalized, /[\u201C\u201D]/g, '"', 'normalized curly double quotes')
  normalized = applyReplacement(normalized, /[\u2018\u2019]/g, '\'', 'normalized curly single quotes')
  normalized = applyReplacement(normalized, /—/g, '-', 'converted em dash to hyphen')
  normalized = applyReplacement(normalized, /(\d)O(\d)/g, (_match: string, left: string, right: string) => `${left}0${right}`, 'fixed OCR O→0 between digits')
  normalized = applyReplacement(normalized, /(\d)[lI](\d)/g, (_match: string, left: string, right: string) => `${left}1${right}`, 'fixed OCR l/I→1 between digits')
  normalized = applyReplacement(normalized, /\$(\s+)(\d)/g, (_match: string, _spaces: string, digit: string) => `$${digit}`, 'removed spaces after currency symbols')
  normalized = applyReplacement(normalized, /-\n(?=[a-zA-Z])/g, '', 'merged hyphenated line breaks')

  const headerPatterns = [
    { regex: /^page \d+ of \d+/i, note: 'removed page headers' },
    { regex: /^please remit/i, note: 'removed remittance footer' },
    { regex: /^thank you for your business/i, note: 'removed thank-you footer' },
    { regex: /^scan date/i, note: 'removed scan metadata' }
  ]

  const filteredLines: string[] = []
  const removalCounts: Record<string, number> = {}

  normalized.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed) {
      filteredLines.push('')
      return
    }

    const patternMatch = headerPatterns.find(({ regex }) => regex.test(trimmed))
    if (patternMatch) {
      removalCounts[patternMatch.note] = (removalCounts[patternMatch.note] || 0) + 1
      return
    }

    filteredLines.push(line.replace(/\s+$/g, ''))
  })

  Object.entries(removalCounts).forEach(([note, count]) => {
    if (count > 0) {
      normalizationSteps.push(`${note} (${count})`)
    }
  })

  const normalizedText = filteredLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]{3,}/g, '  ')
    .trim()

  return {
    normalizedText,
    normalizationSteps
  }
}

function buildTextAnalysis({
  normalizedText,
  rawText,
  validation,
  metadata,
  normalizationSteps
}: {
  normalizedText: string
  rawText: string
  validation: InvoiceTextValidationResult
  metadata?: DocumentProcessingResult['metadata']
  normalizationSteps: string[]
}): InvoiceTextAnalysis {
  const lines = normalizedText.split('\n')
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0)
  const numericLines = nonEmptyLines.filter((line) => /\d/.test(line))
  const tableLines = nonEmptyLines.filter((line) => /\s{2,}\S/.test(line) || /\|/.test(line))
  const uniqueCharacters = new Set(normalizedText.replace(/\s/g, '').split('')).size
  const alphanumericChars = normalizedText.replace(/[^0-9A-Za-z]/g, '')
  const tableConfidence = nonEmptyLines.length > 0
    ? tableLines.length / nonEmptyLines.length
    : 0

  const needsOcr = Boolean(
    (metadata?.extractionMethod === 'pdf2json' && normalizedText.length < 800) ||
    (validation.keywordMatches < 3 && normalizedText.length < 400) ||
    (validation.lineItemMatchCount === 0 && normalizedText.length < 600)
  )

  const needsManualReview = !validation.isValid ||
    validation.confidence < 0.35 ||
    validation.lineItemMatchCount === 0

  const analysis: InvoiceTextAnalysis = {
    extraction_method: metadata?.extractionMethod,
    text_length: normalizedText.length,
    raw_text_length: rawText.length,
    line_count: lines.length,
    page_count: metadata?.pages,
    keyword_matches: validation.keywordMatches,
    line_item_candidates: validation.lineItemMatchCount,
    is_valid: validation.isValid,
    needs_ocr: needsOcr,
    needs_manual_review: needsManualReview,
    normalization_steps: normalizationSteps,
    indicators: validation.indicators,
    warnings: validation.warnings,
    validation_confidence: validation.confidence,
    ocr_confidence: metadata?.confidence,
    metadata: {
      table_confidence: Number(tableConfidence.toFixed(2)),
      table_lines: tableLines.length,
      unique_characters: uniqueCharacters,
      alphanumeric_ratio: Number((alphanumericChars.length / Math.max(1, normalizedText.length)).toFixed(2)),
      numeric_line_ratio: Number((numericLines.length / Math.max(1, nonEmptyLines.length)).toFixed(2)),
      price_match_count: validation.priceMatchCount,
      date_match_count: validation.dateMatchCount
    }
  }

  return analysis
}

/**
 * Validate if text looks like a valid invoice
 */
export function validateInvoiceText(text: string): InvoiceTextValidationResult {
  const indicators: string[] = []
  const warnings: string[] = []
  let confidence = 0

  const lowercaseText = text.toLowerCase()

  // Check for common invoice indicators
  const invoiceKeywords = [
    'invoice', 'bill', 'receipt', 'statement', 'inv #', 'invoice #',
    'invoice number', 'bill to', 'ship to', 'total', 'subtotal',
    'amount', 'quantity', 'qty', 'price', 'date'
  ]

  let keywordMatches = 0
  invoiceKeywords.forEach(keyword => {
    if (lowercaseText.includes(keyword)) {
      keywordMatches++
      indicators.push(`Contains "${keyword}"`)
    }
  })

  confidence += Math.min(keywordMatches * 10, 60) // Up to 60% for keywords

  // Check for numeric patterns (prices, quantities)
  const pricePattern = /\$[\d,]+\.?\d*/g
  const priceMatches = text.match(pricePattern)
  const priceMatchCount = priceMatches?.length || 0
  if (priceMatchCount > 0) {
    confidence += 20
    indicators.push(`Found ${priceMatchCount} price patterns`)
  }

  // Check for date patterns
  const datePattern = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/g
  const dateMatches = text.match(datePattern)
  const dateMatchCount = dateMatches?.length || 0
  if (dateMatchCount > 0) {
    confidence += 15
    indicators.push(`Found ${dateMatchCount} date patterns`)
  }

  // Check text length
  if (text.length < 100) {
    warnings.push('Text is very short, may be incomplete')
    confidence -= 20
  } else if (text.length > 50) {
    confidence += 5
  }

  // Check for line items pattern
  const lineItemPattern = /(\d+\.?\d*)\s+[\w\s]+\s+\$?[\d,]+\.?\d*/g
  const lineItemMatches = text.match(lineItemPattern)
  const lineItemMatchCount = lineItemMatches?.length || 0
  if (lineItemMatchCount > 0) {
    confidence += 20
    indicators.push(`Found ${lineItemMatchCount} potential line items`)
  }

  // Final confidence adjustment
  confidence = Math.max(0, Math.min(100, confidence))

  const isValid = confidence >= 30 && keywordMatches >= 2

  if (!isValid) {
    warnings.push('Text does not appear to be a valid invoice')
  }

  return {
    isValid,
    confidence: confidence / 100, // Convert to 0-1 scale
    indicators,
    warnings,
    keywordMatches,
    priceMatchCount,
    dateMatchCount,
    lineItemMatchCount
  }
}

/**
 * Test the document processor with sample text validation
 */
export async function testDocumentProcessor(): Promise<boolean> {
  try {
    // Test text validation without requiring PDF parsing
    const testText = `
    INVOICE #INV-2024-001
    Date: January 15, 2024
    From: Test Supplier
    
    Item 1: Coffee Beans    Qty: 5    Price: $12.99    Total: $64.95
    Item 2: Paper Cups      Qty: 3    Price: $8.50     Total: $25.50
    
    Subtotal: $90.45
    Tax: $7.24
    Total: $97.69
    `

    const validation = validateInvoiceText(testText)
    console.log('Document processor test - validation:', validation)

    // Test should pass if we can validate invoice text properly
    return validation.isValid && validation.confidence > 0.3
  } catch (error) {
    console.error('Document processor test failed:', error)
    return false
  }
}
