import { expect, test } from "bun:test";
import { parseUnit } from "../src/index.js";
import { noun, verb } from "./composition-fixtures.js";

const preposition = (canonicalForm: string) => ({
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "ADP",
	canonicalForm,
	coreFeatures: {},
});
test("valency evidence names the owned member realizing its preposition", () => {
	const slot = {
		member: 1,
		complement: {
			kind: "Preposition",
			preposition: preposition("auf"),
			governedCase: "Acc",
			referent: "Something",
		},
		realizedCase: "Acc",
	};
	const attestation = {
		unitKind: "Attestation",
		surface: {
			...verb,
			normalizedSurface: "wartet",
			inflectionalFeatures: {
				...verb.inflectionalFeatures,
				expletive: null,
			},
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "wartet", orthography: "Standard" },
			{ attested: "auf", orthography: "Standard" },
		],
		expletiveEvidence: null,
		valencyEvidence: [slot],
	};
	expect(parseUnit(attestation).success).toBe(true);
	for (const valid of [[], [{ ...slot, member: null }]])
		expect(
			parseUnit({ ...attestation, valencyEvidence: valid }).success,
		).toBe(true);
	for (const invalid of [
		[{ ...slot, member: 0 }],
		[{ ...slot, member: 2 }],
		[slot, slot],
		[{ ...slot, realizedCase: "Dat" }],
		[
			{
				...slot,
				complement: {
					...slot.complement,
					preposition: preposition("für"),
				},
			},
		],
		[
			{
				...slot,
				complement: {
					kind: "Case",
					governedCase: "Dat",
					referent: "Someone",
				},
			},
		],
	])
		expect(
			parseUnit({ ...attestation, valencyEvidence: invalid }).success,
		).toBe(false);
	expect(
		parseUnit({
			...attestation,
			members: [
				{ attested: "wartet", orthography: "Standard" },
				{ attested: "uaf", orthography: "Typo" },
			],
		}).success,
	).toBe(true);
	// The member spells its preposition without regard to case.
	expect(
		parseUnit({
			...attestation,
			members: [
				{ attested: "wartet", orthography: "Standard" },
				{ attested: "Auf", orthography: "Standard" },
			],
		}).success,
	).toBe(true);
});
test("a German pronominal adverb spells the preposition it holds", () => {
	const slotFor = (canonicalForm: string) => ({
		member: 1,
		complement: {
			kind: "Preposition",
			preposition: preposition(canonicalForm),
			governedCase: "Dat",
			referent: "Something",
		},
		realizedCase: "Dat",
	});
	const attestation = (attested: string, canonicalForm: string) => ({
		unitKind: "Attestation",
		surface: {
			...verb,
			normalizedSurface: "wartet",
			inflectionalFeatures: {
				...verb.inflectionalFeatures,
				expletive: null,
			},
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "wartet", orthography: "Standard" },
			{ attested, orthography: "Standard" },
		],
		expletiveEvidence: null,
		valencyEvidence: [slotFor(canonicalForm)],
	});
	for (const [attested, canonicalForm] of [
		["damit", "mit"],
		["Damit", "mit"],
		["darauf", "auf"],
		["wovon", "von"],
		["worüber", "über"],
		["hiermit", "mit"],
		["hierauf", "auf"],
	] as const)
		expect(parseUnit(attestation(attested, canonicalForm)).success).toBe(
			true,
		);
	for (const [attested, canonicalForm] of [
		["daauf", "auf"],
		["darmit", "mit"],
		["womit", "auf"],
		["somit", "mit"],
		["dahin", "in"],
	] as const)
		expect(parseUnit(attestation(attested, canonicalForm)).success).toBe(
			false,
		);
});
// Evidence is a strict subset of the frame vocabulary, and an Attestation names
// no Feature Pool feature (ADR 0034, ADR 0032).
test("valency evidence names only Case and Preposition complements, by their governedCase", () => {
	const attestation = {
		unitKind: "Attestation",
		surface: {
			...verb,
			normalizedSurface: "wartet",
			inflectionalFeatures: {
				...verb.inflectionalFeatures,
				expletive: null,
			},
		},
		realizationCoverage: "Full",
		members: [{ attested: "wartet", orthography: "Standard" }],
		expletiveEvidence: null,
		valencyEvidence: [],
	};
	const evidence = (complement: unknown) => ({
		...attestation,
		valencyEvidence: [{ member: null, complement, realizedCase: "Nom" }],
	});
	expect(
		parseUnit(
			evidence({
				kind: "Case",
				governedCase: "Nom",
				referent: "Someone",
			}),
		).success,
	).toBe(true);
	for (const complement of [
		{ kind: "Case", case: "Nom", referent: "Someone" },
		{ kind: "Adverbial", standIn: "Irgendwo" },
		{ kind: "Predicative", of: "Subject", marker: "None" },
		{ kind: "Clause", form: "Dass" },
		{ kind: "Clause", form: "ZuInfinitive", correlate: "Optional" },
	])
		expect(parseUnit(evidence(complement)).success).toBe(false);
});
// Which cases a preposition takes, and whether the ADP Case Table lists it at
// all, is checked in dumcorpus (ADR 0041): Dumling consults no table.
test("a governor's preposition slot passes Dumling in any oblique case, listed or not", () => {
	const attestation = (canonicalForm: string, grammaticalCase: string) => ({
		unitKind: "Attestation",
		surface: {
			...verb,
			normalizedSurface: "wartet",
			inflectionalFeatures: {
				...verb.inflectionalFeatures,
				expletive: null,
			},
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "wartet", orthography: "Standard" },
			{ attested: canonicalForm, orthography: "Standard" },
		],
		expletiveEvidence: null,
		valencyEvidence: [
			{
				member: 1,
				complement: {
					kind: "Preposition",
					preposition: preposition(canonicalForm),
					governedCase: grammaticalCase,
					referent: "Either",
				},
				realizedCase: grammaticalCase,
			},
		],
	});
	expect(parseUnit(attestation("auf", "Acc")).success).toBe(true);
	expect(parseUnit(attestation("auf", "Dat")).success).toBe(true);
	expect(parseUnit(attestation("für", "Acc")).success).toBe(true);
	expect(parseUnit(attestation("für", "Dat")).success).toBe(true);
	expect(parseUnit(attestation("à", "Dat")).success).toBe(true);
	expect(parseUnit(attestation("für", "Nom")).success).toBe(false);
});

