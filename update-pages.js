const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'pages');
const pages = ['works.html', 'materials.html', 'new-work.html'];

const newHead = `<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PAGE_TITLE</title>
    <link rel="stylesheet" href="../css/theme.css">
    <link rel="stylesheet" href="../css/components.css">
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.1/dist/index.global.js"></script>
    <script src="https://unpkg.com/lucide@1.8.0/dist/umd/lucide.min.js"></script>
    <style type="text/tailwindcss">
  @theme inline {
    --color-background: var(--color-background);
    --color-foreground: var(--color-foreground);
    --color-card: var(--color-card);
    --color-primary: var(--color-primary);
    --color-muted-foreground: var(--color-muted-foreground);
    --color-accent: var(--color-accent);
    --color-border: var(--color-border);
  }
  @layer base {
    body { background: var(--color-background); color: var(--color-foreground); }
    td, th { @apply break-words; word-break: break-all; word-break: auto-phrase; }
    th { @apply whitespace-nowrap; }
  }
    </style>
    <style>
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      [data-icon] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        -webkit-mask-size: contain;
        mask-size: contain;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        -webkit-mask-position: center;
        mask-position: center;
        background-color: currentColor;
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
    </style>
</head>
`;

const titles = {
  'works.html': '作品管理',
  'materials.html': '创作素材库',
  'new-work.html': '新建作品'
};

pages.forEach(page => {
  const filePath = path.join(pagesDir, page);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Extract body content
  const bodyStart = content.indexOf('<body');
  const bodyEndTag = content.indexOf('<!-- Codex-style popup toggle');
  
  if (bodyStart === -1 || bodyEndTag === -1) {
    console.log(`Skipping ${page}: could not find body boundaries`);
    return;
  }

  const bodyContent = content.substring(bodyStart, bodyEndTag);

  // Find extra styles after the script section (for materials and new-work pages)
  let extraStyles = '';
  const scriptEnd = content.indexOf('</script>', bodyEndTag);
  if (scriptEnd !== -1) {
    const afterScript = content.substring(scriptEnd + 9, content.lastIndexOf('</body>'));
    // Extract style blocks
    const styleMatch = afterScript.match(/<style>([\s\S]*?)<\/style>/g);
    if (styleMatch) {
      extraStyles = styleMatch.join('\n') + '\n';
    }
  }

  // Build new file content
  const title = titles[page] || page.replace('.html', '');
  const head = newHead.replace('PAGE_TITLE', title);
  const newContent = head + bodyContent + extraStyles + '<script src="../js/main.js"></script>\n</body>\n</html>';

  fs.writeFileSync(filePath, newContent, 'utf-8');
  console.log(`${page} updated successfully`);
});

console.log('All pages updated!');
