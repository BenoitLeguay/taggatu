"""Crop each exercise's notation+tab system out of the PDF into a small PNG.

Output: public/exercises/ex-001.png .. ex-120.png  (the in-app reference image)
The crops are rendered modestly, flattened to greyscale and PNG-optimised so
the whole set stays light enough to prefetch on exercise switches.
"""
import io
import os

import fitz  # pymupdf
from PIL import Image

HERE = os.path.dirname(__file__)
PDF = os.path.join(HERE, "..", "reference", "120ArpeggioExercises.pdf")
OUT = os.path.join(HERE, "..", "public", "exercises")
os.makedirs(OUT, exist_ok=True)

ZOOM = 2.0
TOP_MARGIN = 22  # pts above the "No. N" label
SIDE_MARGIN = 6
TARGET_WIDTH = 1100


def main() -> None:
    doc = fitz.open(PDF)
    total = 0
    for idx in range(120):
        num = idx + 1
        page = doc[idx // 4]
        slot = idx % 4
        labels = sorted(
            (w for w in page.get_text("words") if w[4] == "No."),
            key=lambda w: w[1],
        )
        top = labels[slot][1] - TOP_MARGIN
        if slot + 1 < len(labels):
            bottom = labels[slot + 1][1] - TOP_MARGIN
        else:
            bottom = page.rect.height - 40
        clip = fitz.Rect(SIDE_MARGIN, top, page.rect.width - SIDE_MARGIN, bottom)
        pix = page.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), clip=clip)

        im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("L")
        if im.width > TARGET_WIDTH:
            h = round(im.height * TARGET_WIDTH / im.width)
            im = im.resize((TARGET_WIDTH, h), Image.LANCZOS)
        path = os.path.join(OUT, f"ex-{num:03d}.png")
        im.save(path, optimize=True)
        total += os.path.getsize(path)
    print(
        f"wrote 120 crops -> {os.path.relpath(OUT, HERE)} "
        f"({total / 1024:.0f} KB total, ~{total / 120 / 1024:.1f} KB each)"
    )


if __name__ == "__main__":
    main()
