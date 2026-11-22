import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { applyKnowledgeChange, parseReadingKnowledge } from "dumrel";
import { governmentProjectionSchema } from "dumrel/schema";
import { projectPrepositionalGovernment } from "../src/project-prepositional-government.js";
import {
	aufLemma,
	fuerLemma,
	houseLemma,
	houseReading,
	mitLemma,
	ueberLemma,
	vonLemma,
	vorLemma,
	wartenReading,
} from "./fixtures.js";

const aufAcc = {
	kind: "Preposition",
	preposition: aufLemma,
	governedCase: "Acc",
} as const;
const aufDat = { ...aufAcc, governedCase: "Dat" } as const;
const nom = { kind: "Case", governedCase: "Nom" } as const;
const acc = { kind: "Case", governedCase: "Acc" } as const;
const dat = { kind: "Case", governedCase: "Dat" } as const;

const stolzReading = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADJ",
		canonicalForm: "stolz",
		coreFeatures: {
			comparable: "Yes",
		},
	},
	emojiDescription: "🦚",
} as const satisfies Dumling.Reading<"de", "Lexeme", "ADJ">;
const aufReading = {
	unitKind: "Reading",
	lemma: aufLemma,
	emojiDescription: "⬆️",
} as const satisfies Dumling.Reading<"de", "Lexeme", "ADP">;

test("a two-way preposition takes the construction's case", () => {
	const parsed = parseReadingKnowledge({
		source: wartenReading,
		knowledge: { valency: [[nom, aufAcc]] },
	});
	expect(parsed).toEqual({
		success: true,
		value: { valency: [[nom, aufAcc]] },
	});
	// `bestehen auf` + Dat: a governed preposition names any oblique case.
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: { valency: [[aufDat]] },
		}).success,
	).toBe(true);
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: {
				valency: [[{ ...aufAcc, governedCase: "Nom" }]],
			},
		}).success,
	).toBe(false);
	// The field is governedCase: Knowledge names no Feature Pool feature.
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: {
				valency: [
					[
						{
							kind: "Preposition",
							preposition: aufLemma,
							case: "Acc",
						},
					],
				],
			},
		}).success,
	).toBe(false);
});

test("a subjectless verb's pattern has no Nom", () => {
	// `mir graut vor dem Winter`: the experiencer is Dat, not a subject.
	const grauenReading = {
		...wartenReading,
		lemma: { ...wartenReading.lemma, canonicalForm: "grauen" },
		emojiDescription: "😨",
	} as const satisfies Dumling.Reading<"de", "Lexeme", "VERB">;
	const vorDat = { ...aufDat, preposition: vorLemma } as const;
	const valency = [[dat, vorDat]];
	expect(
		parseReadingKnowledge({
			source: grauenReading,
			knowledge: { valency },
		}),
	).toEqual({ success: true, value: { valency } });
});

// Which cases a preposition takes is a fact about German: dumcorpus checks
// patterns against its ADP Case Table (ADR 0041).
test("Dumrel leaves a preposition's case to dumcorpus's ADP Case Table", () => {
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: {
				valency: [
					[
						{
							...aufAcc,
							preposition: fuerLemma,
							governedCase: "Dat",
						},
					],
				],
			},
		}).success,
	).toBe(true);
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: {
				valency: [[{ ...aufAcc, preposition: fuerLemma }]],
			},
		}).success,
	).toBe(true);
});

test("only an ADP Lemma of the source Language can be governed", () => {
	for (const preposition of [
		houseLemma,
		{ ...aufLemma, language: "en" },
	] as unknown[])
		expect(
			parseReadingKnowledge({
				source: wartenReading,
				knowledge: { valency: [[{ ...aufAcc, preposition }]] },
			}).success,
		).toBe(false);
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: {
				valency: [[{ ...aufAcc, governedCase: "Nom" }]],
			},
		}).success,
	).toBe(false);
});

