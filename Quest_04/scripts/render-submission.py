"""Rebuild the three browser previews from their submitted Markdown sources.

Requires Python's markdown package. Existing shared page styling is preserved.
"""
from pathlib import Path
import re
import markdown

root = Path(__file__).resolve().parents[1]
for name in ("README", "SKILL", "VALIDATION"):
    target = root / f"{name}.html"
    previous = target.read_text(encoding="utf-8")
    prefix = previous[:previous.index("<h1>")]
    source = (root / f"{name}.md").read_text(encoding="utf-8")
    if name == "SKILL":
        source = re.sub(r"\A---\n.*?\n---\n", "", source, count=1, flags=re.S)
    body = markdown.markdown(source, extensions=["tables", "fenced_code"])
    body = re.sub(r'href="\./(README|SKILL|VALIDATION)\.md"', r'href="./\1.html"', body)
    target.write_text(prefix + body + "</main></body></html>\n", encoding="utf-8")
    print(f"Updated {target.name}")
