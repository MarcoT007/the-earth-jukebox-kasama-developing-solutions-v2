# KASAMA for Earth

*What does our planet sound like?* Our answer to the NASA Space Apps 2026 challenge "The Earth Information Jukebox", by team KASAMA Developing Solutions. (Earlier working name: The Earth Jukebox v2.)

NASA Space Apps Challenge 2026 · Challenge: [The Earth Information Jukebox](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/)

An interactive web jukebox that turns NASA Earth Information Center visualizations into music.
This repository continues the work of
[the-earth-jukebox-kasama-developing-solutions](https://github.com/MarcoT007/the-earth-jukebox-kasama-developing-solutions).

| | Folder | Live |
|---|---|---|
| **Working version** – clearer sound, picture follows the sound | `web/` | <https://marcot007.github.io/the-earth-jukebox-kasama-developing-solutions-v2/> |
| **Backup** – the page exactly as it was before the sound work | `web-v2-Backup/` | <https://marcot007.github.io/the-earth-jukebox-kasama-developing-solutions-v2/backup/> |

## How a picture becomes sound

Every frame lasts one bar of 8 steps. The music has three voices; each comes from one thing in the picture and
can be muted on its own from the "Playing" tab.

| Voice | Read from the picture | Rule |
|---|---|---|
| **Chord** | Colours | Most common hue = root note. Warm colours = major, cool colours = minor. |
| **Melody** | Light, on an 8 × 4 grid | Scanned left to right, one column per step. The brightest cell of the column sings: higher in the picture = higher register, brighter = higher note. Dark columns are rests. |
| **Sparkles** | Spots that stand out | They fall on the columns where one cell stands out most from the rest. Same picture, same rhythm: nothing is random. A kick marks each new picture. |

In the **Climate Time Machine** the grid holds the data itself (land temperature from NASA NEX-GDDP-CMIP6,
[SVS #5343](https://svs.gsfc.nasa.gov/5343/)) instead of brightness:

- the hottest land cell of each column sings, and its note climbs with how much that place has warmed since 1950;
- columns without land are silent, because the dataset does not cover the oceans;
- sparkles mark the columns that have warmed the most, and there are more of them as the land heats up;
- the global heat index raises the root note, turns the harmony minor and adds a dissonant note.

The heat index and the per-cell warming are computed by us from the colours of NASA's frames. They are consistent
with the data but they are not official figures in degrees.

## How the sound changes the picture

The picture never shows invented effects. Changing the sound changes *which real data is shown* or *which part of
it is highlighted*:

- **Energy** (height of the wave) selects the emissions scenario in the Time Machine, so the planet shows that scenario's map.
- **The note that is sounding** lights up its cell on the picture, and on the 3D planet when the map is wrapped on it.
- **Density** silences the darker columns, and they fade on the picture.
- **Muting a voice** removes its marks from the picture.

## Focus on a zone

In the three map-shaped records (Climate Time Machine, sea surface currents, lightning) the listener can limit
the music to one of 11 zones (North America, Mexico & Central America, South America, Europe, Africa, Middle East,
South Asia, East Asia, Southeast Asia, Australia & Pacific, Arctic), from the list or with "Focus on what I see".
The same 8 × 4 grid then divides the zone instead of the whole planet, the planet turns to face it and outlines
it, and the mixer keeps working on that zone only. Open with `?zone=europe` to start focused.

In the Time Machine the heat of a zone is how much it has warmed since 1950, on a scale where 100 is the largest
warming of any zone, year and scenario. Antarctica is not offered: the source maps paint it at the cold end of the
colour scale in every year, so its warming cannot be read from them. Zone data is built by `pipeline/build_time_machine.py`,
`pipeline/build_zones.py` and `pipeline/build_gibs_maps.py`.

## Voice control, spoken tutorial and kids missions

Hold the space bar, speak, and let go: the page can be played by voice alone (Chrome or Edge; orders in
English; say "help"). A short tap still plays and pauses. A spoken tutorial for blind and low-vision visitors
starts from the welcome screen, with the T key, or by saying "tutorial". Kids mode has twelve missions on a
card in the bottom right corner. See `CHANGELOG.md` for the list of orders and the known limits.

## Voiced stories and record names

The **Stories** tab tells four real events (Hurricane Otis 2023, the Pakistan floods of 2022, the Amazon drought
of 2023, and 2024 as the first year above 1.5 °C), each with one button for the language of the place and one for
English. A story switches to its record, turns the planet to the place and shows captions. The voices are
AI-generated (ElevenLabs); the words were written by the team from the sources linked on each card
(`web/src/stories.ts`).

Each record shows a plain name that matches the map on the globe, a label (Measured, Model + measurements,
Forecast model or Projection) and how to read its colours (`web/src/records.ts`). The title of the NASA SVS
visualization it comes from stays as the source link in About.

## A map for every record

Five of the SVS visualizations (forest height, Perpetual Ocean, atmospheric river, carbon dioxide and air quality)
are rendered camera shots, not world maps, so they cannot be wrapped on the globe. For those records the globe
shows, and the music reads, a world map of the same subject, laid over a dimmed Blue Marble. Four come from NASA
GIBS; carbon dioxide comes from the European Copernicus Atmosphere Monitoring Service (CAMS), whose map is more
recent and easier to read than the NASA layers available:

| Record | Layer on the globe | Frames |
|---|---|---|
| GEDI Forest Height | `GEDI_ISS_L3_Canopy_Height_Mean_RH100` | 5 maps as the mission added data, 2019–2023 |
| Perpetual Ocean 2 | `GHRSST_L4_MUR_Sea_Surface_Temperature` | every 15 days, Nov 2025 – Oct 2026 |
| Atmospheric River | `AMSRU2_Columnar_Water_Vapor_Day` + `_Night` | daily, 1–24 Jan 2025 |
| DYAMOND Carbon Dioxide | Copernicus CAMS `composition_co2_totalcolumn` (not NASA) | every 6 hours, the 6 days before the build |
| Air Quality Model Runs | `MERRA2_Total_Aerosol_Optical_Thickness_550nm_Extinction_Monthly` | monthly, Sep 2024 – Aug 2026 |

These maps are related NASA data, not the SVS visualization itself; the About section of each record links both.

## Narrator, themes and layout

- **Narrator** (button in the top bar, or the `V` key): reads aloud whatever the mouse or the keyboard focus lands
  on, in English. Fixed texts (controls, sections, zones, records, kids phrases, percentages and years) play as
  clips recorded once with an ElevenLabs voice (`web/public/narrator`, made by `pipeline/build_narrator.py`; the
  API key stays on the developer's machine). Texts that change, such as news headlines and the tempo, are read by
  the browser's built-in voice (Web Speech API), which is also the fallback if a clip is missing. It says the name of a control, its value and
  what it does, announces only the new value while a control moves, names the zone under the mouse on the planet,
  and lowers the music while it speaks. `R` repeats. In kids mode it uses the simpler texts.
  Browsers do not let a page speak before the first key press or click, so the first key a visitor presses
  triggers a spoken hint: "Press V to turn on the narrator". It is off by default so it does not talk over a
  screen reader such as VoiceOver or NVDA; the page keeps its labels for those too.
- **Light and dark theme**: button in the top bar, remembered on the device (`?theme=dark` to open in dark).
- **Compact, folding panels**: each side panel is as tall as its content and is split into sections of which only
  one is open at a time (Channels / Knobs / Wave in the mixer; Emissions / Zone / Picture → sound / About in
  Playing), so nothing scrolls inside a panel and nothing overlaps. Each panel also has a Hide button, and the
  planet re-centres and resizes to the free space. Checked in a real browser at 1190 × 680 and 1440 × 900.

## The mixer

The controls are laid out like a DJ mixer. Each voice has its own channel strip with a fader, a level meter,
Mute and Solo; the master strip has the volume and the echo.

| Control | What it does |
|---|---|
| Chord / Melody / Beat faders | Level of each voice. Solo one to hear a single rule on its own. |
| Mood (chord) | Pushes the chord to major or minor; in the centre the data decides. |
| Notes (melody) | How many columns of the picture are played. |
| Tempo (beat) | Speed of the scan and of the planet's spin. |
| Filter | DJ filter: left cuts the highs, right cuts the lows. Sound only. |
| Wave shape | Timbre of the melody. Sound only. |
| Energy crossfader | Intensity of the sound; in the Time Machine it slides from low to very high emissions. |

The rules live in `web/src/audio/mapping.ts`; the engine is `web/src/audio/engine.ts`.

## Run it

```bash
cd web
npm install
npm run dev
```

Data pipeline (Python 3, ffmpeg): `pip install -r pipeline/requirements.txt`, then
`python pipeline/build_dataset.py`, `python pipeline/build_zones.py`, `python pipeline/build_gibs_maps.py` and
`python pipeline/build_time_machine.py`.

## Credits

Imagery and data: NASA Scientific Visualization Studio, NEX-GDDP-CMIP6 and GIBS. Carbon dioxide map: generated
using Copernicus Atmosphere Monitoring Service information, drawn by ECMWF. News headlines: NASA Earth
Observatory and Google News RSS. Independent Space Apps project, not endorsed by NASA.
