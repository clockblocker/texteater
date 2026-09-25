import { expect, test } from "bun:test";
import { required } from "common-utils";
import { checkIfGrundform, parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { authoredMembers } from "../src/concrete-lang/de/authored-closed-sets/inventory.js";
import { authoredRealizations } from "../src/concrete-lang/de/authored-closed-sets/realizations.js";
import {
	isParadigmCell,
	selectFormAlternatives,
	selectGrammaticalAlternatives,
} from "../src/concrete-lang/de/authored-closed-sets/select.js";

const closedClass = authoredMembers.filter(
	({ lemma }) => lemma.kind === "PRON" || lemma.kind === "DET",
);
const describe = (lemma: Dumling.Lemma) =>
	`${lemma.kind} ${Object.entries(lemma.coreFeatures)
		.filter(([, value]) => value !== null)
		.map(([name, value]) => `${name}=${String(value)}`)
		.sort()
		.join(" ")}`;

/**
 * Pillar collisions that are still to decide (system ADR 0032, #595). Each
 * line is two or more pillar Lemmas of one Kind with identical Core Features.
 * Remove a line once its Lemmas are told apart; never add one silently.
 */
const undecidedPillarCollisions = [
	// wer and was share interrogative and free-relative Nom and Acc cells.
	"was = wer: PRON case=Nom pronType=Int",
	"was = wen: PRON case=Acc pronType=Int",
	"was = wer: PRON case=Nom pronType=Rel",
	"was = wen: PRON case=Acc pronType=Rel",
	// irgendjemand repeats the jemand cells; man is a Nom.Sing indefinite.
	"irgendjemand = jemand = man: PRON case=Nom number=Sing pronType=Ind",
	"irgendjemanden = jemanden: PRON case=Acc number=Sing pronType=Ind",
	"irgendjemandem = jemandem: PRON case=Dat number=Sing pronType=Ind",
	"irgendjemandes = jemandes: PRON case=Gen number=Sing pronType=Ind",
	// Standalone genitive deren and derer share the Fem.Sg and Plur cells.
	"deren = derer: PRON case=Gen gender=Fem number=Sing pronType=Dem",
	"deren = derer: PRON case=Gen number=Plur pronType=Dem",
	"deren = derer: PRON case=Gen gender=Fem number=Sing pronType=Rel",
	"deren = derer: PRON case=Gen number=Plur pronType=Rel",
];

test("no two per-cell Lemmas of one Kind share all Core Features", () => {
	const groups = new Map<string, Set<string>>();
	for (const { lemma } of closedClass) {
		if (!isParadigmCell(lemma)) continue;
		const key = describe(lemma);
		groups.set(
			key,
			(groups.get(key) ?? new Set()).add(lemma.canonicalForm),
		);
	}
	const collisions = [...groups]
		.filter(([, forms]) => forms.size > 1)
		.map(([key, forms]) => `${[...forms].sort().join(" = ")}: ${key}`);
	expect(collisions.sort()).toEqual([...undecidedPillarCollisions].sort());
});

test("a stem Lemma leaves its cell to the Surface and cites a Grundform", () => {
	for (const member of closedClass) {
		const realizations = authoredRealizations.filter(
			(realization) => realization.member === member,
		);
		const cells = realizations.filter(({ inflection }) => inflection);
		if (isParadigmCell(member.lemma)) {
			expect(cells, member.lemma.canonicalForm).toEqual([]);
			continue;
		}
		if (!cells.length) continue;
		// The Canonical Form spells a Nom.Masc.Sg or Nom.Plur Surface, or an
		// uninflected one (viel, wenig, wieviel).
		const grundform = realizations.filter(({ spelled, inflection }) => {
			if (spelled !== member.lemma.canonicalForm) return false;
			const surface = {
				unitKind: "Surface",
				language: "de",
				lemma: member.lemma,
				normalizedSurface: spelled,
				spelling: "Canonical",
				surfaceFeatures: null,
				inflectionalFeatures: inflection
					? member.lemma.kind === "DET"
						? {
								degree: null,
								"gender[psor]": null,
								"number[psor]": null,
								...inflection,
							}
						: { reflex: null, ...inflection }
					: null,
			};
			const parsed = parseUnit(surface);
			if (!parsed.success) throw parsed.error;
			const result = checkIfGrundform(surface as Dumling.Surface);
			return result.success && result.value;
		});
		expect(grundform.length, member.lemma.canonicalForm).toBeGreaterThan(0);
	}
});

const lemmaOf = (kind: "DET" | "PRON", form: string) =>
	required(
		authoredMembers.find(
			({ lemma }) => lemma.kind === kind && lemma.canonicalForm === form,
		),
		`Expected authored ${kind} ${form}`,
	).lemma as Dumling.Lemma<"de", "Lexeme", "DET" | "PRON">;

test("diesem never reaches jenem: a stem's forms stay inside its Lemma", () => {
	for (const kind of ["DET", "PRON"] as const) {
		const dieser = lemmaOf(kind, "dieser");
		expect(
			selectGrammaticalAlternatives({
				source: dieser,
				vary: ["case", "number", "gender"],
			}),
		).toEqual([]);
		const diesem = { case: "Dat", number: "Sing", gender: "Masc" } as const;
		expect(
			selectFormAlternatives({
				source: dieser,
				cell: diesem,
				vary: ["case"],
			})
				.map(({ spelled, cell }) => `${spelled}/${cell.case}`)
				.sort(),
		).toEqual(["diesen/Acc", "dieser/Nom", "dieses/Gen"]);
		const everyForm = selectFormAlternatives({
			source: dieser,
			cell: diesem,
			vary: ["case", "number", "gender"],
		});
		expect(everyForm.length).toBeGreaterThan(10);
		for (const { spelled } of everyForm)
			expect(spelled.startsWith("dies"), spelled).toBe(true);
	}
	// Possessives: meinem reaches meinen and meine, never unserem.
	const mein = lemmaOf("DET", "mein");
	expect(
		selectFormAlternatives({
			source: mein,
			cell: { case: "Dat", number: "Sing", gender: "Masc" },
			vary: ["case", "number", "gender"],
		}).every(({ spelled }) => spelled.startsWith("mein")),
	).toBe(true);
});

test("pillar navigation never lands on a stem Lemma", () => {
	for (const { lemma } of closedClass) {
		if (!isParadigmCell(lemma)) continue;
		for (const reading of selectGrammaticalAlternatives({
			source: lemma as Dumling.Lemma<"de", "Lexeme", "DET" | "PRON">,
			vary: ["case", "number", "gender"],
		}))
			expect(
				isParadigmCell(reading.lemma),
				reading.lemma.canonicalForm,
			).toBe(true);
	}
});
