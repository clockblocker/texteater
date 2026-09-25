import { expect, test } from "bun:test";
import { Effect } from "effect";
import { authoredMembers } from "../src/concrete-lang/de/authored-closed-sets/inventory.js";
import {
	authoredRealizations,
	locateAuthoredIdentity,
	validateAuthoredRealizations,
} from "../src/concrete-lang/de/authored-closed-sets/realizations.js";
import { resolveAuthoredGrammarIdentity } from "../src/concrete-lang/de/grammatical-resolution/authored-identity.js";
import auxiliaryCases from "../src/concrete-lang/de/grammatical-resolution/lexeme/auxiliary/corpus.json";
import { choiceAnswers } from "../src/testing.js";
import type { DumgenOptions, OperationTrace } from "../src/types.js";
import { operation } from "../src/universal/trace.js";

/** The identity option that names this Canonical Form. */
function identityOption(
	questions: Parameters<typeof choiceAnswers>[0],
	canonicalForm: string,
): string {
	const question = questions.identity;
	if (question?.type !== "choice") throw Error("Expected identity choice");
	const [key] =
		Object.entries(question.criteria).find(
			([key, option]) =>
				key.startsWith("identity_") && option === canonicalForm,
		) ?? [];
	if (!key) throw Error(`No identity option ${canonicalForm}`);
	return key;
}

const member = (form: string, kind: string, grammaticalCase?: string) => {
	const result = authoredMembers.find(
		(value) =>
			value.lemma.kind === kind &&
			value.lemma.canonicalForm === form &&
			(!grammaticalCase ||
				(value.lemma.coreFeatures as Record<string, unknown>).case ===
					grammaticalCase),
	);
	if (!result) throw Error(`Missing fixture ${form}`);
	return result;
};
test("authored realization mappings preserve exact Core coordinates, spelling identity and literal null", () => {
	validateAuthoredRealizations();
	expect(
		authoredRealizations.every((mapping) =>
			authoredMembers.includes(mapping.member),
		),
	).toBe(true);
	const der = member("der", "DET"),
		die = member("die", "DET");
	for (const expected of [der, die]) {
		const located = locateAuthoredIdentity({
			kind: "DET",
			spelled: expected.lemma.canonicalForm,
			core: expected.lemma.coreFeatures,
			inflection: null,
		});
		expect(located.status).toBe("Hit");
		expect(located.matches[0]).toBe(expected);
	}
	for (const grammaticalCase of ["Nom", "Acc"]) {
		const sie = member("sie", "PRON", grammaticalCase);
		const located = locateAuthoredIdentity({
			kind: "PRON",
			spelled: "sie",
			core: sie.lemma.coreFeatures,
			inflection: null,
		});
		expect(located.matches).toEqual([sie]);
	}
	const jemand = member("jemanden", "PRON", "Acc");
	expect(
		locateAuthoredIdentity({
			kind: "PRON",
			spelled: "jemand",
			core: jemand.lemma.coreFeatures,
			inflection: null,
		}).matches,
	).toEqual([jemand]);
	expect(
		locateAuthoredIdentity({
			kind: "PRON",
			spelled: "jemand",
			core: { ...jemand.lemma.coreFeatures, case: null },
			inflection: null,
		}).matches,
	).toEqual([]);
});
test("a map gap and ambiguous maps make one dependent selection over compatible identities", async () => {
	// Nominative masculine singular cells of two paradigms share every Core Feature.
	const der = member("dieser", "DET"),
		die = member("jener", "DET");
	for (const mappings of [
		[],
		[
			{ member: der, spelled: "dieser" },
			{ member: die, spelled: "dieser" },
		],
	]) {
		const traces: OperationTrace[] = [];
		const options: DumgenOptions = {
			execute: async () => {
				throw Error("No generation");
			},
			judge: async (request) => {
				// The Core is stated once; each option names a Canonical Form.
				expect(request.state).toHaveProperty(
					"judgedCore",
					JSON.stringify(der.lemma.coreFeatures),
				);
				expect(request.state).not.toHaveProperty("reviewedIdentities");
				return choiceAnswers(request.questions, () =>
					identityOption(request.questions, "dieser"),
				);
			},
			onOperation: (trace) => traces.push(trace),
		};
		const result = await Effect.runPromise(
			operation(options)("resolveGrammar", {}, (scope) =>
				resolveAuthoredGrammarIdentity(
					options,
					{
						kind: "DET",
						spelled: "dieser",
						core: der.lemma.coreFeatures,
						inflection: null,
						markedContext: "<TARGET>dieser</TARGET> Mann",
						sentenceInitial: false,
					},
					scope,
					[],
					mappings,
				).pipe(Effect.map(({ member }) => member)),
			),
		);
		expect(result).toBe(der);
		expect(traces[0]?.calls).toHaveLength(1);
		expect(traces[0]?.events[0]?.data).toHaveProperty(
			"status",
			mappings.length ? "Ambiguous" : "Gap",
		);
	}
});
test("confirmed absence is Closed DET CatalogMiss, Open PRON miss, or explicit uncertainty", async () => {
	for (const [kind, decision, expected] of [
		["DET", "NoMatch", "CatalogMiss"],
		["PRON", "NoMatch", "Success"],
		["PRON", "Unresolved", "Unresolved"],
		["DET", "Unresolved", "Unresolved"],
	] as const) {
		const base = member(kind === "DET" ? "der" : "ich", kind);
		const options: DumgenOptions = {
			execute: async () => {
				throw Error("No generation during identity selection");
			},
			judge: async (request) =>
				choiceAnswers(request.questions, () => decision),
		};
		const result = await Effect.runPromise(
			Effect.either(
				operation(options)("resolveGrammar", {}, (scope) =>
					resolveAuthoredGrammarIdentity(
						options,
						{
							kind,
							spelled: "unknown",
							core: base.lemma.coreFeatures,
							inflection: null,
							markedContext: "unknown",
							sentenceInitial: false,
						},
						scope,
						[],
					).pipe(Effect.map(({ member }) => member)),
				),
			),
		);
		expect(result._tag === "Left" ? result.left._tag : "Success").toBe(
			expected,
		);
		if (result._tag === "Right") expect(result.right).toBeNull();
	}
});

