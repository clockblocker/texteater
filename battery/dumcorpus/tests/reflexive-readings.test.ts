import { describe, expect, test } from "bun:test";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import {
	reflexiveMarkerIssues,
	reflexiveTwinIssues,
} from "../src/check-reflexive-readings.js";
import type { SpecTarget } from "../src/corpus-types.js";
import { attestationReflexiveSpellingIssues } from "../src/de/check-reflexive-spelling.js";
import { loadSpecRecords } from "../src/index.js";
import { checkIfGrundform } from "../src/inventories.js";

const lemma = (canonicalForm: string) =>
	({
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm,
		coreFeatures: { hasSepPrefix: null },
	}) as const satisfies Dumling.Lemma<"de", "Lexeme", "VERB">;
const reading = (canonicalForm: string, emojiDescription: string) =>
	({
		unitKind: "Reading",
		lemma: lemma(canonicalForm),
		emojiDescription,
	}) as const satisfies Dumling.Reading<"de", "Lexeme", "VERB">;
const nom = { kind: "Case", governedCase: "Nom" } as const;
const acc = {
	kind: "Case",
	governedCase: "Acc",
} as const;
const reflexiveOnly = (
	governedCase: "Acc" | "Dat" = "Acc",
): Dumrel.ReadingKnowledge => ({
	valency: [[nom, { kind: "Reflexive", governedCase }]],
});
const optionalReflexive = (
	governedCase: "Acc" | "Dat" = "Acc",
): Dumrel.ReadingKnowledge => ({
	valency: [[nom], [nom, { kind: "Reflexive", governedCase }]],
});
const plain: Dumrel.ReadingKnowledge = {
	valency: [[nom, acc]],
};

describe("the 🪞 marker (ADR 0052)", () => {
	test("requires a Reflexive complement in every pattern of a 🪞 Reading", () => {
		const messages = (
			value: Dumling.Reading,
			knowledge: Dumrel.ReadingKnowledge,
		) =>
			reflexiveMarkerIssues(value, knowledge, undefined).map(
				({ message }) => message,
			);
		expect(messages(reading("erinnern", "🪞🧠"), reflexiveOnly())).toEqual(
			[],
		);
		expect(messages(reading("erinnern", "💭"), plain)).toEqual([]);
		expect(
			messages(reading("ausruhen", "😴"), optionalReflexive()),
		).toEqual([]);
		expect(messages(reading("ausruhen", "😴"), reflexiveOnly())).toEqual(
			[],
		);
		for (const knowledge of [plain, optionalReflexive()])
			expect(messages(reading("fürchten", "🪞😨"), knowledge)).toEqual([
				"Every Valency Pattern of a 🪞 Reading holds a Reflexive complement",
			]);
	});

	test("waits for patterns, or for valency reviewed empty", () => {
		const marked = reading("fürchten", "🪞😨");
		expect(reflexiveMarkerIssues(marked, {}, undefined)).toEqual([]);
		expect(
			reflexiveMarkerIssues(marked, {}, { valency: "ReviewedEmpty" }),
		).toHaveLength(1);
	});

	test("reads only routes that take a Reflexive, so PRON sich keeps 🪞", () => {
		const sich = {
			unitKind: "Reading",
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "PRON",
				canonicalForm: "sich",
				coreFeatures: {},
			},
			emojiDescription: "🪞",
		} as unknown as Dumling.Reading;
		expect(
			reflexiveMarkerIssues(sich, {}, { valency: "ReviewedEmpty" }),
		).toEqual([]);
	});

	test("no non-🪞 Reading with a reflexive pattern shares its emoji with a 🪞 Reading of its Lemma", () => {
		const target = (
			value: Dumling.Reading,
			knowledge: Dumrel.ReadingKnowledge,
		) => ({ reading: value, knowledge }) as unknown as SpecTarget;
		const record = (id: string, ...targets: SpecTarget[]) =>
			({ id: `de/${id}`, targets }) as const;
		const marked = target(reading("ausruhen", "🪞😴"), reflexiveOnly());
		const twin = target(reading("ausruhen", "😴"), optionalReflexive());
		const other = target(reading("ausruhen", "🛋️"), optionalReflexive());
		expect(reflexiveTwinIssues([record("a", marked, other)])).toEqual([]);
		expect(
			reflexiveTwinIssues([
				record("a", marked),
				record("b", other, twin),
			]),
		).toEqual([
			{
				record: "de/b",
				check: "ReflexiveMarker",
				layer: "Knowledge",
				path: "targets.1.reading.emojiDescription",
				message:
					"This Reading's reflexive pattern shares its emoji 😴 with a 🪞 Reading of its Lemma; they are one Reading",
			},
		]);
	});

	test("passes the corpus", () => {
		expect(reflexiveTwinIssues(loadSpecRecords())).toEqual([]);
	});
});

