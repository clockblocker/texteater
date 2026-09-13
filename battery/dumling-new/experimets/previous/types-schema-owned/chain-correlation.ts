type Parsed =
  | { chain: { language: "de" }; data: { gender: "Fem" | "Masc" | "Neut" } }
  | { chain: { language: "en" }; data: { count: "Mass" | "Count" } };
declare const parsed: Parsed;
if (parsed.chain.language === "de") {
  // @ts-expect-error: nested discriminant does not narrow sibling data
  parsed.data.gender;
}
type FlatParsed =
  | { language: "de"; data: { gender: "Fem" | "Masc" | "Neut" } }
  | { language: "en"; data: { count: "Mass" | "Count" } };
declare const flat: FlatParsed;
if (flat.language === "de") { flat.data.gender; }
