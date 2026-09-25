#!/usr/bin/env python3
r"""
Convert a Markdown report in docs/reports/ to a standalone LaTeX file.

Wraps pandoc (must be installed: `brew install pandoc`), pointing image
resource paths at docs/reports/ so relative figure links (e.g.
`figures/figure1.png`) resolve correctly, and produces a self-contained
.tex using pandoc's default article template with numbered sections,
laid out in two-column (`twocolumn`) format at 10pt with tighter
margins to keep line lengths reasonable in each column.

Pandoc always renders Markdown pipe tables as `longtable`, a
page-breaking environment sized to \linewidth. In twocolumn mode
\linewidth is only one column wide, so wide tables overflow the
column badly. Since this paper's tables are all short enough to need
no pagination, this script rewrites each `longtable` block into a
`table*` float (LaTeX's standard two-column-spanning float) containing
a plain `tabular`, after pandoc runs.

Pandoc also emits figure references as relative paths (e.g.
`figures/figure1.png`), which resolve fine locally as long as a
`figures/` folder sits next to the .tex, but Overleaf only ever sees
files you actually upload into the project -- it has no access to this
machine's filesystem. So this script keeps the figure paths relative
(no absolute \graphicspath) and instead offers `--zip` to bundle the
.tex together with a `figures/` copy into a single .zip you can drag
straight into Overleaf (New Project -> Upload Project).

The source markdown's first heading (`# Title`) and the italicized line
right after it (`*subtitle*`) are ordinary Markdown, not pandoc title
metadata, so by default pandoc just renders them as a numbered
`\section` -- squeezed into a single (half-width) column like any other
heading, and counted as section "1" ahead of the real section 1
(Introduction). This script instead extracts that title/subtitle pair
before handing the file to pandoc, passes them as real title metadata
(`-M title=... -M subtitle=...`), and promotes every other top-level
heading up one level so they become the properly-numbered sections
pandoc's \maketitle expects to follow. \maketitle itself is never
numbered (unlike a heading), and the generated \maketitle is wrapped
in `\twocolumn[...]` so the title block spans the full page width
instead of being squeezed into one column.

Usage:
    python3 md_to_latex.py [input.md] [-o output.tex] [--zip [output.zip]]

Defaults to research-paper.md -> research-paper.tex if no args given.
"""

import argparse
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

REPORTS_DIR = Path(__file__).parent.parent / "docs" / "reports"

# Matches the source markdown's title block: an H1 title, a blank line,
# then an italicized subtitle line, e.g.:
#   # Compositional Operators and Novelty Saturation ...
#
#   *A study of the Spellbox generation system*
TITLE_BLOCK_RE = re.compile(
    r"\A# (?P<title>[^\n]+)\n"
    r"\n"
    r"\*(?P<subtitle>[^\n]+)\*\n",
)


def extract_title_block(md: str) -> tuple[str, str | None, str]:
    """Splits off the leading `# Title` / `*subtitle*` block, if present.

    Returns (title, subtitle, remaining_markdown). Every remaining
    top-level (`#`) heading -- there shouldn't be any once the title is
    removed, since the paper uses `##` for its actual sections -- is left
    untouched; only the very first H1 is treated as the document title.
    """
    match = TITLE_BLOCK_RE.match(md)
    if not match:
        return "", None, md
    return match.group("title"), match.group("subtitle"), md[match.end():]


def promote_headings(md: str) -> str:
    """Shifts every heading up one level (## -> #, ### -> ##, ...).

    Once the title's own `# Title` line is pulled out as real title
    metadata, the paper's `##` sections (Abstract, Introduction, ...) need
    to become `#` so pandoc numbers them as top-level sections 1, 2, 3,
    ... instead of orphaned subsections nested under nothing.
    """
    return re.sub(r"^(#{2,6}) ", lambda m: m.group(1)[1:] + " ", md, flags=re.MULTILINE)


# Matches a heading's own hand-written numeric prefix, e.g. "1. " in
# "## 1. Introduction" or "1.1 " in "### 1.1 Background".
HEADING_NUMBER_PREFIX_RE = re.compile(r"^(#{1,6}) [\d]+(?:\.[\d]+)*\.? +", re.MULTILINE)


