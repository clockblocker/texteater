import { fixedMembersFor } from "../../src/fixed";
import type { Lemma, Reading } from "../../src/types";

const detCatalog = fixedMembersFor.lemma({
	language: "de",
	family: "Lexeme",
	kind: "DET",
});
if (detCatalog) {
	detCatalog.members satisfies readonly Lemma<"de", "Lexeme", "DET">[];
}

declare const detLemma: Lemma<"de", "Lexeme", "DET">;
const detReadings = fixedMembersFor.reading(detLemma);
if (detReadings) {
	detReadings.members satisfies readonly Reading<"de", "Lexeme", "DET">[];
}
