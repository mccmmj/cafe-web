import { NextRequest, NextResponse } from 'next/server'
import { InventorySyncService } from '@/lib/services/inventory-sync'

interface SyncStatusRequest {
  adminEmail: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SyncStatusRequest = await request.json()

    if (!body.adminEmail) {
      return NextResponse.json(
        { error: 'Admin email is required' },
        { status: 400 }
      )
    }

    // Get comprehensive sync status
    const syncStatus = await InventorySyncService.getSyncStatus()

    return NextResponse.json({
      success: true,
      status: syncStatus,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Sync status error:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Inventory sync status API endpoint',
    methods: ['POST'],
    description: 'Get real-time sync status and health metrics',
    returns: {
      lastCatalogSync: 'Timestamp of last catalog webhook',
      lastInventorySync: 'Timestamp of last inventory webhook', 
      pendingAlerts: 'Number of unacknowledged stock alerts',
      recentErrors: 'Recent webhook processing errors',
      webhookHealth: 'Webhook endpoint health status'
    }
  })
}