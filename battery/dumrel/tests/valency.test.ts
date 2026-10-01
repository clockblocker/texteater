import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import {
	applyKnowledgeChange,
	parseReadingKnowledge,
	projectPrepositionalGovernment,
	selectKnowledge,
} from "dumrel";
import { governmentProjectionSchema } from "dumrel/schema";
import {
	alLemma,
	aufLemma,
	fuerLemma,
	houseLemma,
	houseReading,
	mitLemma,
	onLemma,
	ueberLemma,
	vonLemma,
	vorLemma,
	wartenReading,
} from "./fixtures.js";

const aufAcc = {
	kind: "Preposition",
	preposition: aufLemma,
	governedCase: "Acc",
	referent: "Either",
} as const;
const aufDat = { ...aufAcc, governedCase: "Dat" } as const;
/** A Slot of these complements, alternatives when there are several. */
const optional = <const C extends unknown[]>(...complements: C) =>
	({ status: "Optional", complements }) as const;
const required = <const C extends unknown[]>(...complements: C) =>
	({ status: "Required", complements }) as const;
const nom = { kind: "Case", governedCase: "Nom", referent: "Someone" } as const;

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
			numType: null,
			variant: null,
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
		knowledge: { valency: [required(nom), optional(aufAcc)] },
	});
	expect(parsed).toEqual({
		success: true,
		value: { valency: [required(nom), optional(aufAcc)] },
	});
	// `bestehen auf` + Dat: a governed preposition names any oblique case.
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: { valency: [optional(aufDat)] },
		}).success,
	).toBe(true);
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: {
				valency: [optional({ ...aufAcc, governedCase: "Nom" })],
			},
		}).success,
	).toBe(false);
	// The field is governedCase: Knowledge names no Feature Pool feature.
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: {
				valency: [
					optional({
						kind: "Preposition",
						preposition: aufLemma,
						case: "Acc",
						referent: "Either",
					}),
				],
			},
		}).success,
	).toBe(false);
});

test("a subjectless verb's frame has no Nom slot", () => {
	// `mir graut vor dem Winter`: the experiencer is a Dat slot, not a subject.
	const grauenReading = {
		...wartenReading,
		lemma: { ...wartenReading.lemma, canonicalForm: "grauen" },
		emojiDescription: "😨",
	} as const satisfies Dumling.Reading<"de", "Lexeme", "VERB">;
	const dat = {
		kind: "Case",
		governedCase: "Dat",
		referent: "Someone",
	} as const;
	const vorDat = { ...aufDat, preposition: vorLemma } as const;
	const valency = [required(dat), optional(vorDat)];
	expect(
		parseReadingKnowledge({
			source: grauenReading,
			knowledge: { valency },
		}),
	).toEqual({ success: true, value: { valency } });
});

// Which cases a preposition takes is a fact about German: dumspec checks
// frames against its ADP Case Table (ADR 0041).
test("Dumrel leaves a preposition's case to dumspec's ADP Case Table", () => {
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: {
				valency: [
					optional({
						...aufAcc,
						preposition: fuerLemma,
						governedCase: "Dat",
					}),
				],
			},
		}).success,
	).toBe(true);
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: {
				valency: [optional({ ...aufAcc, preposition: fuerLemma })],
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
				knowledge: { valency: [optional({ ...aufAcc, preposition })] },
			}).success,
		).toBe(false);
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: {
				valency: [optional({ ...aufAcc, governedCase: "Nom" })],
			},
		}).success,
	).toBe(false);
});

test("each route allows its own complements, and lists each once", () => {
	const noun = parseReadingKnowledge({
		source: houseReading,
		knowledge: { valency: [optional(nom)] },
	});
	expect(noun.success).toBe(false);
	if (!noun.success)
		expect(noun.error.issues[0]?.path).toEqual([
			"knowledge",
			"valency",
			0,
			"complements",
			0,
			"kind",
		]);
	expect(
		parseReadingKnowledge({
			source: houseReading,
			knowledge: { valency: [optional(aufAcc)] },
		}).success,
	).toBe(true);
	expect(
		parseReadingKnowledge({
			source: aufReading,
			knowledge: { valency: [optional(aufAcc)] },
		}).success,
	).toBe(false);
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: { valency: [optional(aufAcc), required(aufAcc)] },
		}).success,
	).toBe(false);
	// A preposition counts without case, as Lemma identity does (system ADR 0002).
	const shouted = {
		...aufAcc,
		preposition: { ...aufAcc.preposition, canonicalForm: "AUF" },
	};
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: { valency: [optional(aufAcc), required(shouted)] },
		}).success,
	).toBe(false);
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { valency: [optional(aufAcc)] },
			change: { kind: "Retract", aspect: "valency", complement: shouted },
		}),
	).toEqual({ success: true, value: {} });
});

