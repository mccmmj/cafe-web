import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing OCR functionality...')
    
    // Create a simple test image buffer (1x1 pixel white PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x2B, 0x63, 0x1A, 0x8A, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])

    console.log('📦 Test image buffer size:', testImageBuffer.length)

    // Try to load Tesseract
    try {
      const tesseract = await import('tesseract.js')
      console.log('✅ Tesseract.js loaded successfully')
      
      // Create a simple worker
      const worker = await tesseract.createWorker('eng', 1, {
        logger: (m: any) => {
          console.log(`Test OCR: ${m.status} - ${(m.progress * 100).toFixed(1)}%`)
        }
      })

      console.log('⚙️ Worker created, testing recognition...')
      
      // Test with timeout
      const ocrPromise = worker.recognize(testImageBuffer)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout after 30 seconds')), 30000)
      })
      
      const result = await Promise.race([ocrPromise, timeoutPromise]) as any
      await worker.terminate()
      
      console.log('✅ Test OCR completed')
      
      return NextResponse.json({
        success: true,
        message: 'OCR test completed successfully',
        testResult: {
          hasText: !!result.data.text,
          confidence: result.data.confidence,
          textLength: result.data.text?.length || 0
        }
      })
      
    } catch (tesseractError: any) {
      console.error('❌ Tesseract error:', tesseractError)
      return NextResponse.json({
        success: false,
        error: 'Tesseract loading or processing failed',
        details: tesseractError.message
      }, { status: 500 })
    }
    
  } catch (error: any) {
    console.error('❌ OCR test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'OCR test failed',
      details: error.message
    }, { status: 500 })
  }
}