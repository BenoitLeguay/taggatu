"""Dump the Giuliani PDF as positioned words so the tab grid can be reconstructed.

Output: scripts/raw/words.json  — list of pages, each a list of
        {x0,y0,x1,y1,text,block,line,word}
Also renders each page to scripts/raw/pageNN.png for visual verification.
"""
import json
import os
import sys

import fitz  # pymupdf

HERE = os.path.dirname(__file__)
PDF = os.path.join(HERE, "..", "reference", "120ArpeggioExercises.pdf")
OUT = os.path.join(HERE, "raw")
os.makedirs(OUT, exist_ok=True)


def main(render: bool) -> None:
    doc = fitz.open(PDF)
    pages = []
    for pno in range(doc.page_count):
        page = doc[pno]
        words = []
        for w in page.get_text("words"):
            x0, y0, x1, y1, text, block, line, wordno = w
            words.append(
                dict(
                    x0=round(x0, 2),
                    y0=round(y0, 2),
                    x1=round(x1, 2),
                    y1=round(y1, 2),
                    text=text,
                    block=block,
                    line=line,
                    word=wordno,
                )
            )
        pages.append(words)
        if render:
            pix = page.get_pixmap(matrix=fitz.Matrix(2.6, 2.6))
            pix.save(os.path.join(OUT, f"page{pno + 1:02d}.png"))
    with open(os.path.join(OUT, "words.json"), "w") as fh:
        json.dump(pages, fh)
    print(f"dumped {len(pages)} pages -> {OUT}/words.json")


if __name__ == "__main__":
    main(render="--render" in sys.argv)
