const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function escHtml(s: string | null | undefined): string {
  return (s ?? '').replace(/[&<>"']/g, c => ESC[c])
}