test("a sentence-initial capital retries its lowercase spelling; a mid-sentence capital never does", async () => {
	/** A Hit never reaches the judge; its judge throws if called. */
	const identify = async (
		spelled: string,
		expected: ReturnType<typeof member>,
		sentenceInitial: boolean,
		lookup: "Hit" | "Judged",
	) => {
		const options: DumgenOptions = {
			execute: async () => {
				throw Error("No generation during identity selection");
			},
			judge: async (request) => {
				if (lookup === "Hit")
					throw Error(`Judge called for ${spelled}`);
				return choiceAnswers(request.questions, () =>
					identityOption(
						request.questions,
						expected.lemma.canonicalForm,
					),
				);
			},
		};
		const traces: OperationTrace[] = [];
		const result = await Effect.runPromise(
			operation({
				...options,
				onOperation: (trace) => traces.push(trace),
			})("resolveGrammar", {}, (scope) =>
				resolveAuthoredGrammarIdentity(
					options,
					{
						kind: expected.lemma.kind as "DET" | "PRON",
						spelled,
						core: expected.lemma.coreFeatures,
						inflection: null,
						markedContext: `<TARGET>${spelled}</TARGET> kommt`,
						sentenceInitial,
					},
					scope,
					[],
				).pipe(Effect.map(({ member }) => member)),
			),
		);
		expect(result, spelled).toBe(expected);
		expect(traces[0]?.calls, spelled).toHaveLength(
			lookup === "Hit" ? 0 : 1,
		);
	};
	const article = authoredMembers.find(
		(value) =>
			value.lemma.kind === "DET" &&
			value.lemma.canonicalForm === "den" &&
			(value.lemma.coreFeatures as Record<string, unknown>).case ===
				"Acc",
	);
	if (!article) throw Error("Missing fixture den");
	for (const [spelled, expected] of [
		["Er", member("er", "PRON")],
		["Wer", member("wer", "PRON")],
		["Den", article],
	] as const) {
		await identify(spelled, expected, true, "Hit");
		await identify(spelled, expected, false, "Judged");
	}
	const formal = member("Sie", "PRON", "Nom");
	const third = authoredMembers.find(
		(value) =>
			value.lemma.kind === "PRON" &&
			value.lemma.canonicalForm === "sie" &&
			(value.lemma.coreFeatures as Record<string, unknown>).number ===
				"Plur" &&
			(value.lemma.coreFeatures as Record<string, unknown>).case ===
				"Nom",
	);
	if (!third) throw Error("Missing fixture sie");
	await identify("Sie", third, false, "Judged");
	await identify("Sie", formal, false, "Hit");
	await identify("Sie", formal, true, "Hit");
});

