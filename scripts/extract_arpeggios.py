"""Reconstruct the 120 Giuliani exercises from positioned PDF words.

Every exercise is one tab system = 3 measures in 4/4:
  measure 1  arpeggio over a C major shape
  measure 2  the same right-hand pattern over a G7 shape
  measure 3  a single held resolution chord (C)

Each measure becomes an ordered list of "columns" (attacks). A column carries
one or more {string, fret} notes. Rhythms in this collection are, by design,
uniform subdivisions, so timing is reconstructed as an even grid across the bar
rather than trusting pixel gaps (which are only roughly proportional).

Output: src/data/giuliani.json
"""
import json
import os
import re
import statistics
from collections import defaultdict

HERE = os.path.dirname(__file__)
WORDS = os.path.join(HERE, "raw", "words.json")
OUT = os.path.join(HERE, "..", "src", "data", "giuliani.json")

BEATS_PER_MEASURE = 4.0
FINGER_MAP = {"T": "t", "I": "i", "M": "m", "A": "a", "P": "t", "a": "a"}
CHORD_BY_MEASURE = ["C", "G7", "C"]

SUBDIVISION = {
    2: "half note",
    3: "half-note triplet",
    4: "quarter note",
    6: "eighth-note triplet",
    8: "eighth note",
    12: "sixteenth-note triplet",
    16: "sixteenth note",
    24: "thirty-second triplet",
    32: "thirty-second note",
}


def is_int_token(t):
    return bool(re.fullmatch(r"\d{1,2}", t))


def cluster_x(xs, tol):
    out = []
    for v in sorted(xs):
        if out and v - out[-1][-1] <= tol:
            out[-1].append(v)
        else:
            out.append([v])
    return [statistics.fmean(g) for g in out]


def nearest(value, centers):
    return min(range(len(centers)), key=lambda i: abs(value - centers[i]))


