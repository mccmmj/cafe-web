import { ParsedInvoiceData, ParsedLineItem } from '@/types/invoice'

// Dynamic OpenAI client to avoid build issues
let openaiClient: any = null

async function getOpenAIClient() {
  if (!openaiClient) {
    try {
      const OpenAI = (await import('openai')).default
      openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
    } catch (error) {
      console.error('Failed to load OpenAI client:', error)
      throw new Error('OpenAI client not available')
    }
  }
  return openaiClient
}

export interface AIParseRequest {
  text: string
  supplier_name?: string
  template_rules?: Record<string, any>
}

export interface AIParseResponse {
  success: boolean
  data?: ParsedInvoiceData
  confidence: number
  errors?: string[]
  raw_response?: string
}

/**
 * Create a system prompt for invoice parsing based on supplier
 */
function createInvoiceParsingPrompt(supplierName?: string): string {
  return `You are an expert invoice data extraction AI. Your task is to parse invoice text and extract structured data.

IMPORTANT INSTRUCTIONS:
1. Extract ALL information accurately from the provided invoice text
2. Return data in the exact JSON format specified below
3. Set confidence scores between 0.0 and 1.0 for each field
4. If a field is not found, set it to null but still include it in the response
5. For line items, extract ALL products/services with their quantities and prices
6. Handle package quantities (12x, 24x, case, etc.) by noting them in package_info field

${supplierName ? `This invoice is from: ${supplierName}` : ''}

REQUIRED JSON FORMAT:
{
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "supplier_info": {
    "name": "string or null",
    "address": "string or null",
    "phone": "string or null",
    "email": "string or null"
  },
  "subtotal": number or null,
  "tax_amount": number or null,
  "discount_amount": number or null,
  "total_amount": number or null,
  "line_items": [
    {
      "line_number": number,
      "item_code": "string or null",
      "description": "string",
      "quantity": number,
      "unit_price": number,
      "total_price": number,
      "package_info": "string like '12x', '24x', 'case', 'each' or null",
      "unit_type": "string like 'each', 'lb', 'oz', 'case' or null",
      "confidence": number (0.0 to 1.0)
    }
  ],
  "confidence_score": number (0.0 to 1.0),
  "parsing_method": "openai-gpt4",
  "extraction_timestamp": "ISO timestamp"
}

EXTRACTION RULES:
- Extract numbers accurately (watch for decimal points)
- Parse dates in YYYY-MM-DD format
- Include ALL line items found on the invoice
- Calculate totals when not explicitly stated
- Note package quantities (12-pack, case of 24, etc.) in package_info
- Set confidence high (0.8-1.0) for clearly visible data
- Set confidence medium (0.5-0.8) for partially visible or unclear data
- Set confidence low (0.1-0.5) for inferred or uncertain data

Return ONLY the JSON object, no additional text.`
}

/**
 * Parse invoice text using OpenAI GPT-4
 */
export async function parseInvoiceWithAI({
  text,
  supplier_name,
  template_rules
}: AIParseRequest): Promise<AIParseResponse> {
  try {
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        confidence: 0,
        errors: ['No text provided for parsing']
      }
    }

    console.log('🤖 Starting AI invoice parsing for supplier:', supplier_name || 'Unknown')

    const systemPrompt = createInvoiceParsingPrompt(supplier_name)

    // Apply template rules if provided
    let userPrompt = `Please parse this invoice text and extract all data:\n\n${text}`
    
    if (template_rules && Object.keys(template_rules).length > 0) {
      userPrompt += `\n\nAdditional parsing instructions:\n${JSON.stringify(template_rules, null, 2)}`
    }

    const openai = await getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })

    const rawResponse = completion.choices[0]?.message?.content
    if (!rawResponse) {
      return {
        success: false,
        confidence: 0,
        errors: ['No response from AI model']
      }
    }

    try {
      const parsedData = JSON.parse(rawResponse) as ParsedInvoiceData
      
      // Add extraction timestamp
      parsedData.extraction_timestamp = new Date().toISOString()
      parsedData.parsing_method = 'openai-gpt4o'
      
      // Validate and clean the parsed data
      const validatedData = validateParsedData(parsedData)
      const overallConfidence = calculateOverallConfidence(validatedData)

      console.log('✅ AI parsing completed with confidence:', overallConfidence)

      return {
        success: true,
        data: validatedData,
        confidence: overallConfidence,
        raw_response: rawResponse
      }

    } catch (parseError) {
      console.error('Error parsing AI response as JSON:', parseError)
      return {
        success: false,
        confidence: 0,
        errors: ['AI returned invalid JSON format'],
        raw_response: rawResponse
      }
    }

  } catch (error: any) {
    console.error('OpenAI API error:', error)
    return {
      success: false,
      confidence: 0,
      errors: [`AI API error: ${error.message || 'Unknown error'}`]
    }
  }
}

