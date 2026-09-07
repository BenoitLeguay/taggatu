# taggatu

A focused practice app for classical / fingerstyle guitar. Five trainers on one
shell:

| Trainer | What it does | State |
| --- | --- | --- |
| **Arpeggio Trainer** | All 120 of Giuliani's right-hand studies (Op. 1a) on a scrolling fretboard, any tempo, loop + speed trainer | polished |
| **Fretboard Trainer** | "Find the note" / "name the note" drills on the neck | functional |
| **Ear Training** | Identify intervals and chord qualities by ear | functional |
| **Rhythm Trainer** | Tap a one-bar pattern in time, scored on timing error | functional |
| **Pitch & Tuner** | Live mic pitch detection: chromatic tuner + "play the target note" | functional |

## Stack

React 19 · Vite 7 · TypeScript · Tailwind v4 · Tone.js (audio + transport) ·
Zustand (persisted settings & progress) · Vitest. No backend — builds to a
static site.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run build      # tsc + vite build -> dist/
npm run lint       # oxlint
```

Node is managed with nvm; any current LTS works.

## The arpeggio data

`src/data/giuliani.json` is generated from the tab-edited public-domain PDF in
`reference/`. Every study is the same two bars — a C-major arpeggio then the
same right-hand pattern over G7 — followed by a held resolution chord; only the
picking pattern changes across the 120.

```bash
python3 scripts/pdf_dump.py --render       # PDF -> scripts/raw/{words.json,pageNN.png}
python3 scripts/extract_arpeggios.py       # -> src/data/giuliani.json
```

Rhythms are normalised to even subdivisions (these études are written that way
by design). ~15 dense two-voice studies where the note count doesn't land on a
clean subdivision are tagged `rhythm-approx` and marked with `≈` in the UI —
they still loop and train the pattern correctly, the spacing is just even.
Requires `pip install pymupdf`.

## Layout

```
src/
  core/            shared, framework-agnostic guitar logic
    music/         notes, tuning, intervals, chords
    audio/         Tone.js engine wrapper + metronome
    fretboard/     <Fretboard> SVG diagram
    pitch/         autocorrelation detector + usePitchDetect hook
  routes/          one folder/file per trainer
  components/      layout, settings, UI primitives
  store/           settings + progress (localStorage)
  data/            giuliani.json + typed loader
```

## Credit

Arpeggio material: Mauro Giuliani, *120 Right-Hand Studies*, Op. 1a (public
domain). Tab edition by michaeljoyce@hotmail.com.