test("Contribute adds missing Slots, Correct replaces the frame, Retract removes a Slot or the frame", () => {
	const someone = { ...aufAcc, referent: "Someone" } as const;
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { valency: [required(nom), optional(someone)] },
			change: {
				kind: "Contribute",
				aspect: "valency",
				value: [optional(aufAcc), optional(aufDat)],
			},
		}),
	).toEqual({
		success: true,
		value: {
			valency: [required(nom), optional(someone), optional(aufDat)],
		},
	});
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { valency: [optional(aufAcc)] },
			change: {
				kind: "Correct",
				aspect: "valency",
				value: [required(aufAcc)],
			},
		}),
	).toEqual({ success: true, value: { valency: [required(aufAcc)] } });
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { valency: [required(nom), optional(aufAcc)] },
			change: { kind: "Retract", aspect: "valency", complement: aufAcc },
		}),
	).toEqual({ success: true, value: { valency: [required(nom)] } });
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { definition: "x", valency: [optional(aufAcc)] },
			change: { kind: "Retract", aspect: "valency", complement: aufAcc },
		}),
	).toEqual({ success: true, value: { definition: "x" } });
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { definition: "x", valency: [optional(aufDat)] },
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
				optional({
					...aufAcc,
					preposition: fuerLemma,
					governedCase: "Nom",
				}),
			],
		},
	});
	expect(invalid.success).toBe(false);
});

test("German governors request valency; other Kinds do not", () => {
	for (const [family, kind, expected] of [
		["Lexeme", "VERB", true],
		["Lexeme", "ADJ", true],
		["Lexeme", "NOUN", true],
		["Locution", "VERB", true],
		["Locution", "ADJ", true],
		["Locution", "NOUN", true],
		["Locution", "ADV", false],
		["Saying", "Saying", false],
		["Lexeme", "ADP", false],
		["Lexeme", "ADV", false],
		["Lexeme", "DET", false],
		["Morpheme", "Root", false],
	] as const) {
		const selected = selectKnowledge({
			route: { language: "de", family, kind } as never,
		});
		expect(selected.success).toBe(true);
		if (selected.success)
			expect(Object.hasOwn(selected.value, "valency")).toBe(expected);
	}
	const disabled = selectKnowledge({
		route: { language: "de", family: "Lexeme", kind: "VERB" },
		settings: { valency: false },
	});
	expect(disabled.success && disabled.value).not.toHaveProperty("valency");
});