test("the sentence-initial flag marks a target whose first member is the first ResolvableText Segment", async () => {
	const { grammarFixture } = await import("../src/testing.js");
	const { createDumgen } = await import("../src/universal/dumgen.js");
	const { validateEncounter } = await import(
		"../src/universal/validation.js"
	);
	const er = member("er", "PRON");
	for (const [segments, index, calls] of [
		[
			[
				{ kind: "OpaqueText", text: "„" },
				{ kind: "ResolvableText", text: "Er" },
				{ kind: "OpaqueText", text: " kommt.“" },
			],
			1,
			1,
		],
		[
			[
				{ kind: "ResolvableText", text: "Dann" },
				{ kind: "OpaqueText", text: " kommt " },
				{ kind: "ResolvableText", text: "Er" },
			],
			2,
			2,
		],
	] as const) {
		const traces: OperationTrace[] = [];
		const output = await Effect.runPromise(
			createDumgen({
				...grammarFixture({
					lemma: {
						canonicalForm: "er",
						coreFeatures: er.lemma.coreFeatures,
					},
					surface: {
						spelling: "Canonical",
						surfaceFeatures: null,
						inflectionalFeatures: null,
					},
					normalizedMembers: ["Er"],
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
				}),
				onOperation: (trace) => traces.push(trace),
			}).resolveGrammar({
				...validateEncounter({
					sentence: { id: "casing", language: "de", segments },
					target: {
						family: "Lexeme",
						kind: "PRON",
						memberSegmentIndices: [index],
					},
				}),
				contextAvailable: false,
			}),
		);
		expect(output.surface.lemma.canonicalForm).toBe("er");
		expect(traces[0]?.calls).toHaveLength(calls);
	}
});

test("Open PRON population misses copy exact headwords and generate changed text", async () => {
	const { grammarFixture } = await import("../src/testing.js");
	const { createDumgen } = await import("../src/universal/dumgen.js");
	const { validateEncounter } = await import(
		"../src/universal/validation.js"
	);
	for (const attested of [
		"meinesgleichen",
		"Meinesgleichen",
		"meinesgleihcen",
	]) {
		const typo = attested === "meinesgleihcen";
		const core = {
			case: null,
			number: null,
			extPos: null,
			foreign: null,
			person: null,
			polite: null,
			poss: null,
			pronType: "Ind",
			gender: null,
		};
		const expected = {
			lemma: { canonicalForm: "meinesgleichen", coreFeatures: core },
			surface: {
				spelling: "Canonical",
				surfaceFeatures: null,
				inflectionalFeatures: null,
			},
			normalizedMembers: ["meinesgleichen"],
			memberOrthographies: [typo ? "Typo" : "Standard"],
			realizationCoverage: "Full",
		};
		const traces: OperationTrace[] = [];
		const output = await Effect.runPromise(
			createDumgen({
				...grammarFixture(expected),
				onOperation: (trace) => traces.push(trace),
			}).resolveGrammar({
				...validateEncounter({
					sentence: {
						id: "open",
						language: "de",
						segments: [
							{
								kind: "ResolvableText",
								text: attested,
							},
						],
					},
					target: {
						family: "Lexeme",
						kind: "PRON",
						memberSegmentIndices: [0],
					},
				}),
				contextAvailable: false,
			}),
		);
		expect(output.surface.lemma.canonicalForm).toBe("meinesgleichen");
		expect(
			traces[0]?.events.some(
				(event) => event.kind === "AuthoredPopulationMiss",
			),
		).toBe(true);
		// An uninflected one-word miss copies its normalized member, casing
		// included; only a typo needs Luna.
		expect(traces[0]?.calls.map((call) => call.executor)).toEqual(
			typo ? ["TypeSafe", "TypeSafe", "Luna"] : ["TypeSafe", "TypeSafe"],
		);
	}
});

test("every AUX gold case locates its sein, haben, werden or bekommen Lemma by spelling", () => {
	const lemmas = new Set<string>();
	for (const [id, example] of Object.entries(auxiliaryCases)) {
		const output = example.idealOutput as {
			normalizedMembers: string[];
			lemma: { canonicalForm: string; coreFeatures: { verbType: null } };
		};
		const located = locateAuthoredIdentity({
			kind: "AUX",
			spelled: output.normalizedMembers[0] ?? "",
			core: output.lemma.coreFeatures,
			inflection: null,
		});
		expect(located.status, id).toBe("Hit");
		expect(located.matches[0]?.lemma.canonicalForm, id).toBe(
			output.lemma.canonicalForm,
		);
		lemmas.add(output.lemma.canonicalForm);
	}
	expect([...lemmas].sort()).toEqual(["bekommen", "haben", "sein", "werden"]);
	expect(
		authoredMembers.filter((member) => member.lemma.kind === "AUX"),
	).toHaveLength(9);
});
