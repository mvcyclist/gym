#!/usr/bin/env python3
"""Regenerate favicon.png and apple-touch-icon.png with transparent backgrounds."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public' / 'favicon-source.png'


def whiten_to_alpha(img: Image.Image) -> None:
    pixels = img.load()
    width, height = img.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            brightness = (r + g + b) / 3
            if brightness > 210 and max(r, g, b) - min(r, g, b) < 35:
                pixels[x, y] = (255, 255, 255, 0)
            elif brightness > 180 and r > 170 and g > 170 and b > 170:
                fade = int((255 - brightness) * 3)
                pixels[x, y] = (r, g, b, min(a, max(0, fade)))


def export(size: int, destination: Path) -> None:
    img = Image.open(SOURCE).convert('RGBA')
    whiten_to_alpha(img)
    img.resize((size, size), Image.Resampling.LANCZOS).save(destination, 'PNG')


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f'Missing source icon: {SOURCE}')

    export(32, ROOT / 'public' / 'favicon.png')
    export(180, ROOT / 'public' / 'apple-touch-icon.png')
    print('Wrote public/favicon.png and public/apple-touch-icon.png')


if __name__ == '__main__':
    main()
