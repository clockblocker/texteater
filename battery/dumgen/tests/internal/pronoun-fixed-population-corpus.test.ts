import { expect, test } from "bun:test";
import {
	allFixedLemmaCatalogs,
	FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
	fixedMembersFor,
} from "dumling/fixed";

import { corpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/golden-corpus/corpus";
import { corpus as targetCorpus } from "../../src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit/corpus/corpus";

test("German PRON corpus covers every exact fixed-population identity", () => {
	const catalog = allFixedLemmaCatalogs().find(
		({ scope }) =>
			scope === FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
	);
	if (!catalog) throw new Error("Expected fixed German PRON population.");
	const covered = new Set(
		Object.values(corpus.cases).map(({ idealOutput }) =>
			identityKey(idealOutput.lemma),
		),
	);

	expect(catalog.members).toHaveLength(75);
	for (const lemma of catalog.members) {
		expect(covered.has(identityKey(lemma))).toBe(true);
	}
});

test("German PRON corpus fixes the four exact interrogative case forms", () => {
	const expected = {
		wer: "Nom",
		wen: "Acc",
		wem: "Dat",
		wessen: "Gen",
	} as const;
	const catalog = fixedMembersFor.lemma({
		language: "de",
		family: "Lexeme",
		kind: "PRON",
	});
	if (!catalog) throw new Error("Expected fixed German PRON population.");

	for (const [canonicalForm, grammaticalCase] of Object.entries(expected)) {
		const matches = catalog.members.filter(
			(lemma) => lemma.canonicalForm === canonicalForm,
		);
		expect(matches).toHaveLength(1);
		const lemma = matches[0];
		if (!lemma) throw new Error(`Expected fixed ${canonicalForm} Lemma.`);
		expect(lemma.coreFeatures).toEqual({
			extPos: null,
			foreign: null,
			person: null,
			polite: null,
			poss: null,
			pronType: "Int",
			referenceGender: null,
			referenceNumber: null,
		});
		expect(fixedMembersFor.reading(lemma)?.members).toHaveLength(1);

		const goldenCase =
			corpus.cases[`grammar-de-pron-fixed-${canonicalForm}`];
		expect(goldenCase?.idealOutput).toEqual({
			memberOrthographies: ["Standard"],
			normalizedMembers: [canonicalForm],
			surface: {
				spelling: "Canonical",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: {
					case: grammaticalCase,
					gender: null,
					number: "Sing",
					reflex: null,
				},
			},
			lemma: {
				canonicalForm,
				coreFeatures: lemma.coreFeatures,
			},
		});
	}
});

test("German target classification keeps free interrogatives PRON and adnominal wessen DET", () => {
	for (const form of ["wer", "wen", "wem", "wessen"] as const) {
		expect(
			targetCorpus.cases[`target-de-interrogative-free-${form}`]
				?.idealOutput,
		).toEqual({
			decision: "Resolved",
			target: {
				family: "Lexeme",
				kind: "PRON",
				memberSegmentIndices: [0],
			},
		});
	}
	expect(
		targetCorpus.cases["target-de-interrogative-adnominal-wessen"]
			?.idealOutput,
	).toEqual({
		decision: "Resolved",
		target: {
			family: "Lexeme",
			kind: "DET",
			memberSegmentIndices: [0],
		},
	});
});

test("German PRON corpus collects the four jemand Surfaces under one ideal Lemma", () => {
	const expected = {
		jemand: {
			case: "Nom",
			context: "<TARGET>Jemand</TARGET> wartet vor der Tür.",
		},
		jemanden: {
			case: "Acc",
			context: "Ich sehe <TARGET>jemanden</TARGET> vor der Tür.",
		},
		jemandem: {
			case: "Dat",
			context:
				"Ich helfe <TARGET>jemandem</TARGET> aus der Nachbarschaft.",
		},
		jemandes: {
			case: "Gen",
			context: "Es bedarf <TARGET>jemandes</TARGET> mit Erfahrung.",
		},
	} as const;
	const jemand = fixedMembersFor
		.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
		?.members.find(
			(lemma) =>
				lemma.canonicalForm === "jemand" &&
				lemma.coreFeatures.pronType === "Ind",
		);
	if (!jemand) throw new Error("Expected fixed jemand Lemma.");

	for (const [form, specification] of Object.entries(expected)) {
		const goldenCase = corpus.cases[`grammar-de-pron-fixed-jemand-${form}`];
		expect(goldenCase?.input).toEqual({
			markedContext: specification.context,
			members: [form === "jemand" ? "Jemand" : form],
		});
		expect(goldenCase?.idealOutput).toEqual({
			memberOrthographies: ["Standard"],
			normalizedMembers: [form],
			surface: {
				spelling: "Canonical",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: {
					case: specification.case,
					gender: null,
					number: "Sing",
					reflex: null,
				},
			},
			lemma: {
				canonicalForm: "jemand",
				coreFeatures: jemand.coreFeatures,
			},
		});
	}
});

test("German target corpus classifies each free jemand case form as a singleton PRON", () => {
	const expected = {
		"target-de-boundary-jemand-nom": 0,
		"target-de-boundary-jemanden-acc": 4,
		"target-de-boundary-jemandem-dat": 4,
		"target-de-boundary-jemandes-gen": 4,
	} as const;

	for (const [caseId, clickedSegmentIndex] of Object.entries(expected)) {
		expect(targetCorpus.cases[caseId]?.idealOutput).toEqual({
			decision: "Resolved",
			target: {
				family: "Lexeme",
				kind: "PRON",
				memberSegmentIndices: [clickedSegmentIndex],
			},
		});
	}
});

test("German PRON corpus collects the four niemand Surfaces under one ideal Lemma", () => {
	const expected = {
		niemand: {
			case: "Nom",
			context: "<TARGET>Niemand</TARGET> wartet vor der Tür.",
		},
		niemanden: {
			case: "Acc",
			context: "Ich sehe <TARGET>niemanden</TARGET> vor der Tür.",
		},
		niemandem: {
			case: "Dat",
			context:
				"Ich helfe <TARGET>niemandem</TARGET> aus der Nachbarschaft.",
		},
		niemandes: {
			case: "Gen",
			context: "Es bedarf <TARGET>niemandes</TARGET> mit Erfahrung.",
		},
	} as const;
	const niemand = fixedMembersFor
		.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
		?.members.find(
			(lemma) =>
				lemma.canonicalForm === "niemand" &&
				lemma.coreFeatures.pronType === "Neg",
		);
	if (!niemand) throw new Error("Expected fixed niemand Lemma.");

	for (const [form, specification] of Object.entries(expected)) {
		const goldenCase =
			corpus.cases[`grammar-de-pron-fixed-niemand-${form}`];
		expect(goldenCase?.input).toEqual({
			markedContext: specification.context,
			members: [form === "niemand" ? "Niemand" : form],
		});
		expect(goldenCase?.idealOutput).toEqual({
			memberOrthographies: ["Standard"],
			normalizedMembers: [form],
			surface: {
				spelling: "Canonical",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: {
					case: specification.case,
					gender: null,
					number: "Sing",
					reflex: null,
				},
			},
			lemma: {
				canonicalForm: "niemand",
				coreFeatures: niemand.coreFeatures,
			},
		});
	}
});

test("German target corpus classifies each free niemand case form as a singleton PRON", () => {
	const expected = {
		"target-de-boundary-niemand-nom": 0,
		"target-de-boundary-niemanden-acc": 4,
		"target-de-boundary-niemandem-dat": 4,
		"target-de-boundary-niemandes-gen": 4,
	} as const;

	for (const [caseId, clickedSegmentIndex] of Object.entries(expected)) {
		expect(targetCorpus.cases[caseId]?.idealOutput).toEqual({
			decision: "Resolved",
			target: {
				family: "Lexeme",
				kind: "PRON",
				memberSegmentIndices: [clickedSegmentIndex],
			},
		});
	}
});

test("German PRON corpus keeps nichts canonical and nix a Standard Citation Variant", () => {
	const fixedCore = {
		extPos: null,
		foreign: null,
		person: null,
		polite: null,
		poss: null,
		pronType: "Neg",
		referenceGender: null,
		referenceNumber: null,
	} as const;
	const expected = {
		"grammar-de-pron-accept-v4-negative-nichts": {
			normalizedMember: "nichts",
			spelling: "Canonical",
		},
		"grammar-de-pron-demo-variant-nix": {
			normalizedMember: "nix",
			spelling: "Variant",
		},
	} as const;

	for (const [caseId, specification] of Object.entries(expected)) {
		const output = corpus.cases[caseId]?.idealOutput;
		expect(output).toEqual({
			memberOrthographies: ["Standard"],
			normalizedMembers: [specification.normalizedMember],
			surface: {
				spelling: specification.spelling,
				surfaceKind: "Citation",
				surfaceFeatures: null,
			},
			lemma: { canonicalForm: "nichts", coreFeatures: fixedCore },
		});
	}
});

test("German target classification keeps negative PRON forms and route controls separate", () => {
	const expected = {
		"target-de-negative-pron-nichts-subject": ["PRON", 0],
		"target-de-negative-pron-nix-subject": ["PRON", 0],
		"target-de-negative-pron-nichts-object": ["PRON", 4],
		"target-de-negative-pron-nix-object": ["PRON", 4],
		"target-de-negative-control-nichts-noun": ["NOUN", 2],
		"target-de-negative-control-nicht-part": ["PART", 0],
		"target-de-negative-control-kein-det": ["DET", 0],
	} as const;

	for (const [caseId, [kind, clickedSegmentIndex]] of Object.entries(
		expected,
	)) {
		expect(targetCorpus.cases[caseId]?.idealOutput).toEqual({
			decision: "Resolved",
			target: {
				family: "Lexeme",
				kind,
				memberSegmentIndices: [clickedSegmentIndex],
			},
		});
	}
});

test("German PRON corpus preserves all sixteen keiner Surface analyses", () => {
	const cases = Object.entries(corpus.cases).filter(([id]) =>
		id.startsWith("grammar-de-pron-fixed-keiner-"),
	);
	expect(cases).toHaveLength(16);
	expect(
		cases.map(([, goldenCase]) => ({
			form: goldenCase.idealOutput.normalizedMembers[0],
			features:
				goldenCase.idealOutput.surface.surfaceKind === "Inflection"
					? goldenCase.idealOutput.surface.inflectionalFeatures
					: null,
			lemma: goldenCase.idealOutput.lemma.canonicalForm,
		})),
	).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				form: "keiner",
				lemma: "keiner",
				features: expect.objectContaining({
					case: "Nom",
					gender: "Masc",
					number: "Sing",
				}),
			}),
			expect.objectContaining({
				form: "keines",
				lemma: "keiner",
				features: expect.objectContaining({
					case: "Nom",
					gender: "Neut",
					number: "Sing",
				}),
			}),
			expect.objectContaining({
				form: "keine",
				lemma: "keiner",
				features: expect.objectContaining({
					case: "Nom",
					gender: null,
					number: "Plur",
				}),
			}),
			expect.objectContaining({
				form: "keinen",
				lemma: "keiner",
				features: expect.objectContaining({
					case: "Dat",
					gender: null,
					number: "Plur",
				}),
			}),
			expect.objectContaining({
				form: "keiner",
				lemma: "keiner",
				features: expect.objectContaining({
					case: "Gen",
					gender: null,
					number: "Plur",
				}),
			}),
		]),
	);
	for (const [, goldenCase] of cases) {
		expect(goldenCase.idealOutput.lemma.coreFeatures.pronType).toBe("Neg");
	}
});