/** *Sie will sich erinnern*: `sich` fills the Reflexive Slot, and the Surface leaves it out. */
const attestation = (
	normalizedSurface: string,
	reflexive: string,
	inflectionalFeatures: Record<string, string | null>,
) =>
	({
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "de",
			normalizedSurface,
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			lemma: lemma("erinnern"),
			inflectionalFeatures: {
				expletive: null,
				perfect: null,
				future: null,
				passive: null,
				voice: null,
				mood: null,
				tense: null,
				person: null,
				number: null,
				...inflectionalFeatures,
			},
		},
		realizationCoverage: "Full",
		members: [
			{ attested: reflexive, orthography: "Standard" },
			{ attested: "erinnern", orthography: "Standard" },
		],
		expletiveEvidence: null,
		valencyEvidence: [
			{
				member: 0,
				complement: { kind: "Reflexive", governedCase: "Acc" },
				realizedCase: "Acc",
			},
		],
	}) as unknown as Dumling.Attestation<"de">;
const infinitive = { verbForm: "Inf" };

describe("a lexical reflexive in an Attestation (ADR 0052)", () => {
	test("spells a reflexive of its case and stays out of the Surface", () => {
		const bare = attestation("erinnern", "sich", infinitive);
		expect(parseUnit(bare).success).toBe(true);
		expect(attestationReflexiveSpellingIssues(bare)).toEqual([]);
		expect(
			attestationReflexiveSpellingIssues(
				attestation("erinnern", "uns", infinitive),
			),
		).toEqual([]);
		expect(
			attestationReflexiveSpellingIssues(
				attestation("erinnern", "mir", infinitive),
			).map(({ message }) => message),
		).toEqual(["mir is no Acc reflexive"]);
		expect(
			attestationReflexiveSpellingIssues(
				attestation("sich erinnern", "sich", infinitive),
			).map(({ message }) => message),
		).toEqual(["The normalized Surface leaves out the reflexive sich"]);
	});

	test("names its case where the form shows it, and may leave out a case sich hides", () => {
		const caseless = (reflexive: string) => {
			const unit = attestation("erinnern", reflexive, infinitive);
			return {
				...unit,
				valencyEvidence: [
					{ member: 0, complement: { kind: "Reflexive" } },
				],
			} as unknown as Dumling.Attestation<"de">;
		};
		for (const hidden of ["sich", "uns", "euch"]) {
			expect(parseUnit(caseless(hidden)).success).toBe(true);
			expect(
				attestationReflexiveSpellingIssues(caseless(hidden)),
			).toEqual([]);
		}
		expect(
			["mich", "dir", "ihn"].flatMap((form) =>
				attestationReflexiveSpellingIssues(caseless(form)).map(
					({ message }) => message,
				),
			),
		).toEqual([
			"mich shows Acc, and the evidence names no case",
			"dir shows Dat, and the evidence names no case",
			"ihn is no reflexive",
		]);
	});

	test("leaves a bare Surface to the Grundform spell-back, as the Canonical Form is bare", () => {
		expect(
			checkIfGrundform(
				attestation("erinnern", "sich", infinitive).surface,
			),
		).toEqual({ success: true, value: true });
		expect(
			checkIfGrundform(
				attestation("erinnert", "sich", {
					verbForm: "Fin",
					mood: "Ind",
					tense: "Pres",
					person: "3",
					number: "Sing",
				}).surface,
			),
		).toEqual({ success: true, value: false });
	});
});