test("each route allows its own complements, and lists each pattern and preposition once", () => {
	const noun = parseReadingKnowledge({
		source: houseReading,
		knowledge: { valency: [[nom]] },
	});
	expect(noun.success).toBe(false);
	if (!noun.success)
		expect(noun.error.issues[0]?.path).toEqual([
			"knowledge",
			"valency",
			0,
			0,
			"kind",
		]);
	expect(
		parseReadingKnowledge({
			source: houseReading,
			knowledge: { valency: [[aufAcc]] },
		}).success,
	).toBe(true);
	expect(
		parseReadingKnowledge({
			source: aufReading,
			knowledge: { valency: [[aufAcc]] },
		}).success,
	).toBe(false);
	// Duplicate preposition within one pattern is rejected.
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: { valency: [[aufAcc, aufAcc]] },
		}).success,
	).toBe(false);
	// Duplicate pattern within the Reading's valency is rejected (case-insensitively).
	const shouted = {
		...aufAcc,
		preposition: { ...aufAcc.preposition, canonicalForm: "AUF" },
	};
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: { valency: [[aufAcc], [shouted]] },
		}).success,
	).toBe(false);
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { valency: [[aufAcc]] },
			change: { kind: "Retract", aspect: "valency", pattern: [shouted] },
		}),
	).toEqual({ success: true, value: {} });
});

test("Contribute unions patterns in arrival order, Correct replaces them, Retract removes one or all", () => {
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { valency: [[nom, aufAcc]] },
			change: {
				kind: "Contribute",
				aspect: "valency",
				value: [
					[nom, aufAcc],
					[nom, aufDat],
				],
			},
		}),
	).toEqual({
		success: true,
		value: {
			valency: [
				[nom, aufAcc],
				[nom, aufDat],
			],
		},
	});
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { valency: [[aufAcc]] },
			change: {
				kind: "Correct",
				aspect: "valency",
				value: [[nom, aufAcc]],
			},
		}),
	).toEqual({ success: true, value: { valency: [[nom, aufAcc]] } });
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { valency: [[nom], [nom, aufAcc]] },
			change: {
				kind: "Retract",
				aspect: "valency",
				pattern: [nom, aufAcc],
			},
		}),
	).toEqual({ success: true, value: { valency: [[nom]] } });
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { definition: "x", valency: [[aufAcc]] },
			change: { kind: "Retract", aspect: "valency", pattern: [aufAcc] },
		}),
	).toEqual({ success: true, value: { definition: "x" } });
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { definition: "x", valency: [[aufDat]] },
			change: { kind: "Retract", aspect: "valency" },
		}),
	).toEqual({ success: true, value: { definition: "x" } });
	const invalid = applyKnowledgeChange({
		source: wartenReading,
		knowledge: {},
		change: {
			kind: "Contribute",
			aspect: "valency",
			value: [
				[
					{
						...aufAcc,
						preposition: fuerLemma,
						governedCase: "Nom",
					},
				],
			],
		},
	});
	expect(invalid.success).toBe(false);
});

test("projection reads Preposition complements across patterns and infers the preposition side", () => {
	const result = projectPrepositionalGovernment([
		{ reading: aufReading, knowledge: {} },
		{
			reading: wartenReading,
			knowledge: { valency: [[nom, aufAcc]] },
		},
		{ reading: stolzReading, knowledge: { valency: [[aufAcc]] } },
		{ reading: houseReading, knowledge: {} },
	]);
	expect(result.success).toBe(true);
	if (!result.success) return;
	for (const edge of result.value)
		expect(governmentProjectionSchema.safeParse(edge).success).toBe(true);
	expect(
		result.value
			.filter((edge) => edge.relation === "governedBy")
			.map((edge) => edge.target),
	).toEqual([wartenReading, stolzReading]);
	expect(result.value).toContainEqual({
		source: wartenReading,
		relation: "governs",
		target: aufLemma,
		governedCase: "Acc",
		provenance: "direct",
	});
	const withoutPreposition = projectPrepositionalGovernment([
		{
			reading: wartenReading,
			knowledge: { valency: [[aufAcc]] },
		},
	]);
	expect(withoutPreposition.success && withoutPreposition.value).toEqual([
		{
			source: wartenReading,
			relation: "governs",
			target: aufLemma,
			governedCase: "Acc",
			provenance: "direct",
		},
	]);
	expect(
		projectPrepositionalGovernment([
			{ reading: wartenReading, knowledge: {} },
			{ reading: wartenReading, knowledge: {} },
		]).success,
	).toBe(false);
});

