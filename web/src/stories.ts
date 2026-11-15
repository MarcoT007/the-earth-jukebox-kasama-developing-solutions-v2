/**
 * Voiced stories: real events told over the record and the zone they belong to.
 * Each part is one language, with its own button: the language of the place, and English. The clips are recorded
 * once with ElevenLabs (AI voices) and shipped in web/public/stories; the text here is what they say,
 * shown as captions, one sentence per entry.
 */
export interface StoryPart {
  lang: string; // BCP 47, for screen readers and captions
  label: string;
  cta: string; // what the button says to a screen reader, in the part's own language
  voice: string;
  audio: string;
  sentences: string[];
}

export interface Story {
  id: string;
  title: string;
  place: string;
  when: string;
  blurb: string;
  record: string; // slug of the record that plays under the story: the one its closing line names
  recordLabel: string;
  zone: string | null; // id of the zone the planet turns to, or null for the whole planet
  parts: StoryPart[];
  sources: { label: string; url: string }[];
}

export const STORIES: Story[] = [
  {
    id: "otis",
    title: "The night Otis grew",
    place: "Acapulco, Mexico",
    when: "24 October 2023",
    blurb:
      "In less than a day, a tropical storm over unusually warm water became a category 5 hurricane. No forecast model saw it coming.",
    record: "ocean-temperature",
    recordLabel: "Sea surface temperature",
    zone: "central-america",
    parts: [
      {
        lang: "es-MX",
        label: "Español",
        cta: "Escuchar en español",
        voice: "Lily",
        audio: "stories/otis-es.mp3",
        sentences: [
          "Acapulco. Veinticuatro de octubre... una de la mañana.",
          "Frente a la costa hay una tormenta tropical. Nada fuera de lo común.",
          "Pero el mar... el mar está más caliente de lo normal.",
          "Y la tormenta se alimenta. Crece. ¡Crece!",
          "A las diez de la noche ya no es una tormenta: es Otis — un huracán de categoría cinco.",
          "Ningún modelo lo vio venir.",
          "Toda una ciudad... y solo unas horas.",
          "Al amanecer, Acapulco ya no era el mismo. Al menos cincuenta y dos personas murieron.",
          "Escucha ese mar. Así suena un océano que se calienta.",
        ],
      },
      {
        lang: "en-US",
        label: "English",
        cta: "Hear it in English",
        voice: "Sarah",
        audio: "stories/otis-en.mp3",
        sentences: [
          "Acapulco. October twenty-fourth... one in the morning.",
          "Off the coast, a tropical storm. Nothing unusual.",
          "But the sea... the sea is warmer than it should be.",
          "And the storm feeds. It grows. It grows!",
          "By ten that night it is no longer a storm: it is Otis — a category five hurricane.",
          "No forecast model saw it coming.",
          "A whole city... and only hours.",
          "By dawn, Acapulco was not the same. At least fifty-two people died.",
          "Listen to that sea. This is the sound of an ocean that is warming.",
        ],
      },
    ],
    sources: [
      {
        label: "U.S. National Hurricane Center report on Otis",
        url: "https://www.nhc.noaa.gov/data/tcr/EP182023_Otis.pdf",
      },
    ],
  },
  {
    id: "pakistan",
    title: "A third of a country under water",
    place: "Pakistan",
    when: "August 2022",
    blurb:
      "The monsoon did not stop. By late August the government said a third of the country was under water, with 33 million people affected.",
    record: "atmospheric-river",
    recordLabel: "Water vapour",
    zone: "south-asia",
    sources: [
      {
        label: "NASA Earth Observatory: Devastating floods in Pakistan",
        url: "https://science.nasa.gov/earth/earth-observatory/devastating-floods-in-pakistan-150279",
      },
      {
        label: "Britannica: Pakistan floods of 2022",
        url: "https://www.britannica.com/event/Pakistan-floods-of-2022",
      },
    ],
    parts: [
      {
        lang: "ur",
        label: "اردو",
        cta: "اردو میں سنیے",
        voice: "Lily",
        audio: "stories/pakistan-ur.mp3",
        sentences: [
          "پاکستان۔ اگست، دو ہزار بائیس۔",
          "مون سون جون میں آیا... اور رکا نہیں۔",
          "دریا چڑھ رہے ہیں۔ دریائے سندھ اپنے کناروں سے باہر نکل آیا ہے۔",
          "گاؤں غائب ہو رہے ہیں۔ سڑکیں۔ پل۔ کھیت۔",
          "خلا سے دیکھیں تو جہاں زمین تھی، وہاں اب ایک جھیل ہے۔",
          "وزیر صاف کہتی ہیں: ملک کا ایک تہائی حصہ... پانی میں ہے۔",
          "تین کروڑ تیس لاکھ لوگ اس سیلاب کی زد میں آئے۔",
          "سترہ سو سے زیادہ لوگ زندہ نہ بچے۔",
          "اس آسمان کو سنیے۔ آسمان میں سفر کرتے پانی کی آواز ایسی ہوتی ہے۔",
        ],
      },
      {
        lang: "en-US",
        label: "English",
        cta: "Hear it in English",
        voice: "Sarah",
        audio: "stories/pakistan-en.mp3",
        sentences: [
          "Pakistan. August, twenty twenty-two.",
          "The monsoon came in June... and it did not stop.",
          "The rivers are rising. The Indus has spilled over its banks.",
          "Villages vanish. Roads. Bridges. Fields.",
          "From space, where there was land, there is now a lake.",
          "The minister says it plainly: one third of the country... is under water.",
          "Thirty-three million people are caught in the flood.",
          "More than one thousand seven hundred did not survive.",
          "Listen to that sky. This is how water travelling through the air sounds.",
        ],
      },
    ],
  },
  {
    id: "amazon",
    title: "The thirsty rainforest",
    place: "The Amazon, Brazil",
    when: "October 2023",
    blurb:
      "The rain did not come. At Manaus the Rio Negro fell to its lowest level since records began in 1902, and in Lake Tefé the water reached 39 °C.",
    record: "forest-height",
    recordLabel: "Forest height",
    zone: "south-america",
    sources: [
      {
        label: "AFP: dolphins killed as Amazon drought hits lake",
        url: "https://phys.org/news/2023-10-dolphins-amazon-drought-lake.html",
      },
    ],
    parts: [
      {
        lang: "pt-BR",
        label: "Português",
        cta: "Ouvir em português",
        voice: "Lily",
        audio: "stories/amazon-pt.mp3",
        sentences: [
          "Amazônia. Outubro de dois mil e vinte e três.",
          "A maior floresta tropical do mundo... está com sede.",
          "A chuva não vem. Os rios encolhem. Dia após dia.",
          "Em Manaus, o rio Negro cai ao nível mais baixo em mais de cem anos de medições.",
          "Onde havia água, agora há areia.",
          "Barcos encalhados. Comunidades inteiras... isoladas.",
          "No lago Tefé, a água chega a trinta e nove graus. Mais de cento e cinquenta botos morrem.",
          "Escute a floresta. Este é o som do que ainda está de pé.",
        ],
      },
      {
        lang: "en-US",
        label: "English",
        cta: "Hear it in English",
        voice: "Sarah",
        audio: "stories/amazon-en.mp3",
        sentences: [
          "The Amazon. October, twenty twenty-three.",
          "The largest rainforest on Earth... is thirsty.",
          "The rain does not come. The rivers shrink. Day after day.",
          "At Manaus, the Rio Negro falls to its lowest level in more than a century of records.",
          "Where there was water, there is now sand.",
          "Boats stranded. Whole communities... cut off.",
          "In Lake Tefé, the water reaches thirty-nine degrees Celsius. More than one hundred and fifty river dolphins die.",
          "Listen to the forest. This is the sound of what is still standing.",
        ],
      },
    ],
  },
  {
    id: "one-point-five",
    title: "The year we crossed 1.5",
    place: "Planet Earth",
    when: "2024",
    blurb:
      "2024 was the warmest year on record, about 1.55 °C above pre-industrial levels: likely the first calendar year above the 1.5 °C line of the Paris Agreement.",
    record: "carbon-dioxide",
    recordLabel: "Carbon dioxide",
    zone: null,
    sources: [
      {
        label: "World Meteorological Organization: 2024 warmest year on record",
        url: "https://wmo.int/news/media-centre/wmo-confirms-2024-warmest-year-record-about-155degc-above-pre-industrial-level",
      },
    ],
    parts: [
      {
        lang: "es-MX",
        label: "Español",
        cta: "Escuchar en español",
        voice: "Lily",
        audio: "stories/one-point-five-es.mp3",
        sentences: [
          "Planeta Tierra. Dos mil veinticuatro.",
          "Durante años hubo un número al que nadie quería llegar. Uno punto cinco grados.",
          "La línea que se trazó en París.",
          "Mes tras mes, caen los récords. En julio, el día más caluroso jamás medido.",
          "Y cuando el año termina... el número está ahí.",
          "Uno punto cincuenta y cinco grados por encima de la era preindustrial. El año más caliente jamás registrado.",
          "Es un solo año; todavía no es el límite de largo plazo. Pero nunca habíamos estado tan cerca.",
          "Escucha este aire. Así suena el dióxido de carbono que pusimos en él.",
        ],
      },
      {
        lang: "en-US",
        label: "English",
        cta: "Hear it in English",
        voice: "Sarah",
        audio: "stories/one-point-five-en.mp3",
        sentences: [
          "Planet Earth. Twenty twenty-four.",
          "For years there was one number nobody wanted to reach. One point five degrees.",
          "The line drawn in Paris.",
          "Month after month, the records fall. In July, the hottest day ever measured.",
          "And when the year ends... the number is there.",
          "One point five five degrees above the pre-industrial era. The warmest year ever recorded.",
          "It is one year; not yet the long-term limit. But we have never been this close.",
          "Listen to this air. This is the sound of the carbon dioxide we put in it.",
        ],
      },
    ],
  },
];
