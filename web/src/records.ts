/**
 * What each record really shows on the globe, in plain words: a name that matches the map, how the data
 * was obtained, and how to read the colours. Checked against the publishers' own metadata and legends
 * (NASA SVS, NASA GIBS, Copernicus/ECMWF) on 15 November 2026. `title` in the catalog stays the name of
 * the NASA SVS visualization the record comes from; this is what the listener sees first.
 */
export type RecordKind = "measured" | "model" | "projection";

export interface RecordInfo {
  name: string;
  kind: RecordKind;
  kindLabel: string;
  basis: string; // where the data comes from and how far to trust it
  read: string; // how to read the colours
}

export const KIND_HELP: Record<RecordKind, string> = {
  measured: "Measured: values observed by instruments in orbit.",
  model: "Model: computed by a model that is fed or corrected with real observations.",
  projection: "Projection: what climate models give for a chosen emissions scenario. Not a forecast.",
};

export const RECORD_INFO: Record<string, RecordInfo> = {
  "time-machine": {
    name: "Climate Time Machine",
    kind: "projection",
    kindLabel: "Projection",
    basis: "NASA NEX-GDDP-CMIP6: the climate models of the IPCC Sixth Assessment Report. Up to 2014 the models re-create the past; after that they follow the emissions scenario you choose. A scenario, not a forecast.",
    read: "Hottest month of each year over land. Darker red means hotter.",
  },
  "ocean-currents": {
    name: "Ocean currents",
    kind: "model",
    kindLabel: "Model + measurements",
    basis: "ECCO2, an ocean model by MIT and NASA JPL that blends satellite and in-water measurements. Visualized by NASA SVS.",
    read: "The lines are currents at the sea surface. Their colour is the temperature of the water.",
  },
  lightning: {
    name: "Lightning from space",
    kind: "measured",
    kindLabel: "Measured",
    basis: "Lightning detected by the LIS sensor on the International Space Station, January 2017 to July 2023 (quality-controlled data).",
    read: "Each flash is detected lightning, added up over 10 days. The Station does not fly over the poles, so they stay dark.",
  },
  "forest-height": {
    name: "Forest height",
    kind: "measured",
    kindLabel: "Measured",
    basis: "Mean height of the forest canopy, measured by the GEDI laser on the International Space Station, April 2019 to March 2023.",
    read: "Pale green: short trees, about 5 m. Dark green: tall forest, over 45 m. Land only.",
  },
  "ocean-temperature": {
    name: "Sea surface temperature",
    kind: "measured",
    kindLabel: "Measured",
    basis: "NASA JPL MUR analysis (GHRSST): temperature of the sea surface, merged from several satellites into one daily map.",
    read: "Purple and blue: cold, below 16 °C. Green and yellow: about 20 °C. Red: 28 °C and warmer.",
  },
  "atmospheric-river": {
    name: "Water vapour in the air",
    kind: "measured",
    kindLabel: "Measured",
    basis: "Water vapour in the whole column of air over the oceans, measured by the AMSR2 instrument on the GCOM-W1 satellite.",
    read: "Blue: dry air. Green, yellow and red: more water, up to 75 mm. Dark diamonds: strips the satellite did not pass over that day.",
  },
  "carbon-dioxide": {
    name: "Carbon dioxide (CO₂)",
    kind: "model",
    kindLabel: "Forecast model",
    basis: "Average CO₂ in the column of air, from the global forecast of the Copernicus Atmosphere Monitoring Service (European Union). A model fed with observations, not a direct measurement.",
    read: "Scale from 405 to 430 parts per million. Yellow and orange: less CO₂. Dark red: more.",
  },
  "air-quality": {
    name: "Smoke, dust and haze",
    kind: "model",
    kindLabel: "Model + measurements",
    basis: "Particles in the air (aerosol optical thickness) from NASA's MERRA-2 reanalysis: a model corrected with observations, one map a month.",
    read: "Pale yellow: clear air. Orange to brown: thicker smoke, dust or haze.",
  },
};

export const recordName = (v: { slug: string; title: string }) => RECORD_INFO[v.slug]?.name ?? v.title;
