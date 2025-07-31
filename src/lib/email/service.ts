import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface OrderEmailData {
  orderId: string
  customerEmail: string
  customerName: string
  items: Array<{
    name: string
    quantity: number
    price: number
    total: number
  }>
  subtotal: number
  tax: number
  total: number
  pickupTime?: string
  specialInstructions?: string
}

export class EmailService {
  static async sendOrderConfirmation(orderData: OrderEmailData) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'Little Cafe <orders@jmcpastrycoffee.com>',
        to: [orderData.customerEmail],
        subject: `Order Confirmation #${orderData.orderId.slice(-8)}`,
        html: generateOrderConfirmationEmail(orderData),
      })

      if (error) {
        console.error('Failed to send order confirmation email:', error)
        throw new Error(`Email send failed: ${error.message}`)
      }

      console.log('Order confirmation email sent:', data?.id)
      return data
    } catch (error) {
      console.error('Email service error:', error)
      throw error
    }
  }

  static async sendOrderStatusUpdate(
    customerEmail: string,
    orderId: string,
    status: string,
    customerName?: string
  ) {
    try {
      const statusMessages = {
        confirmed: 'Your order has been confirmed and is being prepared.',
        preparing: 'Your order is currently being prepared.',
        ready: 'Your order is ready for pickup!',
        completed: 'Your order has been completed. Thank you!',
        cancelled: 'Your order has been cancelled.'
      }

      const message = statusMessages[status as keyof typeof statusMessages] || 
                     `Your order status has been updated to: ${status}`

      const { data, error } = await resend.emails.send({
        from: 'Little Cafe <orders@jmcpastrycoffee.com>',
        to: [customerEmail],
        subject: `Order Update #${orderId.slice(-8)} - ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        html: generateOrderStatusEmail(orderId, status, message, customerName),
      })

      if (error) {
        console.error('Failed to send order status email:', error)
        throw new Error(`Email send failed: ${error.message}`)
      }

      console.log('Order status email sent:', data?.id)
      return data
    } catch (error) {
      console.error('Email service error:', error)
      throw error
    }
  }
}

function generateOrderConfirmationEmail(orderData: OrderEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .order-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .item-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        .location { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Order Confirmation</h1>
        <p>Thank you for your order, ${orderData.customerName}!</p>
      </div>
      
      <div class="content">
        <div class="order-details">
          <h3>Order #${orderData.orderId.slice(-8)}</h3>
          
          <h4>Items Ordered:</h4>
          ${orderData.items.map(item => `
            <div class="item-row">
              <span>${item.quantity}x ${item.name}</span>
              <span>$${item.total.toFixed(2)}</span>
            </div>
          `).join('')}
          
          <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #f59e0b;">
            <div class="item-row">
              <span>Subtotal:</span>
              <span>$${orderData.subtotal.toFixed(2)}</span>
            </div>
            <div class="item-row">
              <span>Tax:</span>
              <span>$${orderData.tax.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Total:</span>
              <span>$${orderData.total.toFixed(2)}</span>
            </div>
          </div>
          
          ${orderData.specialInstructions ? `
            <div style="margin-top: 15px;">
              <strong>Special Instructions:</strong>
              <p style="margin: 5px 0;">${orderData.specialInstructions}</p>
            </div>
          ` : ''}
        </div>
        
        <div class="location">
          <h4>Pickup Location:</h4>
          <p><strong>Little Cafe</strong><br>
          10400 E Alameda Ave<br>
          Denver, CO<br>
          Hours: 8AM-6PM Monday-Friday</p>
          
          ${orderData.pickupTime ? `<p><strong>Estimated Pickup Time:</strong> ${orderData.pickupTime}</p>` : ''}
        </div>
        
        <p>We'll send you another email when your order is ready for pickup!</p>
      </div>
      
      <div class="footer">
        <p>Questions? Contact us at orders@jmcpastrycoffee.com</p>
        <p>Little Cafe - Fresh coffee, made with care</p>
      </div>
    </body>
    </html>
  `
}

function generateOrderStatusEmail(
  orderId: string, 
  status: string, 
  message: string, 
  customerName?: string
): string {
  const statusColors = {
    confirmed: '#10b981',
    preparing: '#f59e0b', 
    ready: '#059669',
    completed: '#6b7280',
    cancelled: '#ef4444'
  }
  
  const color = statusColors[status as keyof typeof statusColors] || '#6b7280'
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Update</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .status-badge { background: ${color}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; text-transform: uppercase; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Order Update</h1>
        ${customerName ? `<p>Hi ${customerName}!</p>` : ''}
      </div>
      
      <div class="content">
        <p><strong>Order #${orderId.slice(-8)}</strong></p>
        
        <div style="text-align: center; margin: 20px 0;">
          <span class="status-badge">${status}</span>
        </div>
        
        <p>${message}</p>
        
        ${status === 'ready' ? `
          <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h4>Pickup Location:</h4>
            <p><strong>Little Cafe</strong><br>
            10400 E Alameda Ave<br>
            Denver, CO<br>
            Hours: 8AM-6PM Monday-Friday</p>
          </div>
        ` : ''}
      </div>
      
      <div class="footer">
        <p>Questions? Contact us at orders@littlecafe.com</p>
        <p>Little Cafe - Fresh coffee, made with care</p>
      </div>
    </body>
    </html>
  `
}

export default EmailService