test("German target corpus separates standalone keiner PRON from adnominal kein- DET", () => {
	const cases = Object.entries(targetCorpus.cases).filter(
		([id]) =>
			id.includes("negative-pron-kein") ||
			id.includes("negative-det-kein"),
	);
	expect(cases).toHaveLength(10);
	for (const [id, goldenCase] of cases) {
		const output = goldenCase.idealOutput;
		if (output.decision !== "Resolved")
			throw new Error(`Expected ${id} to resolve.`);
		expect(output.target.memberSegmentIndices).toHaveLength(1);
		expect(output.target.kind).toBe(
			id.includes("negative-pron-") ? "PRON" : "DET",
		);
	}
});

test("German corpora keep all four jedermann cases under one total PRON Lemma", () => {
	const cases = Object.entries(corpus.cases).filter(([id]) =>
		id.startsWith("grammar-de-pron-fixed-jedermann-"),
	);
	expect(cases).toHaveLength(4);
	expect(
		cases.map(([, value]) => [
			value.idealOutput.normalizedMembers[0],
			value.idealOutput.surface.surfaceKind === "Inflection"
				? value.idealOutput.surface.inflectionalFeatures.case
				: null,
			value.idealOutput.lemma.canonicalForm,
		]),
	).toEqual([
		["jedermann", "Nom", "jedermann"],
		["jedermann", "Acc", "jedermann"],
		["jedermann", "Dat", "jedermann"],
		["jedermanns", "Gen", "jedermann"],
	]);
	for (const id of ["nom", "acc", "dat", "gen"]) {
		const output =
			targetCorpus.cases[
				`target-de-total-jedermann${id === "gen" ? "s" : ""}-${id}`
			]?.idealOutput;
		expect(output).toMatchObject({
			decision: "Resolved",
			target: { kind: "PRON" },
		});
	}
});

test("German corpora preserve sixteen mancher analyses and PRON/DET boundaries", () => {
	const cases = Object.entries(corpus.cases).filter(([id]) =>
		id.startsWith("grammar-de-pron-fixed-mancher-"),
	);
	expect(cases).toHaveLength(16);
	for (const [, value] of cases) {
		expect(value.idealOutput.lemma).toMatchObject({
			canonicalForm: "mancher",
			coreFeatures: { pronType: "Tot" },
		});
		expect(value.idealOutput.surface.surfaceKind).toBe("Inflection");
	}
	const boundaries = Object.entries(targetCorpus.cases).filter(
		([id]) =>
			id.includes("total-manch") &&
			id !== "target-de-total-manch-control",
	);
	expect(boundaries).toHaveLength(10);
	for (const [id, value] of boundaries) {
		const output = value.idealOutput;
		if (output.decision !== "Resolved")
			throw new Error(`Expected ${id} to resolve.`);
		expect(output.target.kind).toBe(id.includes("-pron-") ? "PRON" : "DET");
	}
});

function identityKey(value: {
	readonly canonicalForm: string;
	readonly coreFeatures: object;
}): string {
	return JSON.stringify([value.canonicalForm, value.coreFeatures]);
}
