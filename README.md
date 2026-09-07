# taggatu

A focused practice app for classical / fingerstyle guitar. Runs entirely in the
browser — no account, no backend, no data leaves your machine.

## Quick start

You need **Node.js 20.19+** (get it from [nodejs.org](https://nodejs.org) or
`nvm install --lts`). Then, from the project folder:

```bash
npm install && npm start
```

That builds the app and serves it. Open the URL it prints
(**http://localhost:4173** locally, plus a `Network:` URL you can open from your
phone or another computer on the same Wi-Fi). Stop it with `Ctrl+C`.

First launch fetches ~2 MB of guitar samples; after that it works offline.

### No Node? Use Docker instead

```bash
docker build -t taggatu . && docker run --rm -p 4173:4173 taggatu
```

Then open http://localhost:4173.

## The five trainers

| Trainer | What it does | State |
| --- | --- | --- |
| **Arpeggio Trainer** | All 120 of Giuliani's right-hand studies (Op. 1a) on a scrolling fretboard — pick one, set a tempo, loop it, or let the speed trainer ratchet it up | polished |
| **Fretboard Trainer** | "Find the note" / "name the note" drills on the neck | functional |
| **Ear Training** | Identify intervals and chord qualities by ear | functional |
| **Rhythm Trainer** | Tap a one-bar pattern in time, scored on your timing error | functional |
| **Pitch & Tuner** | Live mic pitch detection: chromatic tuner + "play the target note" | functional |

Settings and per-exercise progress are saved in the browser (localStorage).

## Working on the code

```bash
npm run dev        # dev server with hot reload (http://localhost:5173)
npm test           # vitest
npm run build      # type-check + production build -> dist/
npm run lint       # oxlint
npm start          # build + serve the production bundle (http://localhost:4173)
```

Stack: React 19 · Vite 7 · TypeScript · Tailwind v4 · Tone.js · Zustand ·
Vitest. Builds to a plain static site — `dist/` can go on any static host.

### Regenerating the arpeggio data

`src/data/giuliani.json` and `public/exercises/*.png` are generated from the
tab-edited public-domain PDF in `reference/`. You only need this if you change
the extractor.

```bash
pip install pymupdf pillow
npm run data:extract      # PDF -> src/data/giuliani.json
npm run data:images       # PDF -> public/exercises/ex-NNN.png (score + tab crops)
```

Every study is the same two bars — a C-major arpeggio, then the same right-hand
pattern over G7 — plus a held resolution chord; only the picking pattern changes
across the 120. Rhythms are normalised to even subdivisions (these études are
written that way). ~15 dense two-voice studies whose note count doesn't land on
a clean subdivision are tagged `rhythm-approx` and marked `≈` in the UI — they
still loop and train correctly, the spacing is just even.

## Project layout

```
src/
  core/            shared, framework-agnostic guitar logic
    music/         notes, tuning, intervals, chords
    audio/         Tone.js engine wrapper (nylon-guitar sampler + metronome)
    fretboard/     <Fretboard> SVG diagram
    pitch/         autocorrelation detector + usePitchDetect hook
  routes/          one folder/file per trainer
  components/      layout, settings, UI primitives
  store/           settings + progress (localStorage)
  data/            giuliani.json + typed loader
public/
  samples/         nylon-guitar audio
  exercises/       per-study score + tab images
scripts/           PDF -> data/image extraction (Python)
```

## Credits

- Arpeggio material: Mauro Giuliani, *120 Right-Hand Studies*, Op. 1a — public
  domain. Tab edition by Michael Joyce.
- Guitar samples: [tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments)
  (MIT).
