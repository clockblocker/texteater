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
	onLemma,
	vorLemma,
	wartenReading,
} from "./fixtures.js";

const aufAcc = {
	kind: "Preposition",
	preposition: aufLemma,
	case: "Acc",
	referent: "Either",
} as const;
const aufDat = { ...aufAcc, case: "Dat" } as const;
const optional = <C>(complement: C) =>
	({ status: "Optional", complement }) as const;
const required = <C>(complement: C) =>
	({ status: "Required", complement }) as const;
const nom = { kind: "Case", case: "Nom", referent: "Someone" } as const;

const stolzReading = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADJ",
		canonicalForm: "stolz",
		coreFeatures: {
			abbr: null,
			comparable: "Yes",
			foreign: null,
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
			knowledge: { valency: [optional({ ...aufAcc, case: "Nom" })] },
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
	const dat = { kind: "Case", case: "Dat", referent: "Someone" } as const;
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
						case: "Dat",
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
			knowledge: { valency: [optional({ ...aufAcc, case: "Nom" })] },
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
			"complement",
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
				optional({ ...aufAcc, preposition: fuerLemma, case: "Nom" }),
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
		case: "Acc",
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
			case: "Acc",
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
		[{ member: 1, complement: { ...al, case: "Acc" } }],
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
			"complement",
			"kind",
		]);
	for (const complement of [
		aufAcc,
		{ ...al, case: "Acc" },
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
			case: null,
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
		[{ member: 1, complement: { ...on, case: "Acc" } }],
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
			valency: [required(subject), optional({ ...nom, case: "Dat" })],
		},
	} as never);
	expect(germanCase.success).toBe(false);
	if (!germanCase.success)
		expect(germanCase.error.issues[0]?.path).toEqual([
			"knowledge",
			"valency",
			1,
			"complement",
			"kind",
		]);
	for (const complement of [
		aufAcc,
		al,
		{ ...on, case: "Acc" },
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
			case: null,
			provenance: "direct",
		},
	]);
});
