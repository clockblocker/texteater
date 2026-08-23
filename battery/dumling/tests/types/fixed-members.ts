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

const auxCatalog = fixedMembersFor.lemma({
	language: "de",
	family: "Lexeme",
	kind: "AUX",
});
if (auxCatalog) {
	auxCatalog.members satisfies readonly Lemma<"de", "Lexeme", "AUX">[];
}

declare const auxLemma: Lemma<"de", "Lexeme", "AUX">;
const auxReadings = fixedMembersFor.reading(auxLemma);
if (auxReadings) {
	auxReadings.members satisfies readonly Reading<"de", "Lexeme", "AUX">[];
}
