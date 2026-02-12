#!/usr/bin/env python3
"""Genera el icono fuente de la app: `trust` en Poppins Bold negro sobre fondo amarillo.

Uso:
  python tools/generate_app_icon.py
"""

from __future__ import annotations

from pathlib import Path
from urllib.request import urlretrieve

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = ROOT / "assets" / "icon"
OUTPUT_ICON = ASSETS_DIR / "app_icon.png"
FONT_PATH = ASSETS_DIR / "Poppins-Bold.ttf"
FONT_URL = "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf"

BG_COLOR = "#F9DF00"
TEXT_COLOR = "#000000"
TEXT = "trust"
CANVAS_SIZE = 1024
START_FONT_SIZE = 260
MAX_TEXT_WIDTH_RATIO = 0.85


def ensure_font() -> None:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    if not FONT_PATH.exists():
        print(f"Descargando fuente: {FONT_URL}")
        urlretrieve(FONT_URL, FONT_PATH)


def build_icon() -> None:
    img = Image.new("RGB", (CANVAS_SIZE, CANVAS_SIZE), BG_COLOR)
    draw = ImageDraw.Draw(img)

    font_size = START_FONT_SIZE
    font = ImageFont.truetype(str(FONT_PATH), font_size)
    bbox = draw.textbbox((0, 0), TEXT, font=font)
    text_w = bbox[2] - bbox[0]

    while text_w > CANVAS_SIZE * MAX_TEXT_WIDTH_RATIO and font_size > 10:
        font_size -= 10
        font = ImageFont.truetype(str(FONT_PATH), font_size)
        bbox = draw.textbbox((0, 0), TEXT, font=font)
        text_w = bbox[2] - bbox[0]

    text_h = bbox[3] - bbox[1]
    x = (CANVAS_SIZE - text_w) // 2
    y = (CANVAS_SIZE - text_h) // 2 - 20

    draw.text((x, y), TEXT, font=font, fill=TEXT_COLOR)
    img.save(OUTPUT_ICON)
    print(f"Icono generado: {OUTPUT_ICON}")


def main() -> None:
    ensure_font()
    build_icon()


if __name__ == "__main__":
    main()