def strip_heading_numbers(md: str) -> str:
    """Removes hand-written numeric prefixes ("1.", "1.1") from headings.

    The source markdown numbers its own sections/subsections by hand
    (`## 1. Introduction`, `### 1.1 Background`), but this script also
    passes `--number-sections` so pandoc/LaTeX auto-numbers every
    heading. Left alone, that produces double numbering (LaTeX's "2 1.
    Introduction") that's also wrong once Abstract -- which has no
    hand-written number -- takes LaTeX's slot "1". Stripping the
    hand-written prefix leaves LaTeX's own numbering as the only one.
    """
    return HEADING_NUMBER_PREFIX_RE.sub(lambda m: m.group(1) + " ", md)


# Matches one pandoc-emitted uncaptioned longtable block, e.g.:
#   {\def\LTcaptype{none} % do not increment counter
#   \begin{longtable}[]{@{}lccc@{}}
#   ...body...
#   \end{longtable}
#   }
LONGTABLE_BLOCK_RE = re.compile(
    r"\{\\def\\LTcaptype\{none\}[^\n]*\n"
    r"\\begin\{longtable\}\[\]\{(?P<colspec>@\{\}.*?@\{\})\}\n"
    r"(?P<body>.*?)"
    r"\\end\{longtable\}\n\}",
    re.DOTALL,
)


def widen_tables_for_twocolumn(tex: str) -> str:
    """Rewrite longtable blocks into page-width-spanning tabularx floats.

    longtable can't be used inside twocolumn text (it always sizes to the
    current column, and pandoc's uncaptioned wrapper doesn't float), so a
    table with more than a couple of columns overflows and gets mangled.

    table* is a standard float that spans both columns, but a plain
    tabular still sizes each column to its widest *unbroken* cell -- a
    table with several wordy headers (e.g. "Effective space (all-spells,
    mean)") just keeps growing past \\textwidth instead of wrapping, which
    is the "table still runs off the page" failure. Switching to
    tabularx's `X` columns instead fixes the table to \\textwidth and lets
    every column share that width equally, wrapping header/cell text onto
    multiple lines rather than stretching the table. Table structure/data
    is unchanged, only the surrounding environment and column spec.
    """

    def replace(match: re.Match) -> str:
        colspec = match.group("colspec")
        body = match.group("body")
        # longtable's structure is: \toprule <header> \midrule \endhead
        # \bottomrule \endlastfoot <data rows>. The \bottomrule there
        # belongs to the *end* of the table (it's the last-page footer),
        # not literally between \midrule and the data, so it has to move
        # down along with the pagination-hook strip.
        header, _, data = body.partition("\\endhead\n")
        _, _, data = data.partition("\\endlastfoot\n")
        header = header.replace("\\bottomrule\\noalign{}\n", "")
        header = header.replace("\\noalign{}", "")
        data = data.replace("\\noalign{}", "")
        # Every original alignment letter (l/c/r) becomes one X column;
        # left-align each so wrapped multi-line cells don't look centered
        # inconsistently line-to-line.
        num_cols = len(re.findall(r"[lcr]", colspec))
        tabularx_colspec = ">{\\raggedright\\arraybackslash}X" * num_cols
        return (
            "\\begin{table*}[t]\n"
            "\\centering\n"
            f"\\begin{{tabularx}}{{\\textwidth}}{{{tabularx_colspec}}}\n"
            f"{header}"
            f"{data}"
            "\\bottomrule\n"
            "\\end{tabularx}\n"
            "\\end{table*}"
        )

    return LONGTABLE_BLOCK_RE.sub(replace, tex)


def ensure_tabularx(tex: str) -> str:
    """Add \\usepackage{tabularx}, needed by the rewritten tables' X columns."""
    marker = "\\usepackage{longtable,booktabs,array}\n"
    if marker not in tex:
        raise ValueError("expected \\usepackage{longtable,booktabs,array} in pandoc output")
    return tex.replace(marker, marker + "\\usepackage{tabularx}\n", 1)


