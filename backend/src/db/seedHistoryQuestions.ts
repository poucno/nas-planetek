import type { HistoryQuestion } from "./schema.js";

const verdun = {
  title: "Mémorial de Verdun — bitka pri Verdunu",
  url: "https://memorial-verdun.fr/en/ressources/la-bataille-de-verdun",
};
const somme = {
  title: "National Army Museum — bitka na Sommi",
  url: "https://www.nam.ac.uk/explore/battle-somme",
};
const omaha = {
  title: "U.S. Army Center of Military History — izkrcanje na plaži Omaha",
  url: "https://history.army.mil/portals/143/Images/Publications/catalog/100-14.pdf",
};
const arnhem = {
  title: "National Army Museum — operacija Market Garden",
  url: "https://www.nam.ac.uk/explore/market-garden",
};
const bastogne = {
  title: "U.S. Army Center of History & Heritage — bitka za Bastogne",
  url: "https://achh.army.mil/history/book-wwii-bulge-garandchap-files-garandchap/",
};

const entities = {
  britishEmpire: "Britanski imperij",
  france: "Francija",
  germanEmpire: "Nemško cesarstvo",
  austriaHungary: "Avstro-Ogrska",
  belgium: "Belgija",
  italy: "Italija",
  russianEmpire: "Rusko cesarstvo",
  ottomanEmpire: "Osmansko cesarstvo",
  usa: "Združene države Amerike",
  naziGermany: "Nacistična Nemčija",
  uk: "Združeno kraljestvo",
  canada: "Kanada",
  ussr: "Sovjetska zveza",
  japan: "Japonska",
};

type EntityId = keyof typeof entities;

const participants = (options: EntityId[], correctOptionIds: EntityId[]): HistoryQuestion["data"] => ({
  kind: "participants",
  options: options.map((id) => ({ id, label: entities[id] })),
  correctOptionIds,
});

const degrees = (whole: number, minutes: number, seconds: number) => whole + minutes / 60 + seconds / 3600;

