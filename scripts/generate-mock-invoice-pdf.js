#!/usr/bin/env node

/**
 * Generate a mock invoice PDF from a raw text template.
 *
 * Usage:
 *   node scripts/generate-mock-invoice-pdf.js --input raw.txt --output invoice.pdf
 */

const fs = require('fs')
const path = require('path')
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    input: null,
    output: null
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if ((arg === '--input' || arg === '--in') && args[i + 1]) {
      options.input = args[i + 1]
      i += 1
    } else if ((arg === '--output' || arg === '--out') && args[i + 1]) {
      options.output = args[i + 1]
      i += 1
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Mock Invoice PDF Generator

Usage:
  node scripts/generate-mock-invoice-pdf.js --input data/raw.txt --output data/invoice.pdf

Options:
  --input,  --in   Path to raw invoice text (required)
  --output, --out  Path for generated PDF (required)
`)
      process.exit(0)
    }
  }

  if (!options.input || !options.output) {
    throw new Error('Missing --input and/or --output arguments')
  }

  return {
    input: path.resolve(options.input),
    output: path.resolve(options.output)
  }
}

async function generatePdf(rawTextPath, outputPath) {
  if (!fs.existsSync(rawTextPath)) {
    throw new Error(`Raw invoice text not found at ${rawTextPath}`)
  }

  const rawText = fs.readFileSync(rawTextPath, 'utf8')
  const lines = rawText.split(/\r?\n/)

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792]) // US Letter size
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const fontSize = 12
  const lineHeight = fontSize * 1.3
  const margin = 48
  let cursorY = page.getHeight() - margin

  const drawLine = (text, options = {}) => {
    const {
      bold = false,
      size = fontSize,
      color = rgb(0, 0, 0),
      indent = 0
    } = options

    if (cursorY < margin + lineHeight) {
      cursorY = page.getHeight() - margin
    }

    page.drawText(text, {
      x: margin + indent,
      y: cursorY,
      size,
      font: bold ? helveticaBold : helvetica,
      color
    })

    cursorY -= lineHeight
  }

  const headerColor = rgb(0.15, 0.28, 0.44)
  const divider = () => {
    cursorY -= 6
    page.drawLine({
      start: { x: margin, y: cursorY },
      end: { x: page.getWidth() - margin, y: cursorY },
      thickness: 0.5,
      color: rgb(0.75, 0.75, 0.75)
    })
    cursorY -= lineHeight
  }

  lines.forEach((rawLine, index) => {
    const line = rawLine.trimEnd()

    if (index === 0 && line) {
      drawLine(line, { bold: true, size: 18, color: headerColor })
      return
    }

    if (!line) {
      cursorY -= lineHeight / 2
      return
    }

    if (/^(Invoice|PO|Bill To|Line Items|Subtotal|TOTAL)/i.test(line)) {
      if (/^Line Items/i.test(line)) divider()
      drawLine(line, { bold: true })
      return
    }

    if (/Qty:/i.test(line)) {
      drawLine(line, { indent: 18 })
      return
    }

    drawLine(line)
  })

  const pdfBytes = await pdfDoc.save()
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(outputPath, pdfBytes)
  console.log(`Mock invoice PDF generated at ${outputPath}`)
}

async function main() {
  try {
    const { input, output } = parseArgs()
    await generatePdf(input, output)
  } catch (error) {
    console.error('Failed to generate mock invoice PDF:', error.message)
    process.exit(1)
  }
}

main()
