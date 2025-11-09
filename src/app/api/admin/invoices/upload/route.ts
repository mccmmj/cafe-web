import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/middleware'
import { createClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp']

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const supplier_id = formData.get('supplier_id') as string
    const invoice_number = formData.get('invoice_number') as string
    const invoice_date = formData.get('invoice_date') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!invoice_number || !invoice_date) {
      return NextResponse.json(
        { error: 'Missing required fields: invoice_number, invoice_date' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file extension
    const fileName = file.name.toLowerCase()
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext))
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check for duplicate invoice (only if supplier_id is provided)
    if (supplier_id) {
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('supplier_id', supplier_id)
        .eq('invoice_number', invoice_number)
        .single()

      if (existingInvoice) {
        return NextResponse.json(
          { error: 'Invoice with this number already exists for this supplier' },
          { status: 409 }
        )
      }
    }


    // Generate unique file name
    const fileExtension = fileName.split('.').pop()
    const timestamp = new Date().getTime()
    const supplierFolder = supplier_id || 'unknown'
    const uniqueFileName = `${supplierFolder}/${invoice_number.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${fileExtension}`

    console.log('Uploading file:', uniqueFileName, 'size:', file.size)

    // Convert file to buffer
    const buffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(buffer)

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(uniqueFileName, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(uniqueFileName)

    const file_url = urlData.publicUrl

    // Create invoice record
    const { data: newInvoice, error: dbError } = await supabase
      .from('invoices')
      .insert({
        supplier_id: supplier_id || null,
        invoice_number,
        invoice_date,
        total_amount: 0, // Will be updated after parsing
        file_url,
        file_path: uniqueFileName,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        status: 'uploaded',
        created_by: (authResult as any).userId
      })
      .select(`
        id,
        invoice_number,
        invoice_date,
        total_amount,
        status,
        file_name,
        file_type,
        file_size,
        file_url,
        created_at,
        suppliers (
          id,
          name
        )
      `)
      .single()

    if (dbError) {
      // If database insert fails, clean up uploaded file
      try {
        await supabase.storage
          .from('invoices')
          .remove([uniqueFileName])
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError)
      }

      console.error('Error creating invoice record:', dbError)
      return NextResponse.json(
        { error: 'Failed to create invoice record', details: dbError.message },
        { status: 500 }
      )
    }

    console.log('✅ Successfully uploaded invoice file and created record:', newInvoice.invoice_number)

    return NextResponse.json({
      success: true,
      data: newInvoice,
      message: 'Invoice uploaded successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to upload invoice:', error)
    return NextResponse.json(
      { error: 'Failed to upload invoice', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Handle preflight CORS requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