export const seedHistoryQuestions: HistoryQuestion[] = [
  {
    id: 1,
    era: "ww1",
    period: "Februar 1916",
    prompt: "Kje je utrdba Douaumont, ki so jo nemške enote zavzele na začetku bitke pri Verdunu?",
    hint: "Poišči območje reke Meuse na severovzhodu Francije.",
    answerLabel: "Utrdba Douaumont, severovzhodno od Verduna",
    explanation: "Douaumont je bil del obrambnega obroča okoli Verduna. Zgodnja izguba utrdbe je Nemcem dala oporišče v obrambnem pasu, Francozi pa so jo oktobra ponovno zavzeli.",
    sources: [
      { title: "Mémorial de Verdun — utrdba Douaumont", url: "https://memorial-verdun.fr/en/memorial-et-forts/visiter-le-fort-de-douaumont" },
      { title: "UNESCO — lokacija utrdbe (ME06)", url: "https://whc.unesco.org/document/198556" },
    ],
    data: {
      kind: "location",
      coordinates: { lat: degrees(49, 13, 1), lng: degrees(5, 26, 19) },
      fullRadiusKm: 10,
      outerRadiusKm: 65,
      reference: "Točka ME06 označuje utrdbo. Notranji polmer zajame ožjo okolico Verduna, zunanji pa izloči oddaljene dele fronte.",
    },
  },
  {
    id: 2,
    era: "ww1",
    period: "Julij–november 1916",
    prompt: "Kje je greben pri Thiepvalu, eno izmed prizorišč bitke na Sommi?",
    hint: "Poišči območje severno od reke Somme v severni Franciji.",
    answerLabel: "Thiepval, severno od mesta Albert",
    explanation: "Thiepval je ležal na vzpetini v nemškem obrambnem pasu. Zavzetje grebena je bilo eden izmed ciljev britanskih sil; današnji spomenik stoji ob nekdanjem bojišču.",
    sources: [
      somme,
      { title: "UNESCO — lokacija spomenika pri Thiepvalu (SE03)", url: "https://whc.unesco.org/document/198547" },
    ],
    data: {
      kind: "location",
      coordinates: { lat: degrees(50, 3, 1), lng: degrees(2, 41, 8) },
      fullRadiusKm: 12,
      outerRadiusKm: 75,
      reference: "Točka SE03 je spomenik ob bojišču. Notranji polmer zajame okolico grebena, zunanji pa omeji delne točke na širšo okolico Somme.",
    },
  },
  {
    id: 3,
    era: "ww1",
    period: "Julij–november 1917",
    prompt: "Označi območje mesta Ypres, okoli katerega je potekala bitka pri Passchendaelu.",
    hint: "Mesto leži v zahodnem delu Belgije blizu meje s Francijo.",
    answerLabel: "Ypres (Ieper), Zahodna Flandrija",
    explanation: "Zavezniki so hoteli zavzeti vzpetine okoli mesta, tudi greben pri Passchendaelu. Obstreljevanje in dež sta tla spremenila v blato, ki je oviralo premike in oskrbo.",
    sources: [
      { title: "National Army Museum — bitka pri Passchendaelu", url: "https://www.nam.ac.uk/explore/battle-passchendaele" },
      { title: "UNESCO — lokacija Meninskih vrat v mestu Ypres (1567-033)", url: "https://whc.unesco.org/document/167876" },
    ],
    data: {
      kind: "location",
      coordinates: { lat: degrees(50, 51, 7), lng: degrees(2, 53, 28) },
      fullRadiusKm: 12,
      outerRadiusKm: 60,
      reference: "Meninska vrata so mestna referenčna točka. Notranji polmer zajame tudi bližnje bojišče pri Passchendaelu, zunanji loči širšo regijo.",
    },
  },
  {
    id: 4,
    era: "ww1",
    period: "Februar–december 1916",
    prompt: "Katere politične entitete so neposredno vodile napad in obrambo v bitki pri Verdunu?",
    hint: "Obramba Verduna je na zahodni fronti vezala velik del vojske ene od držav antante.",
    answerLabel: "Francija in Nemško cesarstvo",
    explanation: "Nemško cesarstvo je napadlo francoski obrambni pas pri Verdunu. Dolgotrajni boji in velike izgube na obeh straneh so iz bitke naredili primer izčrpavanja na zahodni fronti.",
    sources: [verdun],
    data: participants(["austriaHungary", "france", "germanEmpire", "britishEmpire"], ["france", "germanEmpire"]),
  },
  {
    id: 5,
    era: "ww1",
    period: "1. julij 1916",
    prompt: "Katere politične entitete so se spopadle v uvodnem kopenskem napadu na Sommi?",
    hint: "Ofenziva se je začela na odseku, kjer sta se stikali dve zavezniški vojski.",
    answerLabel: "Britanski imperij, Francija in Nemško cesarstvo",
    explanation: "Britanske in francoske enote so prvi dan napadle položaje Nemškega cesarstva. Usklajena ofenziva je med drugim razbremenila francoske sile pri Verdunu.",
    sources: [somme],
    data: participants(
      ["germanEmpire", "belgium", "britishEmpire", "russianEmpire", "france", "austriaHungary"],
      ["britishEmpire", "france", "germanEmpire"],
    ),
  },
  {
    id: 6,
    era: "ww1",
    period: "April 1915–januar 1916",
    prompt: "Katere navedene politične entitete so prispevale glavnino kopenskih sil na polotoku Galipoli?",
    hint: "Zavezniki so želeli odpreti pomorsko pot skozi Dardanele.",
    answerLabel: "Britanski imperij, Francija in Osmansko cesarstvo",
    explanation: "Z britanskimi in francoskimi silami so se borile tudi avstralske in novozelandske enote v sestavu imperijskih sil. Osmanski branilci so zadržali polotok, zavezniki pa so ga po neuspešni kampanji zapustili.",
    sources: [{ title: "National Army Museum — kampanja na Galipoliju", url: "https://www.nam.ac.uk/explore/gallipoli" }],
    data: participants(
      ["france", "italy", "ottomanEmpire", "russianEmpire", "belgium", "britishEmpire"],
      ["britishEmpire", "france", "ottomanEmpire"],
    ),
  },
  {
    id: 7,
    era: "ww2",
    period: "6. junij 1944",
    prompt: "Kje je bila plaža Omaha, eden od sektorjev zavezniškega izkrcanja v Normandiji?",
    hint: "Poišči obalo severozahodne Francije ob Rokavskem prelivu.",
    answerLabel: "Plaža Omaha med krajema Vierville-sur-Mer in Colleville-sur-Mer",
    explanation: "Ameriške enote so se izkrcale pod nemškim ognjem. Strmi obalni bregovi in malo prehodov v notranjost so otežili širitev mostišča.",
    sources: [omaha, { title: "UNESCO — lokacija plaže Omaha (1581-003)", url: "https://whc.unesco.org/fr/list/1581/cartes" }],
    data: {
      kind: "location",
      coordinates: { lat: degrees(49, 22, 10), lng: -degrees(0, 52, 17) },
      fullRadiusKm: 8,
      outerRadiusKm: 70,
      reference: "Točka 1581-003 označuje sektor Omaha. Notranji polmer pokrije dolg odsek plaže, zunanji omogoča delne točke na širši normandijski obali.",
    },
  },
  {
    id: 8,
    era: "ww2",
    period: "September 1944",
    prompt: "Kje je stal cestni most pri Arnhemu, ki so ga britanski padalci skušali obdržati med operacijo Market Garden?",
    hint: "Poišči prehod čez spodnji Ren v vzhodnem delu Nizozemske.",
    answerLabel: "Cestni most čez spodnji Ren v Arnhemu",
    explanation: "Most je bil najoddaljenejši pomembni prehod na poti kopenskih okrepitev. Te niso pravočasno dosegle branilcev, zato zavezniki niso zadržali prehoda čez Ren.",
    sources: [
      arnhem,
      { title: "Nizozemski register dediščine — John Frostbrug", url: "https://monumentenregister.cultureelerfgoed.nl/monumenten/529907" },
      { title: "OpenStreetMap — lokacija današnjega mostu", url: "https://www.openstreetmap.org/way/595322843" },
    ],
    data: {
      kind: "location",
      coordinates: { lat: 51.9743, lng: 5.9111 },
      fullRadiusKm: 8,
      outerRadiusKm: 55,
      reference: "Današnji most označuje lokacijo nekdanjega prehoda. Notranji polmer zajame Arnhem, zunanji razlikuje ta prehod od drugih oddaljenih ciljev operacije.",
    },
  },
  {
    id: 9,
    era: "ww2",
    period: "December 1944",
    prompt: "Kje je Bastogne, oblegano cestno vozlišče med nemško ofenzivo v Ardenih?",
    hint: "Poišči območje jugovzhodne Belgije blizu meje z Luksemburgom.",
    answerLabel: "Bastogne v belgijskih Ardenih",
    explanation: "Ceste, ki so se stekale v mestu, so bile pomembne za premik in oskrbo nemških sil. Ameriška obramba je Nemcem otežila uporabo te prometne povezave.",
    sources: [
      bastogne,
      { title: "Accueil Champêtre en Wallonie — lokacija Mardassona pri Bastognu", url: "https://www.cirkwi.com/en/point-interet/198391-mardasson-and-bastogne-war-museum" },
    ],
    data: {
      kind: "location",
      coordinates: { lat: 50.0101, lng: 5.7384 },
      fullRadiusKm: 10,
      outerRadiusKm: 65,
      reference: "Objavljena točka Mardasson označuje bližnjo okolico Bastogna. Notranji polmer zajame mesto in cestne dostope, zunanji omeji delne točke na širše Ardene.",
    },
  },
  {
    id: 10,
    era: "ww2",
    period: "6. junij 1944",
    prompt: "Katere navedene države so imele kopenske enote, ki so neposredno napadale oziroma branile sektor Omaha?",
    hint: "Osredotoči se na ta sektor, enega od petih odsekov izkrcanja.",
    answerLabel: "Združene države Amerike in nacistična Nemčija",
    explanation: "Na plaži Omaha so ameriške pehotne enote napadle nemške obalne položaje. Kopenske enote Združenega kraljestva in Kanade so se izkrcavale v drugih sektorjih.",
    sources: [omaha],
    data: participants(["uk", "naziGermany", "canada", "usa"], ["usa", "naziGermany"]),
  },
  {
    id: 11,
    era: "ww2",
    period: "17.–21. september 1944",
    prompt: "Katere navedene države so imele kopenske enote v neposrednem boju za cestni most v Arnhemu?",
    hint: "Ameriški padalci so v isti operaciji dobili druge cilje, med njimi prehode pri Nijmegnu.",
    answerLabel: "Združeno kraljestvo in nacistična Nemčija",
    explanation: "Britanski padalci so dosegli severni konec mostu. Nemške enote so jih izolirale in premagale, preden so branilce dosegle kopenske okrepitve.",
    sources: [arnhem],
    data: participants(["usa", "uk", "naziGermany", "japan"], ["uk", "naziGermany"]),
  },
  {
    id: 12,
    era: "ww2",
    period: "December 1944",
    prompt: "Katere navedene države so poveljevale glavnim enotam, ki so oblegale oziroma branile Bastogne?",
    hint: "Med branilci je bila 101. zračnodesantna divizija.",
    answerLabel: "Nacistična Nemčija in Združene države Amerike",
    explanation: "Nemške divizije so obkolile mesto. Ameriško obrambo so sestavljale padalske, oklepne in druge enote. Ameriške sile so konec decembra prebile obroč obleganja.",
    sources: [bastogne],
    data: participants(["ussr", "usa", "uk", "naziGermany"], ["naziGermany", "usa"]),
  },
];
