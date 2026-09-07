"""Crop each exercise's notation+tab system out of the PDF into a PNG.

Output: public/exercises/ex-001.png .. ex-120.png  (used as the in-app reference)
"""
import os

import fitz  # pymupdf

HERE = os.path.dirname(__file__)
PDF = os.path.join(HERE, "..", "reference", "120ArpeggioExercises.pdf")
OUT = os.path.join(HERE, "..", "public", "exercises")
os.makedirs(OUT, exist_ok=True)

ZOOM = 3.0
TOP_MARGIN = 22  # pts above the "No. N" label
SIDE_MARGIN = 6


def main() -> None:
    doc = fitz.open(PDF)
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
        pix.save(os.path.join(OUT, f"ex-{num:03d}.png"))
    print(f"wrote 120 crops -> {os.path.relpath(OUT, HERE)}")


if __name__ == "__main__":
    main()
