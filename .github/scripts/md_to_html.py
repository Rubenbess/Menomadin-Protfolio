"""Convert a markdown deal report to a styled HTML email body.
Usage: echo "$CONTENT" | python3 md_to_html.py REPORT_DATE WEEK_OF
"""
import sys, re, html as html_mod

report_date = sys.argv[1]
week_of     = sys.argv[2]
content     = sys.stdin.read()

def esc(s):
    return html_mod.escape(s)

def inline(s):
    s = esc(s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', s)
    return s

lines = content.split('\n')
body  = ''
i     = 0

while i < len(lines):
    line = lines[i]

    if line.startswith('|'):
        tbl, i2 = [], i
        while i2 < len(lines) and lines[i2].startswith('|'):
            tbl.append(lines[i2]); i2 += 1
        data = [r for r in tbl if not re.match(r'^\|[\s|:-]+\|$', r)]
        if len(data) >= 2:
            heads = [c.strip() for c in data[0].split('|') if c.strip()]
            rows  = [[c.strip() for c in r.split('|') if c.strip()] for r in data[1:]]
            body += '<table style="border-collapse:collapse;width:100%;font-size:12px;margin:12px 0">'
            body += '<thead><tr>' + ''.join(
                f'<th style="background:#4f46e5;color:#fff;padding:6px 10px;text-align:left">{esc(h)}</th>'
                for h in heads) + '</tr></thead>'
            body += '<tbody>' + ''.join(
                '<tr style="background:' + ('#fff' if ri % 2 == 0 else '#f8fafc') + '">' +
                ''.join(f'<td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">{esc(c)}</td>' for c in row) +
                '</tr>'
                for ri, row in enumerate(rows)) + '</tbody>'
            body += '</table>'
        i = i2
        continue

    if line.startswith('# '):
        body += f'<h1 style="font-size:20px;font-weight:700;color:#111827;margin:16px 0 4px">{inline(line[2:])}</h1>'
    elif line.startswith('## '):
        body += f'<h2 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#4f46e5;background:#eef2ff;padding:6px 10px;margin:24px 0 8px">{inline(line[3:])}</h2>'
    elif line.startswith('### '):
        body += f'<h3 style="font-size:14px;font-weight:700;color:#111827;margin:12px 0 4px">{inline(line[4:])}</h3>'
    elif re.match(r'^-{3,}$', line):
        body += '<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>'
    elif re.match(r'^[-*] ', line):
        body += f'<p style="margin:4px 0;font-size:13px;color:#374151;padding-left:14px">&bull; {inline(line[2:])}</p>'
    elif line.strip():
        body += f'<p style="margin:4px 0;font-size:13px;color:#374151">{inline(line)}</p>'
    else:
        body += '<div style="height:6px"></div>'
    i += 1

print(f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;background:#f1f5f9">
<div style="max-width:760px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <div style="background:#4f46e5;padding:28px 32px">
    <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#c7d2fe">Deal Report</p>
    <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#fff">Israeli Tech Ecosystem</h1>
    <p style="margin:0;font-size:13px;color:#c7d2fe">Week of {week_of}</p>
  </div>
  <div style="padding:28px 32px">{body}</div>
  <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af">
    Menomadin Catalyst &middot; Automated weekly report
  </div>
</div></body></html>""")
