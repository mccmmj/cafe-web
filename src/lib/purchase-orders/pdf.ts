import { PDFDocument, StandardFonts, rgb, type RGB, type PDFFont } from 'pdf-lib'
import type { PurchaseOrderIssuance } from './load'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})

function formatDate(value?: string | null) {
  if (!value) return 'Not specified'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not specified'
  return dateFormatter.format(date)
}

export async function generatePurchaseOrderPdf(order: PurchaseOrderIssuance): Promise<Uint8Array> {
  const document = await PDFDocument.create()
  const page = document.addPage([612, 792]) // US Letter
  const { width, height } = page.getSize()

  const regularFont = await document.embedFont(StandardFonts.Helvetica)
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold)

  const margin = 48
  let cursorY = height - margin

  const drawText = (
    text: string,
    options: { x?: number; y?: number; size?: number; font?: PDFFont; color?: RGB } = {}
  ) => {
    const {
      x = margin,
      y = cursorY,
      size = 12,
      font = regularFont,
      color = rgb(0.15, 0.15, 0.15),
    } = options
    page.drawText(text, { x, y, size, font, color })
  }

  drawText('PURCHASE ORDER', { size: 20, font: boldFont, color: rgb(0.1, 0.2, 0.45) })
  cursorY -= 30

  drawText(`PO Number: ${order.order_number}`, { font: boldFont })
  cursorY -= 18

  drawText(`Order Date: ${formatDate(order.order_date)}`)
  cursorY -= 18

  if (order.expected_delivery_date) {
    drawText(`Expected Delivery: ${formatDate(order.expected_delivery_date)}`)
    cursorY -= 18
  }

  if (order.sent_at) {
    drawText(`Last Sent: ${formatDate(order.sent_at)}`)
    cursorY -= 18
  }

  cursorY -= 12
  drawText('Supplier', { font: boldFont })
  cursorY -= 16

  drawText(order.supplier.name)
  cursorY -= 14

  if (order.supplier.contact_person) {
    drawText(`Attn: ${order.supplier.contact_person}`)
    cursorY -= 14
  }

  if (order.supplier.email) {
    drawText(`Email: ${order.supplier.email}`)
    cursorY -= 14
  }

  if (order.supplier.phone) {
    drawText(`Phone: ${order.supplier.phone}`)
    cursorY -= 14
  }

  if (order.supplier.address) {
    drawText(order.supplier.address)
    cursorY -= 14
  }

  if (order.supplier.payment_terms) {
    drawText(`Payment Terms: ${order.supplier.payment_terms}`)
    cursorY -= 14
  }

  cursorY -= 20

  const tableHeaders = ['Item', 'Qty', 'Unit', 'Unit Cost', 'Line Total']
  const columnX = [margin, margin + 250, margin + 300, margin + 360, margin + 450]

  page.drawRectangle({
    x: margin - 4,
    y: cursorY - 6,
    width: width - margin * 2 + 8,
    height: 22,
    color: rgb(0.9, 0.93, 0.98)
  })

  tableHeaders.forEach((header, index) => {
    page.drawText(header, {
      x: columnX[index],
      y: cursorY,
      size: 11,
      font: boldFont,
      color: rgb(0.1, 0.2, 0.45)
    })
  })

  cursorY -= 26

  order.items.forEach((item) => {
    if (cursorY < margin + 120) {
      cursorY = height - margin - 40
      page.drawLine({
        start: { x: margin - 4, y: cursorY + 8 },
        end: { x: width - margin + 4, y: cursorY + 8 },
        thickness: 0.5,
        color: rgb(0.75, 0.78, 0.83)
      })
    }

    const unitLabel = item.unit_type || 'each'

    page.drawText(item.name, { x: columnX[0], y: cursorY, size: 10, font: regularFont })
    page.drawText(String(item.quantity_ordered), { x: columnX[1], y: cursorY, size: 10, font: regularFont })
    page.drawText(unitLabel, { x: columnX[2], y: cursorY, size: 10, font: regularFont })
    page.drawText(currencyFormatter.format(item.unit_cost || 0), { x: columnX[3], y: cursorY, size: 10, font: regularFont })
    page.drawText(currencyFormatter.format(item.total_cost || 0), { x: columnX[4], y: cursorY, size: 10, font: regularFont })

    cursorY -= 18
  })

  cursorY -= 10

  page.drawLine({
    start: { x: margin - 4, y: cursorY + 8 },
    end: { x: width - margin + 4, y: cursorY + 8 },
    thickness: 0.5,
    color: rgb(0.75, 0.78, 0.83)
  })

  cursorY -= 16

  drawText(`Total Amount: ${currencyFormatter.format(order.total_amount || 0)}`, {
    x: margin,
    y: cursorY,
    size: 12,
    font: boldFont
  })

  cursorY -= 20

  if (order.notes) {
    drawText('Buyer Notes', { font: boldFont })
    cursorY -= 16

    const noteLines = wrapText(order.notes, 80)
    noteLines.forEach((line) => {
      drawText(line, { y: cursorY })
      cursorY -= 14
    })
  }

  return document.save()
}

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (testLine.length > maxChars) {
      if (currentLine) {
        lines.push(currentLine)
      }
      currentLine = word
    } else {
      currentLine = testLine
    }
  })

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}
