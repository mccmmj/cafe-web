#!/usr/bin/env python3
"""Convert invoice PDF into PNG and JPG images using pdf2image."""

import argparse
from pathlib import Path

try:
    from pdf2image import convert_from_path
except ImportError as exc:
    raise SystemExit("pdf2image is required. Install with `pip install pdf2image`.") from exc


def parse_args():
    parser = argparse.ArgumentParser(description="Render invoice PDF to PNG/JPG.")
    parser.add_argument('--input', required=True, help='Path to the invoice PDF')
    parser.add_argument('--png', help='Output PNG path (optional)')
    parser.add_argument('--jpg', help='Output JPG path (optional)')
    parser.add_argument('--dpi', type=int, default=200, help='Rendering DPI (default: 200)')
    return parser.parse_args()


def ensure_parent(path: Path):
    if path and path.parent and not path.parent.exists():
        path.parent.mkdir(parents=True, exist_ok=True)


def main():
    args = parse_args()

    pdf_path = Path(args.input)
    if not pdf_path.exists():
        raise SystemExit(f'PDF not found: {pdf_path}')

    outputs = []
    if args.png:
        outputs.append((Path(args.png), 'PNG'))
    if args.jpg:
        outputs.append((Path(args.jpg), 'JPEG'))

    if not outputs:
        raise SystemExit('Specify at least --png or --jpg output path.')

    images = convert_from_path(str(pdf_path), dpi=args.dpi)
    if not images:
        raise SystemExit('No pages rendered from PDF.')

    first_page = images[0]

    for output_path, fmt in outputs:
        ensure_parent(output_path)
        first_page.save(str(output_path), fmt)
        print(f'Generated {fmt} image at {output_path}')


if __name__ == '__main__':
    main()
