# Radio music

The in-app radio: four fictional stations, 14 instrumental tracks and one cover per
fictional artist. `stations.json` lists them; the player reads it.

| Station | Default hours (scene clock) | Sound |
|---|---|---|
| Glasshouse 94.1 | 05:00–11:00 | Soft keys, pads and piano |
| Sol Café 101.7 | 11:00–17:00 | Sunny, plucky and jazzy |
| Velvet 97.9 | 17:00–22:00 | Instrumental R&B |
| Afterglow 88.5 | 22:00–05:00 | Synth-pop and synthwave |

All artists, titles and stations are fictional.

## Licence

**The audio and cover images in this folder are not covered by this repository's code
licence and are not offered for reuse.**

- Tracks marked `"source": "elevenlabs"` in `stations.json` were generated with
  ElevenLabs Music on a paid plan for use as Sim Atlanta's soundtrack. ElevenLabs' Music
  Terms do not allow them to be redistributed as a music library, so don't copy them into
  other projects.
- `lumen-commuter--something-small-demo.mp3` (`"source": "coded"`) was synthesized by our
  own script and may be reused under the repository licence.
- Covers were generated with an image model for this project; the masters, prompts and
  alternates are in `docs/radio/covers/`.

Loudness is normalised to −18 LUFS (true peak −1.5 dB), 128 kbps MP3. Prompts for each
track are in `docs/radio/README.md`.
