'use client'

import { forwardRef } from 'react'

interface OrderItem {
  id: string
  item_name: string
  quantity: number
  unit_price: number
  total_price: number
  variations?: Record<string, any>
  modifiers?: Record<string, any>
}

interface Order {
  id: string
  order_number: string | null
  total_amount: number
  tax_amount: number
  subtotal: number
  status: string
  payment_status: string
  customer_email: string | null
  created_at: string
  order_items: OrderItem[]
  special_instructions?: string | null
}

interface PrintableReceiptProps {
  order: Order
}

const PrintableReceipt = forwardRef<HTMLDivElement, PrintableReceiptProps>(
  ({ order }, ref) => {
    const formatPrice = (price: number) => {
      return (price / 100).toFixed(2)
    }

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    return (
      <div ref={ref} className="receipt-container">
        {/* Print-specific styles */}
        <style jsx>{`
          @media print {
            .receipt-container {
              max-width: 80mm !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: 'Courier New', monospace !important;
              font-size: 12px !important;
              line-height: 1.2 !important;
              color: black !important;
              background: white !important;
            }
            
            .receipt-header {
              text-align: center !important;
              border-bottom: 1px dashed black !important;
              padding-bottom: 8px !important;
              margin-bottom: 8px !important;
            }
            
            .receipt-title {
              font-size: 16px !important;
              font-weight: bold !important;
              margin: 0 !important;
            }
            
            .receipt-address {
              font-size: 10px !important;
              margin: 2px 0 !important;
            }
            
            .receipt-section {
              margin: 8px 0 !important;
            }
            
            .receipt-divider {
              border-bottom: 1px dashed black !important;
              margin: 8px 0 !important;
            }
            
            .receipt-item {
              margin: 4px 0 !important;
            }
            
            .receipt-item-name {
              font-weight: bold !important;
            }
            
            .receipt-item-details {
              font-size: 10px !important;
              margin-left: 8px !important;
            }
            
            .receipt-total-line {
              display: flex !important;
              justify-content: space-between !important;
              margin: 2px 0 !important;
            }
            
            .receipt-final-total {
              font-weight: bold !important;
              font-size: 14px !important;
              border-top: 1px solid black !important;
              padding-top: 4px !important;
              margin-top: 4px !important;
            }
            
            .receipt-footer {
              text-align: center !important;
              font-size: 10px !important;
              margin-top: 16px !important;
              border-top: 1px dashed black !important;
              padding-top: 8px !important;
            }
            
            .no-print {
              display: none !important;
            }
          }
          
          @media screen {
            .receipt-container {
              max-width: 400px;
              margin: 0 auto;
              padding: 20px;
              font-family: 'Courier New', monospace;
              font-size: 14px;
              background: white;
              border: 1px solid #ccc;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
          }
        `}</style>
        
        <div className="receipt-container">
          {/* Header */}
          <div className="receipt-header">
            <h1 className="receipt-title">LITTLE CAFE</h1>
            <p className="receipt-address">Kaiser Permanente Medical Complex</p>
            <p className="receipt-address">10400 E Alameda Ave</p>
            <p className="receipt-address">Denver, CO</p>
            <p className="receipt-address">Phone: (303) 555-0123</p>
          </div>

          {/* Order Info */}
          <div className="receipt-section">
            <div className="receipt-total-line">
              <span>Order #:</span>
              <span>{order.order_number || order.id.slice(-8)}</span>
            </div>
            <div className="receipt-total-line">
              <span>Date:</span>
              <span>{formatDate(order.created_at)}</span>
            </div>
            <div className="receipt-total-line">
              <span>Status:</span>
              <span style={{ textTransform: 'capitalize' }}>{order.status}</span>
            </div>
            {order.customer_email && (
              <div className="receipt-total-line">
                <span>Email:</span>
                <span style={{ fontSize: '10px' }}>{order.customer_email}</span>
              </div>
            )}
          </div>

          <div className="receipt-divider"></div>

          {/* Items */}
          <div className="receipt-section">
            {order.order_items?.map((item) => (
              <div key={item.id} className="receipt-item">
                <div className="receipt-item-name">
                  {item.quantity}x {item.item_name}
                </div>
                <div className="receipt-total-line" style={{ marginLeft: '16px' }}>
                  <span>${formatPrice(item.unit_price)} each</span>
                  <span>${formatPrice(item.total_price)}</span>
                </div>
                
                {item.variations && Object.keys(item.variations).length > 0 && (
                  <div className="receipt-item-details">
                    {Object.entries(item.variations).map(([key, value]: [string, any]) => (
                      <div key={key}>• {key}: {value}</div>
                    ))}
                  </div>
                )}
                
                {item.modifiers && Object.keys(item.modifiers).length > 0 && (
                  <div className="receipt-item-details">
                    {Object.entries(item.modifiers).map(([key, value]: [string, any]) => (
                      <div key={key}>+ {key}: {value}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="receipt-divider"></div>

          {/* Totals */}
          <div className="receipt-section">
            <div className="receipt-total-line">
              <span>Subtotal:</span>
              <span>${formatPrice(order.subtotal || (order.total_amount - (order.tax_amount || 0)))}</span>
            </div>
            {order.tax_amount > 0 && (
              <div className="receipt-total-line">
                <span>Tax:</span>
                <span>${formatPrice(order.tax_amount)}</span>
              </div>
            )}
            <div className="receipt-total-line receipt-final-total">
              <span>TOTAL:</span>
              <span>${formatPrice(order.total_amount)}</span>
            </div>
            <div className="receipt-total-line">
              <span>Payment:</span>
              <span style={{ textTransform: 'capitalize' }}>{order.payment_status}</span>
            </div>
          </div>

          {/* Special Instructions */}
          {order.special_instructions && (
            <>
              <div className="receipt-divider"></div>
              <div className="receipt-section">
                <div style={{ fontWeight: 'bold' }}>Special Instructions:</div>
                <div style={{ fontSize: '10px', marginTop: '4px' }}>
                  {order.special_instructions}
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="receipt-footer">
            <p>Thank you for your order!</p>
            <p>Visit us again soon!</p>
            <p>Hours: Mon-Fri 8AM-6PM</p>
          </div>
        </div>
      </div>
    )
  }
)

PrintableReceipt.displayName = 'PrintableReceipt'

export default PrintableReceipt