test("projection reads Preposition Slots and infers the preposition side", () => {
	const result = projectPrepositionalGovernment([
		{ reading: aufReading, knowledge: {} },
		{
			reading: wartenReading,
			knowledge: { valency: [required(nom), optional(aufAcc)] },
		},
		{ reading: stolzReading, knowledge: { valency: [optional(aufAcc)] } },
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
			knowledge: { valency: [optional(aufAcc)] },
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
/** `reden`: Optional `über` + Acc | `von` + Dat, with `mit` + Dat beside it. */
const reden = [required(nom), optional(mitDat), optional(ueberAcc, vonDat)];

test("a complement the word requires is a Slot whatever marks it", () => {
	// Sie wohnt bei ihrer Tante: the place is required, its preposition free.
	const wohnen = [required(nom), required(irgendwo), optional(irgendwie)];
	expect(
		parseReadingKnowledge({
			source: wohnenReading,
			knowledge: { valency: wohnen },
		}),
	).toEqual({ success: true, value: { valency: wohnen } });
	for (const invalid of [
		{ kind: "Adverbial", standIn: "Irgendwann" },
		{ ...irgendwo, referent: "Something" },
		{ kind: "Predicative", of: "Subject", marker: "Wie" },
		{ kind: "Predicative", of: "Subject" },
		{ kind: "Clause", form: "Wenn" },
		{ ...dassClause, correlate: "Never" },
	])
		expect(
			parseReadingKnowledge({
				source: wohnenReading,
				knowledge: { valency: [required(invalid)] },
			}).success,
		).toBe(false);
});

test("a Slot holds alternatives, and a complement sits in one Slot at most", () => {
	expect(
		parseReadingKnowledge({
			source: redenReading,
			knowledge: { valency: reden },
		}),
	).toEqual({ success: true, value: { valency: reden } });
	expect(
		parseReadingKnowledge({
			source: redenReading,
			knowledge: { valency: [optional()] },
		}).success,
	).toBe(false);
	const twice = parseReadingKnowledge({
		source: redenReading,
		knowledge: { valency: [...reden, optional(ueberAcc)] },
	});
	expect(twice.success).toBe(false);
	if (!twice.success)
		expect(twice.error.issues[0]?.path).toEqual([
			"knowledge",
			"valency",
			3,
			"complements",
			0,
		]);
	expect(
		parseReadingKnowledge({
			source: redenReading,
			knowledge: { valency: [optional(ueberAcc, vonDat, ueberAcc)] },
		}).success,
	).toBe(false);
	// A Case complement too: its referent tells it apart (jemanden etwas
	// lehren), so only an exact repeat is rejected.
	const accSomeone = { ...nom, governedCase: "Acc" } as const;
	const accSomething = { ...accSomeone, referent: "Something" } as const;
	expect(
		parseReadingKnowledge({
			source: redenReading,
			knowledge: {
				valency: [
					required(nom),
					required(accSomeone),
					required(accSomething),
				],
			},
		}).success,
	).toBe(true);
	expect(
		parseReadingKnowledge({
			source: redenReading,
			knowledge: {
				valency: [
					required(nom),
					required(accSomeone),
					optional(accSomeone),
				],
			},
		}).success,
	).toBe(false);
});

test("an Adverbial, Predicative or Clause may recur in another Slot, never in its own", () => {
	// Dass er kommt, bedeutet, dass sie geht: a dass-clause in both the Nom and
	// the Acc Slot of bedeuten.
	const bedeuten = [
		required(nom, dassClause),
		required(
			{ ...nom, governedCase: "Acc", referent: "Something" },
			dassClause,
		),
	];
	expect(
		parseReadingKnowledge({
			source: germanVerbReading("bedeuten", "📖"),
			knowledge: { valency: bedeuten },
		}),
	).toEqual({ success: true, value: { valency: bedeuten } });
	const twoPlaces = [required(nom), required(irgendwo), optional(irgendwo)];
	expect(
		parseReadingKnowledge({
			source: wohnenReading,
			knowledge: { valency: twoPlaces },
		}),
	).toEqual({ success: true, value: { valency: twoPlaces } });
	const predicative = {
		kind: "Predicative",
		of: "Subject",
		marker: "None",
	} as const;
	for (const complement of [dassClause, irgendwo, predicative]) {
		const repeated = parseReadingKnowledge({
			source: wohnenReading,
			knowledge: {
				valency: [required(nom), required(complement, complement)],
			},
		});
		expect(repeated.success).toBe(false);
		if (!repeated.success)
			expect(repeated.error.issues[0]?.path).toEqual([
				"knowledge",
				"valency",
				1,
				"complements",
				1,
			]);
	}
});

test("each German route allows its own complement kinds", () => {
	const allows = (source: Dumling.Reading, complement: unknown) =>
		parseReadingKnowledge({
			source,
			knowledge: { valency: [optional(complement)] },
		}).success;
	const predicative = {
		kind: "Predicative",
		of: "Subject",
		marker: "None",
	} as const;
	const zuInfinitive = { kind: "Clause", form: "ZuInfinitive" } as const;
	// Verbs take every German kind: a copula's Predicative of its subject.
	for (const complement of [irgendwo, predicative, zuInfinitive])
		expect(allows(wartenReading, complement)).toBe(true);
	// Adjectives take all but Predicative.
	expect(allows(stolzReading, irgendwo)).toBe(true);
	expect(allows(stolzReading, dassClause)).toBe(true);
	expect(allows(stolzReading, predicative)).toBe(false);
	// Nouns take a Clause, alone (der Versuch, etw zu tun) or beside a
	// Preposition (die Freude darauf, dass …), and no other markerless kind.
	expect(allows(houseReading, zuInfinitive)).toBe(true);
	expect(
		parseReadingKnowledge({
			source: houseReading,
			knowledge: {
				valency: [
					optional(aufAcc, { ...dassClause, correlate: "Required" }),
				],
			},
		}).success,
	).toBe(true);
	expect(allows(houseReading, irgendwo)).toBe(false);
	expect(allows(houseReading, predicative)).toBe(false);
	expect(allows(houseReading, nom)).toBe(false);
});

test("a Clause with a correlate takes its da(r)- from the Slot's one Preposition", () => {
	// sich freuen auf: auf + Acc | dass-clause with a Required darauf.
	const freuenAuf = [
		required(nom),
		required(aufAcc, { ...dassClause, correlate: "Required" }),
	];
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: { valency: freuenAuf },
		}).success,
	).toBe(true);
	// freuen 'please': a subject clause in the Nom Slot, its es Optional.
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: {
				valency: [
					required(nom, { ...dassClause, correlate: "Optional" }),
					required({ ...nom, governedCase: "Acc" }),
				],
			},
		}).success,
	).toBe(true);
	const ambiguous = parseReadingKnowledge({
		source: redenReading,
		knowledge: {
			valency: [
				required(nom),
				optional(ueberAcc, vonDat, {
					...dassClause,
					correlate: "Required",
				}),
			],
		},
	});
	expect(ambiguous.success).toBe(false);
	if (!ambiguous.success)
		expect(ambiguous.error.issues[0]?.path).toEqual([
			"knowledge",
			"valency",
			1,
			"complements",
			2,
			"correlate",
		]);
	// Without a correlate, the clause names no preposition.
	expect(
		parseReadingKnowledge({
			source: redenReading,
			knowledge: {
				valency: [
					required(nom),
					optional(ueberAcc, vonDat, dassClause),
				],
			},
		}).success,
	).toBe(true);
});

