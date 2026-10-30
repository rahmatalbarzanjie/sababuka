"""Worker kecil untuk mengekstrak satu PDF audit ke cache teks per halaman."""

from pathlib import Path
import sys

from pypdf import PdfReader


pdf_path = Path(sys.argv[1])
text_path = Path(sys.argv[2]) if len(sys.argv) > 2 else pdf_path.with_suffix(".txt")
pages = []
for page in PdfReader(str(pdf_path)).pages:
    try:
        pages.append(page.extract_text() or "")
    except Exception:
        pages.append("")
text_path.write_text("\n\f\n".join(pages), encoding="utf-8")
print(f"{pdf_path.name}: {len(pages)} halaman, {sum(map(len, pages)):,} karakter")
