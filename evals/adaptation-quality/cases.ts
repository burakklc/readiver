import {
  CEFR_LEVELS,
  SUPPORTED_LANGUAGES,
  type CefrLevel,
  type TargetLanguage,
} from "../../supabase/functions/adapt/types.ts";

export interface SourceFixture {
  code: TargetLanguage;
  name: string;
  text: string;
  expectedFacts: string[];
  tags: string[];
}

export interface QualityCase extends SourceFixture {
  id: string;
  targetLanguage: TargetLanguage;
  level: CefrLevel;
}

export const SOURCE_FIXTURES: readonly SourceFixture[] = [
  {
    code: "en",
    name: "English",
    text: "In 2024, the town of Bellweather replaced twelve diesel buses with electric models. Officials expected quieter streets and lower emissions, but the first winter exposed a practical problem: batteries lost range on the coldest days. The transport team did not abandon the project. Instead, it adjusted routes, added two charging points, and kept three diesel buses available for emergencies.",
    expectedFacts: [
      "The change happened in 2024 in Bellweather.",
      "Twelve diesel buses were replaced with electric buses.",
      "Cold winter weather reduced battery range.",
      "The response included route changes, two charging points, and three emergency diesel buses.",
    ],
    tags: ["numbers", "cause-and-effect", "policy"],
  },
  {
    code: "de",
    name: "German",
    text: "Seit drei Jahren pflegt eine Nachbarschaft in Bremen einen gemeinsamen Garten auf dem Dach eines Parkhauses. Die Ernte reicht nicht aus, um alle Familien zu versorgen, doch das war nie das einzige Ziel. Das Projekt senkt im Sommer die Temperatur auf dem Dach, bietet Insekten Nahrung und bringt Menschen zusammen, die sich vorher kaum kannten. Die Stadt übernimmt die Kosten für Wasser, während die Mitglieder ihre Arbeitszeit freiwillig einbringen.",
    expectedFacts: [
      "A Bremen neighborhood has maintained the garden for three years.",
      "The garden is on the roof of a parking structure.",
      "The harvest cannot feed every family and food was not the only goal.",
      "The city pays for water and members volunteer their time.",
    ],
    tags: ["contrast", "shared-responsibility", "environment"],
  },
  {
    code: "es",
    name: "Spanish",
    text: "La biblioteca de Valdemora comenzó a digitalizar su archivo fotográfico después de que una inundación dañara 600 negativos. El equipo escanea cada imagen en alta resolución, pero conserva también los originales en cajas especiales. Según la directora, el objetivo no es sustituir los documentos físicos, sino permitir que investigadores y vecinos consulten la colección sin ponerla en riesgo. Hasta ahora se han publicado 8.400 fotografías.",
    expectedFacts: [
      "A flood damaged 600 negatives.",
      "Images are scanned in high resolution and originals remain in special boxes.",
      "Digitization provides access without replacing the physical documents.",
      "8,400 photographs have been published so far.",
    ],
    tags: ["numbers", "preservation", "stated-intent"],
  },
  {
    code: "fr",
    name: "French",
    text: "Lorsque l'entreprise Miroval a proposé quatre jours de télétravail par semaine, la plupart des salariés ont accueilli la mesure avec enthousiasme. Six mois plus tard, une enquête interne a pourtant révélé que les nouvelles recrues se sentaient moins intégrées. La direction a donc maintenu la flexibilité, tout en créant une journée commune au bureau et un programme de mentorat. « La liberté ne doit pas devenir de l'isolement », a expliqué la responsable des ressources humaines.",
    expectedFacts: [
      "Miroval proposed four remote-work days per week.",
      "After six months, new employees reported feeling less integrated.",
      "The company kept flexibility and added one shared office day plus mentoring.",
      "The HR leader said freedom should not become isolation.",
    ],
    tags: ["timeline", "quotation", "workplace"],
  },
  {
    code: "it",
    name: "Italian",
    text: "Il settimanale locale di Porto Lume stava per chiudere quando 1.200 lettori hanno acquistato un abbonamento annuale in anticipo. Il sostegno ha garantito altri dodici mesi di attività, ma non ha risolto tutti i problemi economici. La redazione ha ridotto l'edizione cartacea da 32 a 24 pagine e ha deciso di non tagliare le inchieste sui consigli comunali. Per il direttore, controllare le istituzioni rimane il compito principale del giornale.",
    expectedFacts: [
      "1,200 readers prepaid for an annual subscription.",
      "The support secured twelve more months but did not solve every financial problem.",
      "The print edition fell from 32 to 24 pages.",
      "Investigations of municipal councils were protected as the newspaper's main duty.",
    ],
    tags: ["numbers", "trade-off", "journalism"],
  },
  {
    code: "tr",
    name: "Turkish",
    text: "Gökdere'de geçen yaz su tüketimi yüzde 18 arttı. Belediye önce halka daha kısa duş almasını tavsiye etti, ancak eski borulardaki sızıntıların toplam kaybın neredeyse üçte birini oluşturduğu ortaya çıktı. Bunun üzerine ekipler 14 kilometrelik hattı yeniledi ve parklarda gece sulamasına geçti. Belediye başkanı, bireysel tasarrufun önemli olduğunu fakat kurumların kendi sorumluluğunu da yerine getirmesi gerektiğini söyledi.",
    expectedFacts: [
      "Water use in Gökdere rose by 18 percent last summer.",
      "Leaking old pipes caused nearly one third of total loss.",
      "Fourteen kilometers of pipe were renewed and parks switched to night watering.",
      "The mayor said both individuals and institutions have responsibilities.",
    ],
    tags: ["numbers", "cause-and-effect", "public-responsibility"],
  },
] as const;

export const QUALITY_CASES: readonly QualityCase[] = SOURCE_FIXTURES.flatMap(
  (source, sourceIndex) =>
    SUPPORTED_LANGUAGES.map(({ code: targetLanguage }, targetIndex) => {
      const level = CEFR_LEVELS[(sourceIndex + targetIndex) % CEFR_LEVELS.length];

      return {
        ...source,
        id: `${source.code}-${targetLanguage}-${level.toLowerCase()}`,
        targetLanguage,
        level,
      };
    }),
);