def widen_title_for_twocolumn(tex: str) -> str:
    """Wraps \\maketitle in \\twocolumn[...] so the title spans the full page.

    In a twocolumn document, \\maketitle on its own still only lays out
    within the current (single) column -- the standard LaTeX idiom for a
    full-width title block is \\twocolumn[\\maketitle], which typesets the
    bracketed content across both columns before the normal two-column
    flow resumes for the abstract/body that follows.

    Pandoc's \\providecommand{\\subtitle} preamble block (emitted whenever
    a subtitle is set) contains its own comment mentioning "\\maketitle",
    which appears earlier in the file than the real \\maketitle command --
    matching on the bare command name alone would wrap that comment
    instead. The real command is the one right after \\begin{document}.
    """
    marker = "\\begin{document}\n\\maketitle\n"
    if marker not in tex:
        raise ValueError("expected \\maketitle in pandoc output (is there a title/subtitle to extract?)")
    return tex.replace(marker, "\\begin{document}\n\\twocolumn[\\maketitle]\n", 1)


def collect_figure_paths(tex: str) -> list[str]:
    """Returns every relative image path referenced via \\includegraphics."""
    return re.findall(r"\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}", tex)


def build_overleaf_zip(tex_path: Path, tex: str, source_dir: Path, zip_path: Path) -> None:
    """Bundle the .tex plus every figure it references into one .zip.

    Overleaf has no access to this machine's filesystem -- it only sees
    whatever's inside the uploaded project. Each figure path in the .tex
    is relative (e.g. `figures/figure1.png`), so the zip mirrors that same
    relative layout, and the whole thing can be dragged into Overleaf via
    New Project -> Upload Project with no further edits.
    """
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(tex_path.name, tex)
        for rel_path in collect_figure_paths(tex):
            src = (source_dir / rel_path).resolve()
            if not src.exists():
                print(f"warning: figure not found, skipping: {src}", file=sys.stderr)
                continue
            zf.write(src, arcname=rel_path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "input",
        nargs="?",
        default=str(REPORTS_DIR / "research-paper.md"),
        help="Path to the source Markdown file (default: research-paper.md)",
    )
    parser.add_argument(
        "-o", "--output",
        default=None,
        help="Path to the output .tex file (default: <input-stem>.tex next to the input)",
    )
    parser.add_argument(
        "--zip",
        nargs="?",
        const="",
        default=None,
        metavar="output.zip",
        help=(
            "Also bundle the .tex plus every referenced figure into a .zip "
            "(default: <input-stem>.zip next to the input) -- upload this "
            "directly to Overleaf via New Project > Upload Project."
        ),
    )
    args = parser.parse_args()

    if shutil.which("pandoc") is None:
        print("error: pandoc not found on PATH. Install it with `brew install pandoc`.", file=sys.stderr)
        sys.exit(1)

    input_path = Path(args.input).resolve()
    if not input_path.exists():
        print(f"error: input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    output_path = Path(args.output).resolve() if args.output else input_path.with_suffix(".tex")

    md = input_path.read_text()
    title, subtitle, body_md = extract_title_block(md)
    body_md = promote_headings(body_md)
    body_md = strip_heading_numbers(body_md)

    with tempfile.TemporaryDirectory() as tmp_dir:
        preprocessed_path = Path(tmp_dir) / input_path.name
        preprocessed_path.write_text(body_md)

        cmd = [
            "pandoc",
            str(preprocessed_path),
            "-f", "gfm",
            "-t", "latex",
            "-o", str(output_path),
            "--standalone",
            "--number-sections",
            f"--resource-path={input_path.parent}",
            "-V", "classoption:twocolumn",
            "-V", "geometry:margin=0.75in",
            "-V", "fontsize=10pt",
            "-V", "linkcolor:blue",
        ]
        if title:
            cmd += ["-M", f"title={title}"]
        if subtitle:
            cmd += ["-M", f"subtitle={subtitle}"]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print("pandoc conversion failed:", file=sys.stderr)
            print(result.stderr, file=sys.stderr)
            sys.exit(result.returncode)

        if result.stderr.strip():
            print(result.stderr, file=sys.stderr)

    tex = output_path.read_text()
    tex = widen_tables_for_twocolumn(tex)
    tex = ensure_tabularx(tex)
    if title:
        tex = widen_title_for_twocolumn(tex)
    output_path.write_text(tex)

    print(f"Wrote {output_path}")

    if args.zip is not None:
        zip_path = Path(args.zip).resolve() if args.zip else output_path.with_suffix(".zip")
        build_overleaf_zip(output_path, tex, input_path.parent, zip_path)
        print(f"Wrote {zip_path} (upload this to Overleaf)")


if __name__ == "__main__":
    main()
