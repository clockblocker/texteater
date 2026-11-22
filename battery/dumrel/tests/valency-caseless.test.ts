/** Hebrew and English patterns: caseless, marked by function or position and preposition. */
import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge } from "dumrel";
import { projectPrepositionalGovernment } from "../src/project-prepositional-government.js";
import { alLemma, aufLemma, onLemma, wartenReading } from "./fixtures.js";

const nom = { kind: "Case", governedCase: "Nom" } as const;
const aufAcc = {
	kind: "Preposition",
	preposition: aufLemma,
	governedCase: "Acc",
} as const;

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
const subject = { kind: "Subject" } as const;
const al = {
	kind: "Preposition",
	preposition: alLemma,
} as const;

test("a Hebrew Reading holds a caseless pattern its Attestation realizes", () => {
	// סמך על: `הוא סמך על חבר`, with the governed על an owned member.
	expect(
		parseReadingKnowledge({
			source: samachReading,
			knowledge: { valency: [[subject, al]] },
		}),
	).toEqual({
		success: true,
		value: { valency: [[subject, al]] },
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
			{ member: 1, complement: al },
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

test("a Hebrew pattern takes only its route's Hebrew complements", () => {
	const germanCase = parseReadingKnowledge({
		source: samachReading,
		knowledge: { valency: [[nom]] },
	});
	expect(germanCase.success).toBe(false);
	if (!germanCase.success)
		expect(germanCase.error.issues[0]?.path).toEqual([
			"knowledge",
			"valency",
			0,
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
				knowledge: { valency: [[complement]] },
			} as never).success,
		).toBe(false);
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: { valency: [[subject]] },
		}).success,
	).toBe(false);
	// Hebrew nouns, like German ones, take only governed prepositions.
	expect(
		parseReadingKnowledge({
			source: todaReading,
			knowledge: { valency: [[al]] },
		}).success,
	).toBe(true);
	expect(
		parseReadingKnowledge({
			source: todaReading,
			knowledge: { valency: [[subject]] },
		}).success,
	).toBe(false);
});

test("a Hebrew Preposition pattern projects government with no case", () => {
	const result = projectPrepositionalGovernment([
		{
			reading: samachReading,
			knowledge: { valency: [[subject, al]] },
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
const directObject = { kind: "DirectObject" } as const;
const indirectObject = { kind: "IndirectObject" } as const;
const on = {
	kind: "Preposition",
	preposition: onLemma,
} as const;

test("an English Reading holds caseless patterns by position and preposition", () => {
	// give him a book: the first object is the IndirectObject.
	const give = [
		[subject, directObject],
		[subject, indirectObject, directObject],
	];
	expect(
		parseReadingKnowledge({
			source: giveReading,
			knowledge: { valency: give },
		}),
	).toEqual({ success: true, value: { valency: give } });
	const depend = [[subject, on]];
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
		[{ member: 1, complement: al }],
	])
		expect(
			parseUnit({ ...attestation, valencyEvidence: invalid }).success,
		).toBe(false);
	const { valencyEvidence: _, ...withoutEvidence } = attestation;
	expect(parseUnit(withoutEvidence).success).toBe(true);
});

test("an English pattern takes only its route's English complements", () => {
	const germanCase = parseReadingKnowledge({
		source: giveReading,
		knowledge: {
			valency: [[subject, { ...nom, governedCase: "Dat" }]],
		},
	} as never);
	expect(germanCase.success).toBe(false);
	if (!germanCase.success)
		expect(germanCase.error.issues[0]?.path).toEqual([
			"knowledge",
			"valency",
			0,
			1,
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
				knowledge: { valency: [[complement]] },
			} as never).success,
		).toBe(false);
	// Neither German nor Hebrew has an IndirectObject.
	for (const source of [wartenReading, samachReading])
		expect(
			parseReadingKnowledge({
				source,
				knowledge: { valency: [[indirectObject]] },
			} as never).success,
		).toBe(false);
});

test("an English Preposition pattern projects government with no case", () => {
	const result = projectPrepositionalGovernment([
		{
			reading: dependReading,
			knowledge: { valency: [[subject, on]] },
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