def merge_voice_splits(centers, note_groups):
    """Two-voice textures draw the notes of one attack a few px apart. Merge
    consecutive columns whose gap is far below the typical attack spacing."""
    if len(centers) < 3:
        return centers, note_groups
    gaps = sorted(b - a for a, b in zip(centers, centers[1:]))
    typical = gaps[len(gaps) // 2]
    threshold = max(2.5, 0.5 * typical)
    out_c, out_n = [centers[0]], [list(note_groups[0])]
    for c, notes in zip(centers[1:], note_groups[1:]):
        if c - out_c[-1] < threshold:
            out_n[-1].extend(notes)
            out_c[-1] = (out_c[-1] + c) / 2
        else:
            out_c.append(c)
            out_n.append(list(notes))
    return out_c, out_n


def extract_fingering(band, row_y, edges, tol, m1_cols):
    """Right-hand fingering letters (t/i/m/a) are printed above the top staff
    line, over the first pattern cycle of measure 1. Returns
      {"cycle": N, "byPosition": [[finger, ... top->bottom], ...]}   (cycle 0 = none)

    Letters at one x form a vertical stack that applies to the note column
    beneath it; within the stack they map to that column's notes by vertical
    order (the highest-pitched note gets the top letter). That rank mapping is
    voicing-independent, so the same cycle is reused for the G7 bar.
    """
    if not m1_cols:
        return {"cycle": 0, "byPosition": []}

    words = [
        w
        for w in band
        if w["text"] in FINGER_MAP
        and w["y0"] < row_y[0] - 3
        and edges[0] - 4 <= w["x0"] <= edges[1] + 4
    ]
    if not words:
        return {"cycle": 0, "byPosition": []}

    stacks = []
    for w in sorted(words, key=lambda w: w["x0"]):
        if stacks and w["x0"] - max(x["x0"] for x in stacks[-1]) <= tol + 1:
            stacks[-1].append(w)
        else:
            stacks.append([w])

    col_x = [cx for cx, _ in m1_cols]
    pos_map = {}
    for st in stacks:
        letters = sorted(st, key=lambda w: w["y0"])  # top -> bottom
        cx = sum(w["x0"] for w in letters) / len(letters)
        ci = min(range(len(col_x)), key=lambda i: abs(col_x[i] - cx))
        pos_map[ci] = [FINGER_MAP[w["text"]] for w in letters]

    cycle = max(pos_map) + 1
    return {"cycle": cycle, "byPosition": [pos_map.get(i, []) for i in range(cycle)]}


def extract_exercise(page, slot, num):
    no_words = [w for w in page if w["text"] == "No."]
    no_words.sort(key=lambda w: w["y0"])
    top = no_words[slot]["y0"]
    bottom = no_words[slot + 1]["y0"] if slot + 1 < len(no_words) else 1e9
    band = [w for w in page if top - 2 <= w["y0"] < bottom]

    # the exercise-number word itself ("30" in "No. 30") — exclude from notes
    no_idx = next(i for i, w in enumerate(page) if w is no_words[slot])
    label_num_word = page[no_idx + 1] if no_idx + 1 < len(page) else None

    # six string rows, identified by their left-margin letters
    left = sorted(
        (w for w in band if w["x0"] < 42 and w["text"] in ("E", "B", "G", "D", "A")),
        key=lambda w: w["y0"],
    )[:6]
    if len(left) < 6:
        raise SystemExit(f"No.{num}: {len(left)} string labels")
    row_y = [w["y0"] for w in left]  # index 0..5 == string 1..6

    # bar-number labels: the three integers {3n-2, 3n-1, 3n} sitting just above
    # the top staff line give the exact measure x-edges.
    wanted = {str(3 * num - 2), str(3 * num - 1), str(3 * num)}
    bar_words = [
        w
        for w in band
        if w["text"] in wanted
        and row_y[0] - 15 < w["y0"] < row_y[0] - 1.2
    ]
    bar_words.sort(key=lambda w: w["x0"])
    if len(bar_words) >= 3:
        edges = [w["x0"] - 3 for w in bar_words[:3]]
    else:  # rare: fall back to even thirds of the note span
        edges = None

    exclude = set()
    if label_num_word is not None:
        exclude.add(id(label_num_word))
    for w in bar_words:
        exclude.add(id(w))

    # fret digits on the tab rows
    per_string = defaultdict(list)  # string_index -> [(x0, fret)]
    for w in band:
        if id(w) in exclude or not is_int_token(w["text"]) or w["x0"] < 44:
            continue
        for si, ry in enumerate(row_y):
            if abs(w["y0"] - ry) <= 2.6:
                per_string[si].append((w["x0"], int(w["text"])))
                break

    all_x = sorted(x for lst in per_string.values() for x, _ in lst)
    if not all_x:
        raise SystemExit(f"No.{num}: no tab digits")

    gaps = [b - a for a, b in zip(all_x, all_x[1:]) if b - a > 1.5]
    tol = max(3.0, 0.45 * statistics.median(gaps)) if gaps else 4.0
    centers = cluster_x(all_x, tol)

    if edges is None:
        span = centers[-1] - centers[0]
        edges = [centers[0] - 3, centers[0] + span / 3, centers[0] + 2 * span / 3]
    right = centers[-1] + max(tol, 6)
    edges = edges + [right + 100]

    raw_columns = [[] for _ in centers]
    for si, lst in per_string.items():
        for x0, fret in lst:
            raw_columns[nearest(x0, centers)].append({"string": si + 1, "fret": fret})

    # bucket raw columns into the three measures
    raw_by_measure = [[], [], []]
    for cx, notes in zip(centers, raw_columns):
        if not notes:
            continue
        m = 2 if cx >= edges[2] else 1 if cx >= edges[1] else 0
        raw_by_measure[m].append((cx, notes))

    # snap measures 1 & 2 to an even subdivision grid, folding voice-split
    # columns that land on the same slot into a single attack
    out_measures = []
    merged_cols = [[], [], []]  # per measure: [(center_x, [unique notes]), ...]
    for mi in range(3):
        cols = raw_by_measure[mi]
        chord = CHORD_BY_MEASURE[mi]
        if not cols:
            out_measures.append({"chord": chord, "columns": 0, "notes": []})
            continue
        cxs = [c for c, _ in cols]
        note_groups = [n for _, n in cols]

        if mi < 2:
            cxs, note_groups = merge_voice_splits(cxs, note_groups)
            n = len(cxs)
            step = BEATS_PER_MEASURE / n
            notes_out = []
            for i, (cx, notes) in enumerate(zip(cxs, note_groups)):
                start = round(i * step, 4)
                dur = round(step, 4)
                seen = set()
                uniq = []
                for note in sorted(notes, key=lambda x: x["string"]):
                    if note["string"] in seen:
                        continue
                    seen.add(note["string"])
                    uniq.append(note)
                    notes_out.append({**note, "start": start, "dur": dur})
                merged_cols[mi].append((cx, uniq))
            out_measures.append(
                {"chord": chord, "columns": n, "notes": notes_out}
            )
        else:
            # measure 3: a held resolution chord (plus any quick lead-in)
            step = BEATS_PER_MEASURE / len(cols)
            notes_out = []
            for i, notes in enumerate(note_groups):
                for note in sorted(notes, key=lambda x: x["string"]):
                    notes_out.append(
                        {**note, "start": round(i * step, 4), "dur": round(step, 4)}
                    )
            out_measures.append(
                {"chord": chord, "columns": len(cols), "notes": notes_out}
            )

    resolution = None
    if raw_by_measure[2]:
        resolution = {
            "chord": "C",
            "notes": sorted(raw_by_measure[2][-1][1], key=lambda x: x["string"]),
        }

    fingering = extract_fingering(band, row_y, edges, tol, merged_cols[0])

    n1 = out_measures[0]["columns"] or 1
    n2 = out_measures[1]["columns"] or 1
    flags = []
    if n1 not in SUBDIVISION:
        flags.append("rhythm-approx")
    if abs(n1 - n2) > 1:
        flags.append("measure-mismatch")
    return {
        "id": num,
        "name": f"No. {num}",
        "timeSignature": [4, 4],
        "notesPerBar": n1,
        "subdivision": SUBDIVISION.get(n1, f"{n1} per bar"),
        "rhythm": "even",
        "flags": flags,
        "fingering": fingering,
        "measures": out_measures,
        "resolution": resolution,
    }


def main():
    pages = json.load(open(WORDS))
    exercises = [
        extract_exercise(pages[i // 4], i % 4, i + 1) for i in range(120)
    ]
    data = {
        "title": "120 Arpeggio Exercises",
        "composer": "Mauro Giuliani",
        "opus": "Op. 1a",
        "note": "Public-domain studies. Tab edition by michaeljoyce@hotmail.com. "
        "Rhythms normalised to even subdivisions.",
        "tuning": "EADGBE",
        "exercises": exercises,
    }
    with open(OUT, "w") as fh:
        json.dump(data, fh, indent=1)

    dist = defaultdict(int)
    for e in exercises:
        dist[e["notesPerBar"]] += 1
    flagged = [e["id"] for e in exercises if e["flags"]]
    print(f"wrote {len(exercises)} exercises -> {os.path.relpath(OUT, HERE)}")
    print("notes-per-bar:", dict(sorted(dist.items())))
    print(f"clean: {120 - len(flagged)}/120   flagged: {flagged}")


if __name__ == "__main__":
    main()
