"""Verify actual PDF stack/postfix paths, then every rasterized edge at 72/96/144 dpi.

Usage: python3 tests/check-pdf-grids.py --output-dir PATH paper.pdf [paper.pdf ...]
Requires pdfplumber, Pillow, and pdftoppm. Run after browser PDF export.
"""

import argparse
import json
import math
from pathlib import Path
import subprocess

import pdfplumber
from PIL import Image


def near(a, b):
    return abs(a - b) < 0.1


def outline_segments(rect):
    x0, x1, y0, y1 = (rect[key] for key in ("x0", "x1", "top", "bottom"))
    return [(x0, y0, x1, y0), (x1, y0, x1, y1),
            (x1, y1, x0, y1), (x0, y1, x0, y0)]


def line_segment(line):
    return tuple(line[key] for key in ("x0", "top", "x1", "bottom"))


def visible_fraction(image, segment, dpi):
    """Every point along a stroke must have dark ink in its one-point band."""
    scale = dpi / 72
    x0, y0, x1, y1 = (value * scale for value in segment)
    radius = math.ceil(scale)
    pixels = image.load()
    found = total = 0
    vertical = near(x0, x1)
    start, end = sorted((y0, y1) if vertical else (x0, x1))
    fixed = round(x0 if vertical else y0)
    for along in range(math.ceil(start) + 2, math.floor(end) - 1):
        total += 1
        coords = [(fixed + offset, along) if vertical else (along, fixed + offset)
                  for offset in range(-radius, radius + 1)]
        found += min(pixels[x, y] for x, y in coords) < 100
    assert total > 0
    return found / total


def check_pdf(path, output_dir):
    report = {"file": str(path), "pages": [], "stacks": 0, "segments_checked": 0}
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            stacks = [rect for rect in page.rects if rect["stroke"]
                      and near(rect["height"], 160) and near(rect["width"], 90)]
            if not stacks:
                continue
            assert len(stacks) == 3, f"Expected stacks A/B/C on {path}:{page.page_number}"
            segments = []
            for rect in stacks:
                rows = [line for line in page.lines if line["stroke"]
                        and near(line["x0"], rect["x0"])
                        and near(line["x1"], rect["x1"])
                        and rect["top"] < line["top"] < rect["bottom"]]
                assert len(rows) == 7, "Eight rows need exactly seven dividers"
                assert all(near(line["top"], rect["top"] + 20 * (index + 1))
                           for index, line in enumerate(sorted(rows, key=lambda row: row["top"])))
                segments += outline_segments(rect) + [line_segment(row) for row in rows]
            postfix = [rect for rect in page.rects if rect["stroke"]
                       and near(rect["height"], 27) and rect["width"] > 200]
            assert len(postfix) == 1, "Expected one intact postfix answer box outline"
            rect = postfix[0]
            columns = [line for line in page.lines if line["stroke"]
                       and near(line["top"], rect["top"])
                       and near(line["bottom"], rect["bottom"])
                       and rect["x0"] < line["x0"] < rect["x1"]]
            assert len(columns) >= 2
            columns.sort(key=lambda column: column["x0"])
            step = rect["width"] / (len(columns) + 1)
            assert all(near(line["x0"], rect["x0"] + step * (index + 1))
                       for index, line in enumerate(columns)), "Postfix boxes must be uniform"
            segments += outline_segments(rect) + [line_segment(column) for column in columns]
            page_result = {"page": page.page_number, "stacks": 3,
                           "postfix_boxes": len(columns) + 1, "renders": []}
            for dpi in (72, 96, 144):
                prefix = output_dir / f"{path.stem}-page-{page.page_number}-{dpi}dpi"
                subprocess.run(["pdftoppm", "-f", str(page.page_number), "-singlefile",
                                "-r", str(dpi), "-png", str(path), str(prefix)], check=True)
                with Image.open(prefix.with_suffix(".png")) as image:
                    fractions = [visible_fraction(image.convert("L"), segment, dpi)
                                 for segment in segments]
                minimum = min(fractions)
                assert minimum == 1, f"Missing grid ink at {path}:{page.page_number}/{dpi}dpi: {minimum}"
                page_result["renders"].append({"dpi": dpi, "line_coverage": minimum})
                report["segments_checked"] += len(segments)
            report["pages"].append(page_result)
            report["stacks"] += len(stacks)
    assert report["stacks"] > 0, f"No stack diagram found in {path}"
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("pdfs", nargs="+", type=Path)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    result = {"status": "passed", "papers": [check_pdf(path, args.output_dir) for path in args.pdfs]}
    (args.output_dir / "grid-verification.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