// A free ADP occurrence records the case its complement took (ADR 0034).
const adpAttestation = (
	attested: string,
	canonicalForm: string,
	realizedCase: string | null,
) => ({
	unitKind: "Attestation",
	members: [{ attested, orthography: "Standard" }],
	realizationCoverage: "Full",
	valencyEvidence:
		realizedCase === null
			? []
			: [
					{
						member: null,
						complement: {
							kind: "Case",
							governedCase: realizedCase,
							referent: "Either",
						},
						realizedCase,
					},
				],
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: canonicalForm,
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		lemma: preposition(canonicalForm),
	},
});
// Which cases an ADP takes, and whether the ADP Case Table lists it at all, is
// checked in dumcorpus (ADR 0041): Dumling consults no table.
test("an ADP Attestation's realized case passes Dumling in any oblique case, listed or not", () => {
	for (const [attested, canonicalForm, realizedCase] of [
		["auf", "auf", "Dat"],
		["auf", "auf", "Acc"],
		["Wegen", "wegen", "Dat"],
		["wegen", "wegen", "Gen"],
		["entlang", "entlang", "Acc"],
		["Entlang", "entlang", "Gen"],
		["in", "in", "Dat"],
		["Anstatt", "anstatt", null],
		["versus", "versus", "Acc"],
		["à", "à", "Dat"],
		["für", "für", "Dat"],
		["auf", "auf", "Gen"],
	] as const)
		expect(
			parseUnit(adpAttestation(attested, canonicalForm, realizedCase))
				.success,
		).toBe(true);
	expect(parseUnit(adpAttestation("auf", "auf", "Nom")).success).toBe(false);
	const valid = adpAttestation("auf", "auf", "Dat");
	const [slot] = valid.valencyEvidence;
	for (const invalid of [
		[slot, slot],
		[{ ...slot, member: 0 }],
		[{ ...slot, realizedCase: "Acc" }],
	])
		expect(parseUnit({ ...valid, valencyEvidence: invalid }).success).toBe(
			false,
		);
	const { valencyEvidence: _, ...missing } = valid;
	expect(parseUnit(missing).success).toBe(false);
});
// Where an adposition stands is not identity, and the sentence shows it, so
// neither the Lemma nor the Attestation records it (ADR 0032).
test("a German ADP records its position on neither its Lemma nor its Attestation", () => {
	const wegen = adpAttestation("wegen", "wegen", "Gen");
	expect(parseUnit(wegen).success).toBe(true);
	for (const retired of [
		{ adpType: "Post" },
		{ adpType: "Circ" },
		{ extPos: "ADV" },
		{ partType: "Vbp" },
	])
		expect(
			parseUnit({
				...wegen,
				surface: {
					...wegen.surface,
					lemma: {
						...wegen.surface.lemma,
						coreFeatures: { ...retired },
					},
				},
			}).success,
		).toBe(false);
	for (const adpType of ["Prep", "Post"])
		expect(parseUnit({ ...wegen, adpType }).success).toBe(false);
});
// A Locution ADP records its complement's case as a Lexeme ADP does, and no
// position: its words are its Canonical Form (ADR 0039).
test("a Locution ADP Attestation records at most one bare-case slot", () => {
	const willen = (realizedCase: string | null) => ({
		unitKind: "Attestation",
		members: [
			{ attested: "Um", orthography: "Standard" },
			{ attested: "willen", orthography: "Standard" },
		],
		realizationCoverage: "Full",
		valencyEvidence:
			realizedCase === null
				? []
				: [
						{
							member: null,
							complement: {
								kind: "Case",
								governedCase: realizedCase,
								referent: "Either",
							},
							realizedCase,
						},
					],
		surface: {
			unitKind: "Surface",
			language: "de",
			normalizedSurface: "um … willen",
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family: "Locution",
				kind: "ADP",
				canonicalForm: "um … willen",
				coreFeatures: {},
			},
		},
	});
	// The Case Table's Gen is dumcorpus's to check; Dumling takes any oblique case.
	for (const realizedCase of ["Gen", "Dat", null])
		expect(parseUnit(willen(realizedCase)).success).toBe(true);
	expect(parseUnit(willen("Nom")).success).toBe(false);
	const valid = willen("Gen");
	const [slot] = valid.valencyEvidence;
	for (const invalid of [
		[slot, slot],
		[{ ...slot, member: 0 }],
		[{ ...slot, realizedCase: "Acc" }],
	])
		expect(parseUnit({ ...valid, valencyEvidence: invalid }).success).toBe(
			false,
		);
	const { valencyEvidence: _, ...missing } = valid;
	expect(parseUnit(missing).success).toBe(false);
	expect(parseUnit({ ...valid, adpType: "Circ" }).success).toBe(false);
});
test("an adjective or noun Attestation names its owned governed preposition like a verb", () => {
	const auf = preposition("auf");
	const slot = {
		member: 0,
		complement: {
			kind: "Preposition",
			preposition: auf,
			governedCase: "Acc",
			referent: "Someone",
		},
		realizedCase: "Acc",
	};
	// Auf ihn bin ich stolz: the governed auf stands apart from its adjective.
	const adjective = {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "de",
			normalizedSurface: "stolz",
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
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
			inflectionalFeatures: {
				case: null,
				degree: "Pos",
				gender: null,
				number: null,
			},
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "Auf", orthography: "Standard" },
			{ attested: "stolz", orthography: "Standard" },
		],
		articleEvidence: null,
		valencyEvidence: [slot],
	};
	expect(parseUnit(adjective).success).toBe(true);
	expect(parseUnit({ ...adjective, valencyEvidence: [] }).success).toBe(true);
	for (const invalid of [
		[{ ...slot, member: 1 }],
		[{ ...slot, member: 2 }],
		[slot, slot],
	])
		expect(
			parseUnit({ ...adjective, valencyEvidence: invalid }).success,
		).toBe(false);
	const { valencyEvidence: _omitted, ...withoutEvidence } = adjective;
	expect(parseUnit(withoutEvidence).success).toBe(false);
	// die Angst ... vor Hunden: the article opens the noun, vor is governed.
	const angst = {
		unitKind: "Attestation",
		surface: {
			...noun,
			normalizedSurface: "Angst",
			lemma: {
				...noun.lemma,
				canonicalForm: "Angst",
				coreFeatures: { gender: "Fem" },
			},
			inflectionalFeatures: { case: "Nom", gender: null, number: "Sing" },
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "die", orthography: "Standard" },
			{ attested: "Angst", orthography: "Standard" },
			{ attested: "vor", orthography: "Standard" },
		],
		articleEvidence: { kind: "Owned", member: 0 },
		valencyEvidence: [
			{
				member: 2,
				complement: {
					kind: "Preposition",
					preposition: preposition("vor"),
					governedCase: "Dat",
					referent: "Something",
				},
				realizedCase: "Dat",
			},
		],
	};
	expect(parseUnit(angst).success).toBe(true);
	expect(
		parseUnit({
			...angst,
			valencyEvidence: [{ ...angst.valencyEvidence[0], member: 1 }],
		}).success,
	).toBe(false);
});
test("a Hebrew governor may name its governed preposition with no case", () => {
	// הוא בחר בבית: the verb owns the ב of בבית, which it governs.
	const fusion = {
		spelling: "בבית",
		components: [
			{ span: "ב", surface: "ב" },
			{ span: "", surface: "ה" },
			{ span: "בית", surface: "בית" },
		],
	};
	const be = {
		kind: "Preposition",
		preposition: {
			unitKind: "Lemma",
			language: "he",
			family: "Lexeme",
			kind: "ADP",
			canonicalForm: "ב",
			coreFeatures: { abbr: null, case: null },
		},
		referent: "Something",
	};
	const subject = { kind: "Subject", referent: "Someone" };
	const bachar = {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "he",
			normalizedSurface: "בחר",
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "he",
				family: "Lexeme",
				kind: "VERB",
				canonicalForm: "בחר",
				coreFeatures: { hebBinyan: "PAAL", hebExistential: null },
			},
			inflectionalFeatures: {
				definite: null,
				gender: "Masc",
				mood: null,
				number: "Sing",
				person: "3",
				polarity: null,
				tense: "Past",
				verbForm: null,
				voice: "Act",
			},
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "בחר", orthography: "Standard" },
			{ attested: "ב", orthography: "Fused", fusion, component: 0 },
		],
		valencyEvidence: [
			{ member: null, complement: subject },
			{ member: 1, complement: be },
		],
	};
	expect(parseUnit(bachar).success).toBe(true);
	// הוא סמך על חבריו: the verb owns the על it governs, spelled apart.
	const samach = {
		...bachar,
		surface: {
			...bachar.surface,
			normalizedSurface: "סמך",
			lemma: { ...bachar.surface.lemma, canonicalForm: "סמך" },
		},
		members: [
			{ attested: "סמך", orthography: "Standard" },
			{ attested: "על", orthography: "Standard" },
		],
		valencyEvidence: [
			{
				member: 1,
				complement: {
					...be,
					preposition: { ...be.preposition, canonicalForm: "על" },
				},
			},
		],
	};
	expect(parseUnit(samach).success).toBe(true);
	const { valencyEvidence: _omitted, ...withoutEvidence } = bachar;
	expect(parseUnit(withoutEvidence).success).toBe(true);
	for (const invalid of [
		[{ member: 0, complement: be }],
		[{ member: 1, complement: subject }],
		[{ member: 1, complement: { ...be, case: "Acc" } }],
		[{ member: 1, complement: be, realizedCase: "Dat" }],
		[
			{
				member: 1,
				complement: {
					kind: "Case",
					governedCase: "Acc",
					referent: "Someone",
				},
			},
		],
	])
		expect(parseUnit({ ...bachar, valencyEvidence: invalid }).success).toBe(
			false,
		);
	// A route that takes no frame takes no valency evidence either.
	const adverb = {
		unitKind: "Attestation",
		realizationCoverage: "Full",
		surface: {
			unitKind: "Surface",
			language: "he",
			normalizedSurface: "מהר",
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "he",
				family: "Lexeme",
				kind: "ADV",
				canonicalForm: "מהר",
				coreFeatures: { prefix: null },
			},
		},
		members: [{ attested: "מהר", orthography: "Standard" }],
	};
	expect(parseUnit(adverb).success).toBe(true);
	expect(parseUnit({ ...adverb, valencyEvidence: [] }).success).toBe(false);
});
test("an English governor may name its governed preposition with no case", () => {
	// We depend on accurate labels: the verb owns the on it governs.
	const onLemma = {
		unitKind: "Lemma",
		language: "en",
		family: "Lexeme",
		kind: "ADP",
		canonicalForm: "on",
		coreFeatures: { abbr: null, extPos: null },
	};
	const on = {
		kind: "Preposition",
		preposition: onLemma,
		referent: "Something",
	};
	const subject = { kind: "Subject", referent: "Someone" };
	const indirectObject = { kind: "IndirectObject", referent: "Someone" };
	const depend = {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "en",
			normalizedSurface: "depend",
			spelling: { kind: "Canonical" },
			inflectionalFeatures: null,
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "en",
				family: "Lexeme",
				kind: "VERB",
				canonicalForm: "depend",
				coreFeatures: {
					abbr: null,
					extPos: null,
					phrasal: null,
				},
			},
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "depend", orthography: "Standard" },
			{ attested: "on", orthography: "Standard" },
		],
		valencyEvidence: [
			{ member: null, complement: subject },
			{ member: 1, complement: on },
		],
	};
	expect(parseUnit(depend).success).toBe(true);
	expect(
		parseUnit({
			...depend,
			members: [
				{ attested: "depend", orthography: "Standard" },
				{ attested: "On", orthography: "Standard" },
			],
		}).success,
	).toBe(true);
	expect(
		parseUnit({
			...depend,
			valencyEvidence: [{ member: null, complement: indirectObject }],
		}).success,
	).toBe(true);
	const { valencyEvidence: _omitted, ...withoutEvidence } = depend;
	expect(parseUnit(withoutEvidence).success).toBe(true);
	for (const invalid of [
		[{ member: 0, complement: on }],
		[{ member: 1, complement: subject }],
		[{ member: 1, complement: indirectObject }],
		[{ member: 1, complement: { ...on, case: "Acc" } }],
		[{ member: 1, complement: on, realizedCase: "Acc" }],
		[
			{
				member: 1,
				complement: {
					kind: "Case",
					governedCase: "Dat",
					referent: "Someone",
				},
			},
		],
	])
		expect(parseUnit({ ...depend, valencyEvidence: invalid }).success).toBe(
			false,
		);
	// A route that takes no frame takes no valency evidence either.
	const preposition = {
		unitKind: "Attestation",
		realizationCoverage: "Full",
		surface: {
			unitKind: "Surface",
			language: "en",
			normalizedSurface: "on",
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			lemma: onLemma,
		},
		members: [{ attested: "on", orthography: "Standard" }],
	};
	expect(parseUnit(preposition).success).toBe(true);
	expect(parseUnit({ ...preposition, valencyEvidence: [] }).success).toBe(
		false,
	);
});