test("Contribute never groups alternatives, and Retract empties a Slot one complement at a time", () => {
	const contribute = (value: unknown) =>
		applyKnowledgeChange({
			source: redenReading,
			knowledge: { valency: [...reden] },
			change: { kind: "Contribute", aspect: "valency", value },
		});
	expect(contribute([optional(vonDat)])).toEqual({
		success: true,
		value: { valency: reden },
	});
	// A contributed Slot is added whole or not at all.
	expect(contribute([optional(ueberAcc, { ...aufAcc })])).toEqual({
		success: true,
		value: { valency: reden },
	});
	expect(contribute([optional(aufAcc)])).toEqual({
		success: true,
		value: { valency: [...reden, optional(aufAcc)] },
	});
	expect(contribute([optional(irgendwo)])).toEqual({
		success: true,
		value: { valency: [...reden, optional(irgendwo)] },
	});
	const retract = (knowledge: unknown, complement: unknown) =>
		applyKnowledgeChange({
			source: redenReading,
			knowledge: knowledge as never,
			change: { kind: "Retract", aspect: "valency", complement },
		});
	const withoutUeber = [required(nom), optional(mitDat), optional(vonDat)];
	expect(retract({ valency: reden }, ueberAcc)).toEqual({
		success: true,
		value: { valency: withoutUeber },
	});
	expect(retract({ valency: withoutUeber }, vonDat)).toEqual({
		success: true,
		value: { valency: [required(nom), optional(mitDat)] },
	});
	expect(retract({ valency: [optional(vonDat)] }, vonDat)).toEqual({
		success: true,
		value: {},
	});
	expect(
		applyKnowledgeChange({
			source: redenReading,
			knowledge: { valency: [...reden] },
			change: {
				kind: "Correct",
				aspect: "valency",
				value: [required(nom), optional(ueberAcc)],
			},
		}),
	).toEqual({
		success: true,
		value: { valency: [required(nom), optional(ueberAcc)] },
	});
});

