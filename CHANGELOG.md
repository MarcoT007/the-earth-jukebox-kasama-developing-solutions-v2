# Changelog

## 2026-11-15 — Voiced stories, and record names that match the globe

**Voiced stories (new "Stories" tab).** Four real events, each told over the record and the zone it belongs to.
Every story has one button per language (the language of the place, and English); a button plays only its own
clip. Pressing it switches to the story's record, turns the planet to the place, lowers the music and shows the
sentence being spoken as a caption over the planet (right-to-left for Urdu).

| Story | Languages | Record it plays over | Zone | Source |
|---|---|---|---|---|
| Hurricane Otis, Acapulco, 2023 | Spanish, English | Sea surface temperature | Mexico, Central America & Caribbean | U.S. National Hurricane Center report |
| Pakistan floods, 2022 | Urdu, English | Water vapour in the air | South Asia | NASA Earth Observatory, Britannica |
| Amazon drought, 2023 | Portuguese, English | Forest height | South America | AFP |
| 2024, the year above 1.5 °C | Spanish, English | Carbon dioxide (CO₂) | Whole planet | World Meteorological Organization |

The voices are AI-generated with ElevenLabs (model `eleven_v3`: "Lily" for the local language, "Sarah" for
English); the words were written by the team from the sources. The clips are static files in
`web/public/stories`. Only one story card is open at a time, so the panel does not scroll.

**Record names.** Each record now shows a name that matches the map on the globe, a label saying what kind of
data it is, and a line on how to read the colours. They were checked against the publishers' metadata and
colour legends (NASA SVS API, NASA GIBS layer metadata and legends, the Copernicus/ECMWF map catalogue).

| SVS title (kept as the source link) | Name shown | Label |
|---|---|---|
| Climate Time Machine: 1950 – 2100 | Climate Time Machine | Projection |
| Global Sea Surface Currents and Temperature | Ocean currents | Model + measurements |
| Lightning Events Detected from the ISS 2017-2023 | Lightning from space | Measured |
| GEDI Forest Height | Forest height | Measured |
| Perpetual Ocean 2: Western Boundary Currents | Sea surface temperature | Measured |
| A 3D View of an Atmospheric River from an Earth System Model | Water vapour in the air | Measured |
| DYAMOND Global Carbon Dioxide | Carbon dioxide (CO₂) | Forecast model |
| Air Quality Model Runs | Smoke, dust and haze | Model + measurements |

**Files.**
- `web/src/stories.ts`, `web/src/components/Stories.tsx`, `web/public/stories/*.mp3` (new): the stories, the tab
  and the captions. `web/src/App.tsx`: story playback and the new tab.
- `web/src/records.ts` (new): name, data label, origin and colour guide per record. Used by
  `web/src/components/Dock.tsx` and `NowPlaying.tsx` (the About section now shows origin and "How to read it").
- `web/src/kids.ts`: the kids' texts for sea surface temperature and water vapour now describe the map shown.
- `pipeline/narrator_phrases.json`, `web/public/narrator/`: 30 narrator clips for the new texts.

**Known limits.**
- Nobody on the team can check the Urdu or Portuguese text and pronunciation.
- Captions are timed by sentence length, not by the audio, so they can run slightly early or late.
- If the narrator is on, it can talk over a story.
- Pakistan: the death toll (more than 1,700) comes from Britannica, and "a lake where there was land" is stronger
  wording than NASA's "plains into seas". The water-vapour map is from January 2025, not from the 2022 floods.
- No official colour legend was found for "Ocean currents" or the Time Machine; for CO₂ the 405–430 ppm range is
  from the Copernicus catalogue and the colour order is inferred from the palette name (Spectral, reversed).
- Still open from the previous entry: whether this use of the Copernicus/ECMWF public map server is permitted.

**Backup.** State before this change: tags `backup/2026-11-15-maps-published` and
`backup/2026-11-15-before-stories` (commit `9c53f83`), and `~/kasama-backups/earth-jukebox-v2-2026-11-15-9c53f83.bundle`.

## 2026-11-15 — A map for every record

**Problem.** The last five records (forest height, Perpetual Ocean, atmospheric river, carbon dioxide, air
quality) all showed the same planet. Their NASA SVS visualizations are rendered camera shots, not world maps, so
the app could not wrap them on the globe and fell back to the same Blue Marble texture for all five. The
atmospheric-river frames were also just a date card, so that record had almost nothing to play.

**Change.** Each of those records now has its own world map on the globe, laid over a dimmed Blue Marble. The
music, the lit cell on the planet and the zone focus now work on them like on the other map records.

| Record | Map on the globe | Source |
|---|---|---|
| GEDI Forest Height | Mean canopy height, 5 maps, 2019–2023 | NASA GIBS |
| Perpetual Ocean 2 | Sea surface temperature, every 15 days, Nov 2025 – Oct 2026 | NASA GIBS |
| Atmospheric River | Water vapour over the oceans, daily, 1–24 Jan 2025 | NASA GIBS |
| DYAMOND Carbon Dioxide | CO₂ in the whole column of air, every 6 hours, 10–16 Nov 2026 | Copernicus CAMS (European Union, drawn by ECMWF) |
| Air Quality Model Runs | Aerosol optical thickness, monthly, Sep 2024 – Aug 2026 | NASA GIBS |

**Files.**
- `pipeline/build_gibs_maps.py` (new): downloads the maps, builds the frames and their sound features, and
  rewrites those five records in `catalog.json`. Run it after `build_dataset.py`.
- `web/public/data/<record>/map_*.jpg` (new): the map frames. The SVS frames (`frame_*.jpg`) stay on disk.
- `web/src/types.ts`, `web/src/components/NowPlaying.tsx`: the About section links the map source next to the
  SVS source.
- `web/src/App.tsx`, `README.md`: credits for Copernicus; README section "A map for every record".

**Known limits.**
- The maps are related data, not the SVS visualization itself. Record titles are still the SVS titles, and the
  kids story of Perpetual Ocean still talks about currents while the map shows temperature.
- The carbon dioxide map is not NASA data. The ECMWF map server answers with a public key, but its service
  description says "Registered users only"; this use has not been confirmed with ECMWF.
- The CAMS server only keeps the last few days, so rebuilding that record shows the most recent week.
- The atmospheric-river map has diamond-shaped gaps where the satellite did not pass that day.
- The sound of these five records changed, because it is now read from the map.

**Roll back.** The state before this change is tagged `backup/2026-11-15-before-maps`.
