import re
import os

def update_page(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove theme-vars inline style block
    # Find the start of the comment after the CSS links
    start_idx = content.find('/**')
    if start_idx != -1:
        # Find the closing of the :root block
        root_end = content.find('}\n}', start_idx)
        if root_end != -1:
            root_end += 2
            content = content[:start_idx].rstrip() + '\n' + content[root_end:].lstrip()

    # Remove component-vars inline style block (style id="component-vars")
    comp_start = content.find('<style id="component-vars">')
    if comp_start != -1:
        comp_end = content.find('</style>', comp_start)
        if comp_end != -1:
            comp_end += 8
            content = content[:comp_start] + content[comp_end:]

    # Replace inline popup scripts with external reference
    inline_script_start = content.find('<!-- Codex-style popup toggle')
    if inline_script_start != -1:
        inline_script_end = content.find('</script>', inline_script_start)
        if inline_script_end != -1:
            inline_script_end += 8
            content = content[:inline_script_start] + '<script src="../js/main.js"></script>' + content[inline_script_end:]

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'{os.path.basename(file_path)} updated successfully')

pages = [
    r'c:\Users\34243\Desktop\AI写作\ai-writing-tool\pages\works.html',
    r'c:\Users\34243\Desktop\AI写作\ai-writing-tool\pages\materials.html',
    r'c:\Users\34243\Desktop\AI写作\ai-writing-tool\pages\new-work.html'
]

for page in pages:
    update_page(page)