const germanVerbReading = (canonicalForm: string, emojiDescription: string) =>
	({
		...wartenReading,
		lemma: { ...wartenReading.lemma, canonicalForm },
		emojiDescription,
	}) as const satisfies Dumling.Reading<"de", "Lexeme", "VERB">;
const wohnenReading = germanVerbReading("wohnen", "🏠");
const redenReading = germanVerbReading("reden", "💬");
const sprechenReading = germanVerbReading("sprechen", "📢");
const ueberAcc = { ...aufAcc, preposition: ueberLemma } as const;
const vonDat = {
	...aufAcc,
	preposition: vonLemma,
	governedCase: "Dat",
} as const;
const mitDat = { ...vonDat, preposition: mitLemma } as const;
const irgendwo = { kind: "Adverbial", standIn: "Irgendwo" } as const;
const irgendwie = { kind: "Adverbial", standIn: "Irgendwie" } as const;
const dassClause = { kind: "Clause", form: "Dass" } as const;
const obClause = { kind: "Clause", form: "Ob" } as const;
/** `reden` accumulated across encounters: `mit jM über jN` and `von jM`. */
const reden = [
	[nom, mitDat, ueberAcc],
	[nom, vonDat],
];

test("a complement the word takes is a concrete pattern whatever marks it", () => {
	// Sie wohnt bei ihrer Tante / Sie wohnt schön: concrete realized patterns.
	const wohnen = [
		[nom, irgendwo],
		[nom, irgendwo, irgendwie],
	];
	expect(
		parseReadingKnowledge({
			source: wohnenReading,
			knowledge: { valency: wohnen },
		}),
	).toEqual({ success: true, value: { valency: wohnen } });
	for (const invalid of [
		{ kind: "Adverbial", standIn: "Irgendwann" },
		{ ...irgendwo, referent: "Something" },
		{ kind: "Predicative", marker: "Wie" },
		{ kind: "Predicative" },
		{ kind: "Clause", form: "Wenn" },
		{ ...dassClause, correlate: "Required" },
	])
		expect(
			parseReadingKnowledge({
				source: wohnenReading,
				knowledge: { valency: [[invalid]] },
			}).success,
		).toBe(false);
});

test("distinct patterns accumulate cleanly, and double Acc is valid in one pattern", () => {
	expect(
		parseReadingKnowledge({
			source: redenReading,
			knowledge: { valency: reden },
		}),
	).toEqual({ success: true, value: { valency: reden } });
	expect(
		parseReadingKnowledge({
			source: redenReading,
			knowledge: { valency: [[]] },
		}).success,
	).toBe(false);
	// Same Preposition in two different patterns is valid (`mit jM`, `mit jM über jN`).
	expect(
		parseReadingKnowledge({
			source: redenReading,
			knowledge: {
				valency: [
					[nom, mitDat],
					[nom, mitDat, ueberAcc],
				],
			},
		}).success,
	).toBe(true);
	// Same Preposition twice inside one pattern is rejected.
	const twice = parseReadingKnowledge({
		source: redenReading,
		knowledge: { valency: [[nom, ueberAcc, ueberAcc]] },
	});
	expect(twice.success).toBe(false);
	if (!twice.success)
		expect(twice.error.issues[0]?.path).toEqual([
			"knowledge",
			"valency",
			0,
			2,
		]);
	// Double accusative (`jemanden etwas fragen`) holds two Acc complements in one pattern.
	const fragen = [
		[nom, acc],
		[nom, acc, acc],
		[nom, acc, obClause],
	];
	expect(
		parseReadingKnowledge({
			source: germanVerbReading("fragen", "❓"),
			knowledge: { valency: fragen },
		}),
	).toEqual({ success: true, value: { valency: fragen } });
});

test("an Adverbial, Predicative or Clause may recur in one pattern", () => {
	// Dass er kommt, bedeutet, dass sie geht: two dass-clauses in one pattern.
	const bedeuten = [[dassClause, dassClause]];
	expect(
		parseReadingKnowledge({
			source: germanVerbReading("bedeuten", "📖"),
			knowledge: { valency: bedeuten },
		}),
	).toEqual({ success: true, value: { valency: bedeuten } });
});

