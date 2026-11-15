# Changelog

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
