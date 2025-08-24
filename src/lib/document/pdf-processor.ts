// Dynamic imports for document processing libraries
let PDFParser: any = null
let Tesseract: any = null

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

async function getTesseract() {
  if (!Tesseract) {
    try {
      Tesseract = await import('tesseract.js')
      
      // Configure Tesseract for server-side usage
      if (typeof window === 'undefined') {
        // Server-side configuration
        console.log('🔧 Configuring Tesseract for server environment')
      }
      
      console.log('✅ Tesseract.js library loaded successfully')
    } catch (error: any) {
      console.error('Failed to load Tesseract.js:', error)
      throw new Error(`OCR library not available: ${error.message}`)
    }
  }
  return Tesseract
}

export interface DocumentProcessingResult {
  success: boolean
  text?: string
  metadata?: {
    pages: number
    fileSize: number
    extractionMethod: string
    confidence?: number // OCR confidence score
  }
  errors?: string[]
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

    // Get Tesseract library
    const tesseract = await getTesseract()
    
    // Try to create worker with error handling for Next.js environment
    let worker
    try {
      worker = await tesseract.createWorker('eng', 1, {
        logger: (m: any) => {
          console.log(`OCR Status: ${m.status} - Progress: ${(m.progress * 100).toFixed(1)}%`)
        }
      })
      
      // Set OCR parameters for better performance with screenshots
      await worker.setParameters({
        tessedit_ocr_engine_mode: '1', // Use LSTM OCR engine
        tessedit_pageseg_mode: '1',    // Automatic page segmentation with OSD
      })
      
    } catch (workerError: any) {
      console.error('❌ Worker creation failed:', workerError)
      
      // Return helpful error for Next.js environment issues
      if (workerError.message?.includes('worker script') || workerError.code === 'ERR_WORKER_PATH') {
        return {
          success: false,
          errors: [
            'OCR processing is not available in this server environment.',
            'For PNG/JPG invoices, please convert to PDF format first.',
            'Alternative: Use online tools to convert image to text, then paste the text into a text file and upload.'
          ]
        }
      }
      
      throw workerError
    }

    try {
      // Process the image buffer with timeout
      const ocrPromise = worker.recognize(buffer)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OCR processing timeout after 3 minutes')), 180000)
      })
      
      const { data } = await Promise.race([ocrPromise, timeoutPromise]) as any
      
      const extractedText = data.text.trim()
      
      if (!extractedText || extractedText.length < 10) {
        await worker.terminate()
        return {
          success: false,
          errors: ['Image appears to contain no readable text. Ensure the image is clear and contains text.']
        }
      }

      console.log('✅ OCR text extraction completed, length:', extractedText.length)
      console.log('📊 OCR confidence:', data.confidence)

      await worker.terminate()

      return {
        success: true,
        text: extractedText,
        metadata: {
          pages: 1,
          fileSize: buffer.length,
          extractionMethod: 'tesseract-ocr',
          confidence: data.confidence
        }
      }

    } catch (ocrError: any) {
      await worker.terminate()
      console.error('OCR processing error:', ocrError)
      return {
        success: false,
        errors: [`OCR processing failed: ${ocrError.message}`]
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
export async function extractTextFromPDF(buffer: Buffer): Promise<DocumentProcessingResult> {
  try {
    console.log('📄 Starting PDF text extraction with pdf2json, size:', buffer.length)

    // Get pdf2json parser
    const PDFParser = await getPdfParser()
    const pdfParser = new PDFParser(null, true) // true = include raw text

    return new Promise((resolve) => {
      let extractedText = ''

      // Handle successful parsing
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extract text from each page
          if (pdfData.Pages && pdfData.Pages.length > 0) {
            for (const page of pdfData.Pages) {
              if (page.Texts && page.Texts.length > 0) {
                for (const textBlock of page.Texts) {
                  if (textBlock.R && textBlock.R.length > 0) {
                    for (const textRun of textBlock.R) {
                      if (textRun.T) {
                        // Decode URI component to handle special characters
                        extractedText += decodeURIComponent(textRun.T) + ' '
                      }
                    }
                  }
                }
                extractedText += '\n' // Add line break between text blocks
              }
            }
          }

          const cleanedText = extractedText.trim()
          
          if (!cleanedText || cleanedText.length < 10) {
            resolve({
              success: false,
              errors: ['PDF appears to be empty or contains only images. OCR may be required.']
            })
            return
          }

          console.log('✅ PDF text extraction completed, length:', cleanedText.length)

          resolve({
            success: true,
            text: cleanedText,
            metadata: {
              pages: pdfData.Pages?.length || 1,
              fileSize: buffer.length,
              extractionMethod: 'pdf2json'
            }
          })

        } catch (parseError: any) {
          console.error('Error processing PDF data:', parseError)
          resolve({
            success: false,
            errors: [`PDF data processing failed: ${parseError.message}`]
          })
        }
      })

      // Handle parsing errors
      pdfParser.on('pdfParser_dataError', (error: any) => {
        console.error('PDF parsing error:', error)
        resolve({
          success: false,
          errors: [`PDF parsing failed: ${error.parserError || error.message || 'Unknown error'}`]
        })
      })

      // Start parsing the buffer
      pdfParser.parseBuffer(buffer)
    })

  } catch (error: any) {
    console.error('PDF extraction setup error:', error)
    return {
      success: false,
      errors: [`PDF extraction failed: ${error.message}`]
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
    
    if (!result.success) {
      return result
    }

    // Additional text cleanup for invoice processing
    const cleanedText = cleanExtractedText(result.text || '')
    
    return {
      ...result,
      text: cleanedText
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
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove page breaks and form feeds
    .replace(/[\f\r\n]+/g, '\n')
    // Remove extra line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Trim whitespace
    .trim()
}

/**
 * Validate if text looks like a valid invoice
 */
export function validateInvoiceText(text: string): {
  isValid: boolean
  confidence: number
  indicators: string[]
  warnings: string[]
} {
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
  if (priceMatches && priceMatches.length > 0) {
    confidence += 20
    indicators.push(`Found ${priceMatches.length} price patterns`)
  }

  // Check for date patterns
  const datePattern = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/g
  const dateMatches = text.match(datePattern)
  if (dateMatches && dateMatches.length > 0) {
    confidence += 15
    indicators.push(`Found ${dateMatches.length} date patterns`)
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
  if (lineItemMatches && lineItemMatches.length > 0) {
    confidence += 20
    indicators.push(`Found ${lineItemMatches.length} potential line items`)
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
    warnings
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