test("every Preposition alternative governs", () => {
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
			knowledge: { valency: [required(nom), optional(irgendwie)] },
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

const samachLemma = {
	unitKind: "Lemma",
	language: "he",
	family: "Lexeme",
	kind: "VERB",
	canonicalForm: "סמך",
	coreFeatures: { hebBinyan: "PAAL", hebExistential: null },
} as const satisfies Dumling.Lemma<"he", "Lexeme", "VERB">;
const samachReading = {
	unitKind: "Reading",
	lemma: samachLemma,
	emojiDescription: "🤝",
} as const satisfies Dumling.Reading<"he", "Lexeme", "VERB">;
const todaReading = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "he",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "תודה",
		coreFeatures: { abbr: null, gender: "Fem" },
	},
	emojiDescription: "🙏",
} as const satisfies Dumling.Reading<"he", "Lexeme", "NOUN">;
const subject = { kind: "Subject", referent: "Someone" } as const;
const al = {
	kind: "Preposition",
	preposition: alLemma,
	referent: "Either",
} as const;

test("a Hebrew Reading holds a caseless frame its Attestation realizes", () => {
	// סמך על: `הוא סמך על חבר`, with the governed על an owned member.
	expect(
		parseReadingKnowledge({
			source: samachReading,
			knowledge: { valency: [required(subject), required(al)] },
		}),
	).toEqual({
		success: true,
		value: { valency: [required(subject), required(al)] },
	});
	const attestation = {
		unitKind: "Attestation",
		members: [
			{ attested: "סמך", orthography: "Standard" },
			{ attested: "על", orthography: "Standard" },
		],
		realizationCoverage: "Full",
		surface: {
			unitKind: "Surface",
			language: "he",
			normalizedSurface: "סמך",
			spelling: { kind: "Canonical" },
			inflectionalFeatures: {
				gender: "Masc",
				number: "Sing",
				person: "3",
				tense: "Past",
				voice: "Act",
				definite: null,
				mood: null,
				polarity: null,
				verbForm: null,
			},
			lemma: samachLemma,
			surfaceFeatures: null,
		},
		valencyEvidence: [
			{ member: null, complement: subject },
			{ member: 1, complement: al },
		],
	} satisfies Dumling.Attestation<"he", "Lexeme", "VERB">;
	expect(parseUnit(attestation).success).toBe(true);
	for (const invalid of [
		[{ member: 0, complement: al }],
		[{ member: 2, complement: al }],
		[{ member: 1, complement: subject }],
		[
			{ member: 1, complement: al },
			{ member: 1, complement: { ...al, referent: "Someone" } },
		],
		[{ member: 1, complement: { ...al, governedCase: "Acc" } }],
		[{ member: 1, complement: al, realizedCase: "Acc" }],
	])
		expect(
			parseUnit({ ...attestation, valencyEvidence: invalid }).success,
		).toBe(false);
	const { valencyEvidence: _, ...withoutEvidence } = attestation;
	expect(parseUnit(withoutEvidence).success).toBe(true);
});

test("a Hebrew frame takes only its route's Hebrew complements", () => {
	const germanCase = parseReadingKnowledge({
		source: samachReading,
		knowledge: { valency: [required(nom)] },
	});
	expect(germanCase.success).toBe(false);
	if (!germanCase.success)
		expect(germanCase.error.issues[0]?.path).toEqual([
			"knowledge",
			"valency",
			0,
			"complements",
			0,
			"kind",
		]);
	for (const complement of [
		aufAcc,
		{ ...al, governedCase: "Acc" },
		{ kind: "Adverbial", standIn: "Irgendwo" },
		{ ...al, preposition: { ...alLemma, language: "de" } },
	] as unknown[])
		expect(
			parseReadingKnowledge({
				source: samachReading,
				knowledge: { valency: [optional(complement)] },
			} as never).success,
		).toBe(false);
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: { valency: [required(subject)] },
		}).success,
	).toBe(false);
	// Hebrew nouns, like German ones, take only governed prepositions.
	expect(
		parseReadingKnowledge({
			source: todaReading,
			knowledge: { valency: [optional(al)] },
		}).success,
	).toBe(true);
	expect(
		parseReadingKnowledge({
			source: todaReading,
			knowledge: { valency: [optional(subject)] },
		}).success,
	).toBe(false);
});

test("a Hebrew Preposition Slot projects government with no case", () => {
	const result = projectPrepositionalGovernment([
		{
			reading: samachReading,
			knowledge: { valency: [required(subject), required(al)] },
		},
	]);
	expect(result.success && result.value).toEqual([
		{
			source: samachReading,
			relation: "governs",
			target: alLemma,
			governedCase: null,
			provenance: "direct",
		},
	]);
});

