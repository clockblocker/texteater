import { parseUnit, type DumlingUnit } from "./public.js";
import type { UnitMap } from "./dto.ts";
export type GermanNoun = DumlingUnit<"Lemma", "de", "Lexeme", "NOUN">;
export type AllConcreteValues = { [R in keyof UnitMap]: UnitMap[R]["value"] };
declare const incoming: unknown;
const parsed = parseUnit(incoming, {route:"de/Lexeme/NOUN",unitKind:"Lemma"});
if (parsed.success) {
  const caseValue: "Acc" | "Dat" | "Gen" | "Nom" | null = parsed.data.value.inflectional.case;
  const noun: GermanNoun = parsed.data;
  void caseValue; void noun;
  // @ts-expect-error German noun bags do not contain Hebrew-only binyan.
  parsed.data.value.core.hebBinyan;
}
// @ts-expect-error Morphemes do not have the NOUN kind.
type WrongKind = DumlingUnit<"Lemma","de","Morpheme","NOUN">;
