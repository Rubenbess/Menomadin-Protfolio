import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireCronAuth } from '@/lib/api-auth'

interface Recipient { email: string; name?: string | null }

export async function POST(req: NextRequest) {
  const cronError = requireCronAuth(req)
  if (cronError) return cronError

  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@menomadin.com'

  if (!resendKey) {
    return NextResponse.json({ error: 'Missing RESEND_API_KEY' }, { status: 500 })
  }

  let body: { report_date?: string; content?: string; recipients?: Recipient[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { report_date, content, recipients } = body
  if (!report_date || !content) {
    return NextResponse.json({ error: 'Missing report_date or content' }, { status: 400 })
  }
  if (!recipients || recipients.length === 0) {
    return NextResponse.json({ sent: false, reason: 'No recipients provided' })
  }

  const weekOf = new Date(report_date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const subject = `Menomadin Israeli Tech Deal Report — Week of ${weekOf}`
  const toAddresses = recipients.map(r => r.name ? `${r.name} <${r.email}>` : r.email)

  // Try PDF generation — fall back to HTML-only if it fails in serverless
  let attachments: { filename: string; content: Buffer }[] = []
  let pdfError: string | null = null
  try {
    const pdfBytes = await generateReportPDF(report_date, content)
    attachments = [{ filename: `menomadin-deal-report-${report_date}.pdf`, content: Buffer.from(pdfBytes) }]
  } catch (err) {
    pdfError = err instanceof Error ? err.message : String(err)
    console.error('[send-deal-report] PDF generation failed, sending HTML only:', pdfError)
  }

  const html = buildHtmlEmail(content, weekOf)

  const resend = new Resend(resendKey)
  const { error: sendError } = await resend.emails.send({
    from: fromEmail,
    to: toAddresses,
    subject,
    html,
    ...(attachments.length > 0 ? { attachments } : {}),
  })

  if (sendError) {
    return NextResponse.json({ error: sendError.message }, { status: 500 })
  }

  return NextResponse.json({
    sent: true,
    recipients: toAddresses.length,
    subject,
    pdf: attachments.length > 0,
    ...(pdfError ? { pdfError } : {}),
  })
}

// ── HTML email builder ─────────────────────────────────────────────────────────

function buildHtmlEmail(markdown: string, weekOf: string): string {
  const lines = markdown.split('\n')
  let html = ''

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('|')) {
      // Table block
      const tableLines: string[] = []
      while (i < lines.length && lines[i].startsWith('|')) { tableLines.push(lines[i]); i++ }
      const dataRows = tableLines.filter(r => !r.match(/^\|[\s|:-]+\|$/))
      if (dataRows.length >= 2) {
        const heads = dataRows[0].split('|').map(c => c.trim()).filter(Boolean)
        const rows  = dataRows.slice(1).map(r => r.split('|').map(c => c.trim()).filter(Boolean))
        html += `<table style="border-collapse:collapse;width:100%;font-size:12px;margin:12px 0">`
        html += `<thead><tr>${heads.map(h => `<th style="background:#4f46e5;color:#fff;padding:6px 10px;text-align:left;font-size:11px">${esc(h)}</th>`).join('')}</tr></thead>`
        html += `<tbody>${rows.map((r, ri) => `<tr style="background:${ri%2===0?'#fff':'#f8fafc'}">${r.map(c => `<td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>`
        html += `</table>`
      }
      continue
    }

    if (line.startsWith('# '))       html += `<h1 style="font-size:20px;font-weight:700;color:#111827;margin:16px 0 4px">${inline(line.slice(2))}</h1>`
    else if (line.startsWith('## ')) html += `<h2 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#4f46e5;background:#eef2ff;padding:6px 10px;margin:24px 0 8px">${inline(line.slice(3))}</h2>`
    else if (line.startsWith('### '))html += `<h3 style="font-size:14px;font-weight:700;color:#111827;margin:16px 0 4px">${inline(line.slice(4))}</h3>`
    else if (line.match(/^-{3,}$/)) html += `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>`
    else if (line.match(/^[-*] /))  html += `<p style="margin:4px 0;font-size:13px;color:#374151;padding-left:14px">• ${inline(line.slice(2))}</p>`
    else if (line.trim() !== '')    html += `<p style="margin:4px 0;font-size:13px;color:#374151">${inline(line)}</p>`
    else                            html += `<div style="height:6px"></div>`

    i++
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;background:#f1f5f9">
<div style="max-width:760px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <div style="background:#4f46e5;padding:28px 32px">
    <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#c7d2fe">Deal Report</p>
    <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#fff">Israeli Tech Ecosystem</h1>
    <p style="margin:0;font-size:13px;color:#c7d2fe">Week of ${esc(weekOf)}</p>
  </div>
  <div style="padding:28px 32px">${html}</div>
  <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af">
    Menomadin Catalyst · This report is generated automatically every Monday.
  </div>
</div></body></html>`
}

function esc(s: string) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function inline(s: string) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/`(.+?)`/g, '<code style="background:#f3f4f6;padding:1px 4px;border-radius:3px;font-size:11px">$1</code>')
}

// ── PDF generator ──────────────────────────────────────────────────────────────

async function generateReportPDF(reportDate: string, content: string): Promise<ArrayBuffer> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 18
  const contentW = pageW - margin * 2
  let y = 36

  const weekOf = new Date(reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  doc.setFillColor(79, 70, 229)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14); doc.setFont('helvetica', 'bold')
  doc.text('Menomadin — Israeli Tech Deal Report', margin, 12)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.setTextColor(199, 210, 254)
  doc.text(`Week of ${weekOf}`, margin, 21)
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageW - margin, 21, { align: 'right' })

  const checkPage = (needed = 8) => { if (y + needed > pageH - 15) { doc.addPage(); y = 15 } }
  const stripInline = (t: string) => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[(.+?)\]\(.+?\)/g, '$1').replace(/`(.+?)`/g, '$1')
  const parseTable = (rows: string[]) => {
    const data = rows.filter(r => !r.match(/^\|[\s|:-]+\|$/))
    if (data.length < 2) return null
    return { head: data[0].split('|').map(c => c.trim()).filter(Boolean), body: data.slice(1).map(r => r.split('|').map(c => c.trim()).filter(Boolean)) }
  }

  type Block = { type: 'h1'|'h2'|'h3'|'hr'|'bullet'|'text'; text: string } | { type: 'table'; rows: string[] } | { type: 'blank' }
  const blocks: Block[] = []
  const raw = content.split('\n')
  let i = 0
  while (i < raw.length) {
    const line = raw[i]
    if (line.startsWith('|')) {
      const t: string[] = []
      while (i < raw.length && raw[i].startsWith('|')) { t.push(raw[i]); i++ }
      blocks.push({ type: 'table', rows: t })
    } else if (line.startsWith('# '))   { blocks.push({ type: 'h1',     text: line.slice(2) });  i++ }
    else if (line.startsWith('## '))    { blocks.push({ type: 'h2',     text: line.slice(3) });  i++ }
    else if (line.startsWith('### '))   { blocks.push({ type: 'h3',     text: line.slice(4) });  i++ }
    else if (line.match(/^-{3,}$/))     { blocks.push({ type: 'hr',     text: '' });             i++ }
    else if (line.match(/^[-*] /))      { blocks.push({ type: 'bullet', text: line.slice(2) });  i++ }
    else if (line.trim())               { blocks.push({ type: 'text',   text: line });            i++ }
    else                                { blocks.push({ type: 'blank' });                         i++ }
  }

  for (const block of blocks) {
    if (block.type === 'blank') { y += 2 }
    else if (block.type === 'hr') { checkPage(6); doc.setDrawColor(220,220,235); doc.line(margin,y,pageW-margin,y); y+=5 }
    else if (block.type === 'h1') { checkPage(12); y+=2; doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(20,20,50); doc.text(stripInline(block.text),margin,y); y+=8 }
    else if (block.type === 'h2') { checkPage(14); y+=4; doc.setFillColor(238,242,255); doc.rect(margin-2,y-5,contentW+4,9,'F'); doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(79,70,229); doc.text(stripInline(block.text).toUpperCase(),margin,y); y+=8 }
    else if (block.type === 'h3') { checkPage(10); y+=3; doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(20,20,50); const w=doc.splitTextToSize(stripInline(block.text),contentW); doc.text(w,margin,y); y+=w.length*5.5+1 }
    else if (block.type === 'bullet') { const w=doc.splitTextToSize(stripInline(block.text),contentW-8); checkPage(w.length*5+3); doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(50,50,70); doc.setFillColor(79,70,229); doc.circle(margin+1.5,y-1.5,1,'F'); doc.text(w,margin+6,y); y+=w.length*5+2 }
    else if (block.type === 'text') { const w=doc.splitTextToSize(stripInline(block.text),contentW); checkPage(w.length*5+2); doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(50,50,70); doc.text(w,margin,y); y+=w.length*5+2 }
    else if (block.type === 'table') { const p=parseTable(block.rows); if(!p) continue; checkPage(30); autoTable(doc,{ startY:y, head:[p.head], body:p.body, styles:{fontSize:7.5,cellPadding:3,overflow:'linebreak',valign:'top'}, headStyles:{fillColor:[79,70,229],textColor:255,fontStyle:'bold',fontSize:7}, alternateRowStyles:{fillColor:[248,250,252]}, margin:{left:margin,right:margin}, columnStyles:{0:{fontStyle:'bold',cellWidth:28}}, didDrawPage:()=>{y=15} }); y=(doc as unknown as {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+6 }
  }

  return doc.output('arraybuffer')
}