test("each German route allows its own complement kinds", () => {
	const allows = (source: Dumling.Reading, complement: unknown) =>
		parseReadingKnowledge({
			source,
			knowledge: { valency: [[complement]] },
		}).success;
	const predicative = { kind: "Predicative", marker: "None" } as const;
	const zuInfinitive = { kind: "Clause", form: "ZuInfinitive" } as const;
	for (const complement of [irgendwo, predicative, zuInfinitive])
		expect(allows(wartenReading, complement)).toBe(true);
	expect(allows(stolzReading, irgendwo)).toBe(true);
	expect(allows(stolzReading, dassClause)).toBe(true);
	expect(allows(stolzReading, predicative)).toBe(false);
	// Nouns take a Clause alone (`der Versuch, etw zu tun`) or with a da(r)- correlate (`die Freude darauf, dass …`).
	expect(allows(houseReading, zuInfinitive)).toBe(true);
	expect(
		parseReadingKnowledge({
			source: houseReading,
			knowledge: {
				valency: [[{ ...dassClause, preposition: aufLemma }]],
			},
		}).success,
	).toBe(true);
	expect(allows(houseReading, irgendwo)).toBe(false);
	expect(allows(houseReading, predicative)).toBe(false);
	expect(allows(houseReading, nom)).toBe(false);
});

test("a Clause may name its da(r)- correlate preposition as an ADP Lemma", () => {
	const achtenDass = [[nom, { ...dassClause, preposition: aufLemma }]];
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: { valency: achtenDass },
		}).success,
	).toBe(true);
	// Non-ADP or wrong-language preposition on a Clause is rejected.
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: {
				valency: [[{ ...dassClause, preposition: houseLemma }]],
			},
		}).success,
	).toBe(false);
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: {
				valency: [
					[
						{
							...dassClause,
							preposition: { ...aufLemma, language: "en" },
						},
					],
				],
			},
		}).success,
	).toBe(false);
});

test("Contribute adds unseen concrete patterns without losing earlier ones", () => {
	const contribute = (value: unknown) =>
		applyKnowledgeChange({
			source: redenReading,
			knowledge: { valency: [...reden] },
			change: { kind: "Contribute", aspect: "valency", value },
		});
	// Duplicate pattern is a no-op.
	expect(contribute([[nom, vonDat]])).toEqual({
		success: true,
		value: { valency: reden },
	});
	// A new combination (`mit jM von jM`) is added as its own concrete pattern.
	expect(contribute([[nom, mitDat, vonDat]])).toEqual({
		success: true,
		value: { valency: [...reden, [nom, mitDat, vonDat]] },
	});
	expect(
		applyKnowledgeChange({
			source: redenReading,
			knowledge: { valency: [...reden] },
			change: {
				kind: "Correct",
				aspect: "valency",
				value: [[nom, ueberAcc]],
			},
		}),
	).toEqual({
		success: true,
		value: { valency: [[nom, ueberAcc]] },
	});
});

test("every Preposition across accumulated patterns governs", () => {
	const vonReading = {
		unitKind: "Reading",
		lemma: vonLemma,
		emojiDescription: "🔙",
	} as const satisfies Dumling.Reading<"de", "Lexeme", "ADP">;
	const result = projectPrepositionalGovernment([
		{ reading: vonReading, knowledge: {} },
		{ reading: redenReading, knowledge: { valency: [...reden] } },
		{
			reading: sprechenReading,
			knowledge: { valency: [[nom, irgendwie]] },
		},
	]);
	expect(result.success).toBe(true);
	if (!result.success) return;
	expect(
		result.value
			.filter((edge) => edge.relation === "governs")
			.map((edge) => [edge.target, edge.governedCase]),
	).toEqual([
		[mitLemma, "Dat"],
		[vonLemma, "Dat"],
		[ueberLemma, "Acc"],
	]);
	expect(result.value).toContainEqual({
		source: vonReading,
		relation: "governedBy",
		target: redenReading,
		governedCase: "Dat",
		provenance: "inferred",
	});
});