/**
 * Validate and clean parsed invoice data
 */
function validateParsedData(data: ParsedInvoiceData): ParsedInvoiceData {
  // Ensure line_items is an array
  if (!Array.isArray(data.line_items)) {
    data.line_items = []
  }

  // Validate and clean line items
  data.line_items = data.line_items.map((item: any, index: number): ParsedLineItem => ({
    line_number: item.line_number || index + 1,
    item_code: item.item_code || null,
    description: String(item.description || 'Unknown Item'),
    quantity: Number(item.quantity) || 0,
    unit_price: Number(item.unit_price) || 0,
    total_price: Number(item.total_price) || (Number(item.quantity) * Number(item.unit_price)),
    package_info: item.package_info || null,
    unit_type: item.unit_type || 'each',
    confidence: Number(item.confidence) || 0.5
  }))

  // Validate numeric fields
  if (data.subtotal) data.subtotal = Number(data.subtotal)
  if (data.tax_amount) data.tax_amount = Number(data.tax_amount)
  if (data.discount_amount) data.discount_amount = Number(data.discount_amount)
  if (data.total_amount) data.total_amount = Number(data.total_amount)

  // Validate confidence score
  data.confidence_score = Math.max(0, Math.min(1, Number(data.confidence_score) || 0.5))

  return data
}

/**
 * Calculate overall confidence based on extracted data quality
 */
function calculateOverallConfidence(data: ParsedInvoiceData): number {
  let totalConfidence = 0
  let weightedFields = 0

  // Weight different fields by importance
  const fieldWeights = {
    invoice_number: 0.2,
    invoice_date: 0.15,
    total_amount: 0.25,
    line_items: 0.4
  }

  // Invoice number confidence
  if (data.invoice_number) {
    totalConfidence += fieldWeights.invoice_number * 0.9
  }
  weightedFields += fieldWeights.invoice_number

  // Invoice date confidence
  if (data.invoice_date) {
    totalConfidence += fieldWeights.invoice_date * 0.8
  }
  weightedFields += fieldWeights.invoice_date

  // Total amount confidence
  if (data.total_amount && data.total_amount > 0) {
    totalConfidence += fieldWeights.total_amount * 0.9
  }
  weightedFields += fieldWeights.total_amount

  // Line items confidence (average of all line item confidences)
  if (data.line_items && data.line_items.length > 0) {
    const avgLineItemConfidence = data.line_items.reduce(
      (sum, item) => sum + (item.confidence || 0.5), 
      0
    ) / data.line_items.length
    totalConfidence += fieldWeights.line_items * avgLineItemConfidence
  }
  weightedFields += fieldWeights.line_items

  // Use provided confidence score as baseline
  const providedConfidence = data.confidence_score || 0.5
  const calculatedConfidence = weightedFields > 0 ? totalConfidence / weightedFields : 0

  // Return weighted average of provided and calculated confidence
  return Math.round((providedConfidence * 0.4 + calculatedConfidence * 0.6) * 100) / 100
}

/**
 * Test the AI service with sample text
 */
export async function testAIService(): Promise<boolean> {
  try {
    const sampleInvoice = `
    INVOICE #INV-2024-001
    Date: January 15, 2024
    
    From: Test Supplier Inc.
    123 Main Street
    City, ST 12345
    
    Item 1: Coffee Beans - Dark Roast    Qty: 5    Price: $12.99    Total: $64.95
    Item 2: Paper Cups (12x)            Qty: 3    Price: $8.50     Total: $25.50
    
    Subtotal: $90.45
    Tax: $7.24
    Total: $97.69
    `

    const result = await parseInvoiceWithAI({
      text: sampleInvoice,
      supplier_name: 'Test Supplier Inc.'
    })

    console.log('AI Service Test Result:', result)
    return result.success && result.confidence > 0.5
  } catch (error) {
    console.error('AI Service Test Failed:', error)
    return false
  }
}