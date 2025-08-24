import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/middleware'
import { testAIService } from '@/lib/ai/openai-service'
import { testDocumentProcessor } from '@/lib/document/pdf-processor'

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    console.log('🧪 Starting AI service tests...')

    const tests = {
      openai_configured: !!process.env.OPENAI_API_KEY,
      ai_service: false,
      document_processor: false
    }

    const results: any = {
      tests,
      details: {},
      overall_success: false
    }

    // Test 1: Check OpenAI configuration
    if (!process.env.OPENAI_API_KEY) {
      results.details.openai = 'OpenAI API key not configured in environment variables'
      return NextResponse.json({
        success: false,
        message: 'AI service not properly configured',
        results
      }, { status: 400 })
    }

    // Test 2: Test AI Service
    try {
      console.log('Testing AI service...')
      const aiTest = await testAIService()
      tests.ai_service = aiTest
      results.details.ai_service = aiTest ? 'AI parsing test successful' : 'AI parsing test failed'
    } catch (error: any) {
      results.details.ai_service = `AI test error: ${error.message}`
    }

    // Test 3: Test Document Processor
    try {
      console.log('Testing document processor...')
      const docTest = await testDocumentProcessor()
      tests.document_processor = docTest
      results.details.document_processor = docTest ? 'Document processing test successful' : 'Document processing test failed'
    } catch (error: any) {
      results.details.document_processor = `Document processor test error: ${error.message}`
    }

    results.overall_success = tests.openai_configured && tests.ai_service && tests.document_processor

    if (results.overall_success) {
      console.log('✅ All AI service tests passed')
      return NextResponse.json({
        success: true,
        message: 'All AI services are working correctly',
        results
      })
    } else {
      console.log('❌ Some AI service tests failed')
      return NextResponse.json({
        success: false,
        message: 'Some AI services are not working correctly',
        results
      }, { status: 400 })
    }

  } catch (error) {
    console.error('AI service test failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'AI service test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}