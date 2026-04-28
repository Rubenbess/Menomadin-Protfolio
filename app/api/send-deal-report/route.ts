import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { requireCronAuth } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  const cronError = requireCronAuth(req)
  if (cronError) return cronError

  const resendKey  = process.env.RESEND_API_KEY
  const fromEmail  = process.env.RESEND_FROM_EMAIL ?? 'noreply@menomadin.com'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!resendKey || !supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing required env vars' }, { status: 500 })
  }

  let body: { report_date?: string; content?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { report_date, content } = body
  if (!report_date || !content) {
    return NextResponse.json({ error: 'Missing report_date or content' }, { status: 400 })
  }

  // Fetch recipients
  const supabase = createClient(supabaseUrl, serviceKey)
  const { data: recipients, error: dbError } = await supabase
    .from('deal_report_recipients')
    .select('email, name')
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  if (!recipients || recipients.length === 0) {
    return NextResponse.json({ sent: false, reason: 'No recipients configured' })
  }

  // Generate PDF server-side
  const pdfBytes = await generateReportPDF(report_date, content)

  const weekOf = new Date(report_date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const subject = `Menomadin Israeli Tech Deal Report — Week of ${weekOf}`
  const toAddresses = recipients.map(r => r.name ? `${r.name} <${r.email}>` : r.email)

  const resend = new Resend(resendKey)
  const { error: sendError } = await resend.emails.send({
    from: fromEmail,
    to: toAddresses,
    subject,
    html: `<p>Hi,</p><p>Please find attached the Menomadin Israeli Tech Deal Report for the week of <strong>${weekOf}</strong>.</p><p>— Menomadin Catalyst</p>`,
    attachments: [{
      filename: `menomadin-deal-report-${report_date}.pdf`,
      content: Buffer.from(pdfBytes),
    }],
  })

  if (sendError) {
    return NextResponse.json({ error: sendError.message }, { status: 500 })
  }

  return NextResponse.json({ sent: true, recipients: toAddresses.length, subject })
}

async function generateReportPDF(reportDate: string, content: string): Promise<ArrayBuffer> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 18
  const contentW = pageW - margin * 2
  let y = 36

  const weekOf = new Date(reportDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // Header
  doc.setFillColor(79, 70, 229)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Menomadin — Israeli Tech Deal Report', margin, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(199, 210, 254)
  doc.text(`Week of ${weekOf}`, margin, 21)
  doc.text(
    `Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    pageW - margin, 21, { align: 'right' }
  )

  function checkPage(needed = 8) {
    if (y + needed > pageH - 15) { doc.addPage(); y = 15 }
  }

  function stripInline(text: string) {
    return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[(.+?)\]\(.+?\)/g, '$1').replace(/`(.+?)`/g, '$1')
  }

  function parseTableBlock(rows: string[]): { head: string[]; body: string[][] } | null {
    const dataRows = rows.filter(r => !r.match(/^\|[\s|:-]+\|$/))
    if (dataRows.length < 2) return null
    const head = dataRows[0].split('|').map(c => c.trim()).filter(Boolean)
    const body = dataRows.slice(1).map(r => r.split('|').map(c => c.trim()).filter(Boolean))
    return { head, body }
  }

  type Block =
    | { type: 'h1' | 'h2' | 'h3' | 'hr' | 'bullet' | 'text'; text: string }
    | { type: 'table'; rows: string[] }
    | { type: 'blank' }

  const blocks: Block[] = []
  const rawLines = content.split('\n')
  let i = 0
  while (i < rawLines.length) {
    const line = rawLines[i]
    if (line.startsWith('|')) {
      const tableRows: string[] = []
      while (i < rawLines.length && rawLines[i].startsWith('|')) { tableRows.push(rawLines[i]); i++ }
      blocks.push({ type: 'table', rows: tableRows })
    } else if (line.startsWith('# '))  { blocks.push({ type: 'h1',     text: line.replace(/^# /, '') });   i++ }
    else if (line.startsWith('## '))   { blocks.push({ type: 'h2',     text: line.replace(/^## /, '') });  i++ }
    else if (line.startsWith('### '))  { blocks.push({ type: 'h3',     text: line.replace(/^### /, '') }); i++ }
    else if (line.match(/^-{3,}$/))    { blocks.push({ type: 'hr',     text: '' }); i++ }
    else if (line.match(/^[-*] /))     { blocks.push({ type: 'bullet', text: line.replace(/^[-*] /, '') }); i++ }
    else if (line.trim() !== '')       { blocks.push({ type: 'text',   text: line }); i++ }
    else                               { blocks.push({ type: 'blank' }); i++ }
  }

  for (const block of blocks) {
    if (block.type === 'blank') {
      y += 2
    } else if (block.type === 'hr') {
      checkPage(6)
      doc.setDrawColor(220, 220, 235)
      doc.line(margin, y, pageW - margin, y)
      y += 5
    } else if (block.type === 'h1') {
      checkPage(12)
      y += 2
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 50)
      doc.text(stripInline(block.text), margin, y)
      y += 8
    } else if (block.type === 'h2') {
      checkPage(14)
      y += 4
      const label = stripInline(block.text).toUpperCase()
      doc.setFillColor(238, 242, 255)
      doc.rect(margin - 2, y - 5, contentW + 4, 9, 'F')
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(79, 70, 229)
      doc.text(label, margin, y)
      y += 8
    } else if (block.type === 'h3') {
      checkPage(10)
      y += 3
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 50)
      const wrapped = doc.splitTextToSize(stripInline(block.text), contentW)
      doc.text(wrapped, margin, y)
      y += wrapped.length * 5.5 + 1
    } else if (block.type === 'bullet') {
      const text = stripInline(block.text)
      const wrapped = doc.splitTextToSize(text, contentW - 8)
      checkPage(wrapped.length * 5 + 3)
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 70)
      doc.setFillColor(79, 70, 229)
      doc.circle(margin + 1.5, y - 1.5, 1, 'F')
      doc.text(wrapped, margin + 6, y)
      y += wrapped.length * 5 + 2
    } else if (block.type === 'text') {
      const text = stripInline(block.text)
      const wrapped = doc.splitTextToSize(text, contentW)
      checkPage(wrapped.length * 5 + 2)
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 70)
      doc.text(wrapped, margin, y)
      y += wrapped.length * 5 + 2
    } else if (block.type === 'table') {
      const parsed = parseTableBlock(block.rows)
      if (!parsed) continue
      checkPage(30)
      autoTable(doc, {
        startY: y,
        head: [parsed.head],
        body: parsed.body,
        styles: { fontSize: 7.5, cellPadding: 3, overflow: 'linebreak', valign: 'top' },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 28 } },
        didDrawPage: () => { y = 15 },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
    }
  }

  return doc.output('arraybuffer')
}
