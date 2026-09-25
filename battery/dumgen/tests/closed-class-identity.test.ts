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
 * The one accepted pillar collision (system ADR 0032). Standalone
 * demonstrative deren and derer realize the same Gen.Fem.Sg and Gen.Plur
 * cells and differ only in reference direction: derer points ahead to a
 * relative clause (Wir gedenken derer, die geholfen haben), deren points back
 * (Die Lösungen dort: Deren bedarf es). No UD feature marks that direction.
 * Never add a line without such a reason.
 */
const acceptedPillarCollisions = [
	"deren = derer: PRON case=Gen gender=Fem number=Sing pronType=Dem",
	"deren = derer: PRON case=Gen number=Plur pronType=Dem",
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
	expect(collisions.sort()).toEqual([...acceptedPillarCollisions].sort());
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

test("jemand varies case only among its own cells", () => {
	const jemand = lemmaOf("PRON", "jemand");
	expect(
		selectGrammaticalAlternatives({ source: jemand, vary: ["case"] })
			.map(({ lemma }) => lemma.canonicalForm)
			.sort(),
	).toEqual(["jemandem", "jemanden", "jemandes"]);
	// man leaves case unmarked, so varying case neither reaches nor leaves it.
	const man = lemmaOf("PRON", "man");
	expect(man.coreFeatures).toMatchObject({ case: null, number: "Sing" });
	expect(
		selectGrammaticalAlternatives({ source: man, vary: ["case"] }),
	).toEqual([]);
	// irgendjemand is a stem: its forms are its own Surfaces.
	const irgendjemand = lemmaOf("PRON", "irgendjemand");
	expect(isParadigmCell(irgendjemand)).toBe(false);
	expect(
		selectFormAlternatives({
			source: irgendjemand,
			cell: { case: "Nom", number: "Sing", gender: null },
			vary: ["case"],
		})
			.map(({ spelled, cell }) => `${spelled}/${cell.case}`)
			.sort(),
	).toEqual([
		"irgendjemand/Acc",
		"irgendjemand/Dat",
		"irgendjemandem/Dat",
		"irgendjemanden/Acc",
		"irgendjemandes/Gen",
		"irgendjemands/Gen",
	]);
});

test("wer is masculine and was neuter; wessen belongs to both", () => {
	const pronouns = closedClass
		.map(({ lemma }) => lemma)
		.filter(
			(lemma): lemma is Dumling.Lemma<"de", "Lexeme", "PRON"> =>
				lemma.kind === "PRON" &&
				["wer", "wen", "wem", "wessen", "was"].includes(
					lemma.canonicalForm,
				),
		);
	const cells = (pronType: string) =>
		pronouns
			.filter(
				(lemma) =>
					lemma.coreFeatures.pronType === pronType &&
					lemma.coreFeatures.extPos === null,
			)
			.map((lemma) => describe(lemma).replace(/^PRON /, ""))
			.sort();
	for (const pronType of ["Int", "Rel"])
		expect(cells(pronType)).toEqual(
			[
				"case=Acc gender=Masc",
				"case=Acc gender=Neut",
				"case=Dat gender=Masc",
				"case=Gen gender=Masc",
				"case=Gen gender=Neut",
				"case=Nom gender=Masc",
				"case=Nom gender=Neut",
			].map((key) => `${key} pronType=${pronType}`),
		);
	const wer = required(
		pronouns.find(
			(lemma) =>
				lemma.canonicalForm === "wer" &&
				lemma.coreFeatures.pronType === "Int",
		),
		"Expected interrogative wer",
	);
	expect(
		selectGrammaticalAlternatives({ source: wer, vary: ["gender"] }).map(
			({ lemma }) => lemma.canonicalForm,
		),
	).toEqual(["was"]);
});

test("relative derer is a Variant of relative deren, not its own Lemma", () => {
	const derer = authoredRealizations.filter(
		({ spelled }) => spelled === "derer",
	);
	expect(
		derer
			.map(({ member }) => {
				const core = member.lemma.coreFeatures as Record<
					string,
					unknown
				>;
				return `${member.lemma.canonicalForm} ${String(core.pronType)} ${String(core.number)}`;
			})
			.sort(),
	).toEqual([
		"deren Rel Plur",
		"deren Rel Sing",
		"derer Dem Plur",
		"derer Dem Sing",
	]);
});