const englishVerbReading = (canonicalForm: string, emojiDescription: string) =>
	({
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "en",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm,
			coreFeatures: {
				abbr: null,
				extPos: null,
				phrasal: null,
			},
		},
		emojiDescription,
	}) as const satisfies Dumling.Reading<"en", "Lexeme", "VERB">;
const giveReading = englishVerbReading("give", "🎁");
const dependReading = englishVerbReading("depend", "🤝");
const directObject = { kind: "DirectObject", referent: "Something" } as const;
const indirectObject = { kind: "IndirectObject", referent: "Someone" } as const;
const on = {
	kind: "Preposition",
	preposition: onLemma,
	referent: "Something",
} as const;

test("an English Reading holds a caseless frame by position and preposition", () => {
	// give him a book: the first object is the IndirectObject.
	const give = [
		required(subject),
		required(directObject),
		optional(indirectObject),
	];
	expect(
		parseReadingKnowledge({
			source: giveReading,
			knowledge: { valency: give },
		}),
	).toEqual({ success: true, value: { valency: give } });
	const depend = [required(subject), required(on)];
	expect(
		parseReadingKnowledge({
			source: dependReading,
			knowledge: { valency: depend },
		}),
	).toEqual({ success: true, value: { valency: depend } });
	// We depend on accurate labels: the governed on is an owned member.
	const attestation = {
		unitKind: "Attestation",
		members: [
			{ attested: "depend", orthography: "Standard" },
			{ attested: "on", orthography: "Standard" },
		],
		realizationCoverage: "Full",
		surface: {
			unitKind: "Surface",
			language: "en",
			normalizedSurface: "depend",
			spelling: { kind: "Canonical" },
			inflectionalFeatures: null,
			lemma: dependReading.lemma,
			surfaceFeatures: null,
		},
		valencyEvidence: [
			{ member: null, complement: subject },
			{ member: 1, complement: on },
		],
	} satisfies Dumling.Attestation<"en", "Lexeme", "VERB">;
	expect(parseUnit(attestation).success).toBe(true);
	// A sentence-initial On still spells on.
	expect(
		parseUnit({
			...attestation,
			members: [
				attestation.members[0],
				{ attested: "On", orthography: "Standard" },
			],
		}).success,
	).toBe(true);
	for (const invalid of [
		[{ member: 0, complement: on }],
		[{ member: 1, complement: indirectObject }],
		[{ member: 1, complement: { ...on, governedCase: "Acc" } }],
		[{ member: 1, complement: on, realizedCase: "Acc" }],
		[{ member: 1, complement: { ...al, referent: "Something" } }],
	])
		expect(
			parseUnit({ ...attestation, valencyEvidence: invalid }).success,
		).toBe(false);
	const { valencyEvidence: _, ...withoutEvidence } = attestation;
	expect(parseUnit(withoutEvidence).success).toBe(true);
});

test("an English frame takes only its route's English complements", () => {
	const germanCase = parseReadingKnowledge({
		source: giveReading,
		knowledge: {
			valency: [
				required(subject),
				optional({ ...nom, governedCase: "Dat" }),
			],
		},
	} as never);
	expect(germanCase.success).toBe(false);
	if (!germanCase.success)
		expect(germanCase.error.issues[0]?.path).toEqual([
			"knowledge",
			"valency",
			1,
			"complements",
			0,
			"kind",
		]);
	for (const complement of [
		aufAcc,
		al,
		{ ...on, governedCase: "Acc" },
		{ kind: "Clause", form: "Dass" },
		{ ...on, preposition: { ...onLemma, language: "de" } },
	] as unknown[])
		expect(
			parseReadingKnowledge({
				source: dependReading,
				knowledge: { valency: [optional(complement)] },
			} as never).success,
		).toBe(false);
	// Neither German nor Hebrew has an IndirectObject.
	for (const source of [wartenReading, samachReading])
		expect(
			parseReadingKnowledge({
				source,
				knowledge: { valency: [optional(indirectObject)] },
			} as never).success,
		).toBe(false);
});

test("an English Preposition Slot projects government with no case", () => {
	const result = projectPrepositionalGovernment([
		{
			reading: dependReading,
			knowledge: { valency: [required(subject), required(on)] },
		},
	]);
	expect(result.success && result.value).toEqual([
		{
			source: dependReading,
			relation: "governs",
			target: onLemma,
			governedCase: null,
			provenance: "direct",
		},
	]);
});
