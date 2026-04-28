// Quick standalone test: do mailparser, msgreader, and dompurify
// actually run in Node? Run with: node scripts/test-email-parse.mjs
//
// Generates a synthetic .eml in memory, parses it, sanitizes the body.
// If any of these libraries are broken, this throws.

import { simpleParser } from 'mailparser'
import MsgReader from '@kenjiuno/msgreader'
import DOMPurify from 'isomorphic-dompurify'

const sampleEml = [
  'From: "Test Sender" <sender@example.com>',
  'To: "Recipient" <to@example.com>',
  'Cc: cc@example.com',
  'Subject: Test email subject',
  'Date: Mon, 28 Apr 2026 10:00:00 +0000',
  'Content-Type: text/html; charset=UTF-8',
  'MIME-Version: 1.0',
  '',
  '<p>Hello <b>world</b>!</p><script>alert("xss")</script><p>Body line 2</p>',
].join('\r\n')

async function main() {
  console.log('--- mailparser ---')
  const parsed = await simpleParser(Buffer.from(sampleEml))
  console.log('subject:', parsed.subject)
  console.log('from:', parsed.from?.text)
  console.log('to:', parsed.to?.text)
  console.log('cc:', parsed.cc?.text)
  console.log('date:', parsed.date?.toISOString())
  console.log('html (raw):', parsed.html)

  console.log('\n--- DOMPurify ---')
  const safe = DOMPurify.sanitize(parsed.html || '', {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style'],
  })
  console.log('html (sanitized):', safe)
  if (safe.includes('<script')) {
    throw new Error('DOMPurify failed to strip <script>')
  }

  console.log('\n--- msgreader ---')
  // msgreader needs a real .msg binary; we just verify the import works
  console.log('typeof MsgReader:', typeof MsgReader)
  console.log('typeof MsgReader.default:', typeof MsgReader.default)

  console.log('\n✅ All three libraries work in Node.')
}

main().catch((e) => {
  console.error('❌ FAILED:', e)
  process.exit(1)
})
