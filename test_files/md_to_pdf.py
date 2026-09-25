"""
Converts a Markdown report (with local image references and tables) into a
styled PDF, by rendering it to standalone HTML and printing that with
headless Chrome. Built for docs/reports/compiled-analysis.md, but works on
any markdown file with relative image links and/or GFM-style tables.

Requires:
    - `pip install markdown`
    - Google Chrome installed at the default macOS path (edit CHROME_PATH
      below if it's somewhere else, or if adapting this for Linux/Windows).

No pandoc/wkhtmltopdf/weasyprint dependency needed.

Usage:
    python3 md_to_pdf.py path/to/report.md path/to/output.pdf
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote

import markdown

CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CSS = """
<style>
  @page { size: A4; margin: 20mm 16mm; }
  body {
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 11px;
    line-height: 1.5;
    color: #1a1a1a;
    max-width: 100%;
  }
  h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 6px; margin-top: 0; }
  h2 { font-size: 17px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 28px; }
  h3 { font-size: 14px; margin-top: 22px; }
  h4 { font-size: 12.5px; margin-top: 18px; color: #222; }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 9px;
    margin: 10px 0 16px 0;
    page-break-inside: auto;
  }
  th, td {
    border: 1px solid #ccc;
    padding: 3px 6px;
    text-align: center;
  }
  th { background: #f0f0f0; font-weight: 600; }
  td:first-child, th:first-child { text-align: left; }
  img {
    max-width: 100%;
    display: block;
    margin: 10px auto 2px auto;
    border: 1px solid #ddd;
    page-break-inside: avoid;
  }
  img + em {
    display: block;
    text-align: center;
    font-size: 10px;
    color: #555;
    margin-bottom: 18px;
    page-break-inside: avoid;
  }
  code {
    background: #f5f5f5;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 10px;
  }
  ul, ol { margin: 4px 0; padding-left: 22px; }
  li { margin: 2px 0; }
  strong { color: #111; }
  hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
</style>
"""


def markdown_to_html(md_path: Path) -> str:
    src_dir = md_path.parent.resolve()
    md_text = md_path.read_text()

    html_body = markdown.markdown(
        md_text, extensions=["tables", "fenced_code", "sane_lists"]
    )

    def resolve_img(match: re.Match) -> str:
        src = match.group(1)
        if src.startswith(("http://", "https://", "file://", "data:")):
            return match.group(0)
        decoded = unquote(src)
        abs_path = (src_dir / decoded).resolve()
        return f'src="file://{abs_path}"'

    html_body = re.sub(r'src="([^"]+)"', resolve_img, html_body)

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{md_path.stem}</title>
{CSS}
</head>
<body>
{html_body}
</body>
</html>"""


def html_to_pdf(html_path: Path, pdf_path: Path) -> None:
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [
            CHROME_PATH,
            "--headless",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_path}",
            "--print-to-pdf-no-header",
            "--virtual-time-budget=20000",
            f"file://{html_path.resolve()}",
        ],
        capture_output=True,
        text=True,
    )
    if not pdf_path.exists():
        print(result.stderr, file=sys.stderr)
        raise RuntimeError("Chrome did not produce a PDF file.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("markdown", type=Path, help="Path to the source .md file")
    parser.add_argument("pdf_out", type=Path, help="Path to write the output .pdf")
    parser.add_argument(
        "--keep-html",
        action="store_true",
        help="Also keep the intermediate HTML file next to the PDF (for debugging)",
    )
    args = parser.parse_args()

    if not args.markdown.exists():
        raise SystemExit(f"Markdown file not found: {args.markdown}")
    if not Path(CHROME_PATH).exists():
        raise SystemExit(
            f"Chrome not found at {CHROME_PATH}. Edit CHROME_PATH in this script."
        )

    html = markdown_to_html(args.markdown)
    html_path = args.pdf_out.with_suffix(".html")
    html_path.write_text(html)

    html_to_pdf(html_path, args.pdf_out)

    if not args.keep_html:
        html_path.unlink()

    print(f"wrote {args.pdf_out}")


if __name__ == "__main__":
    main()
