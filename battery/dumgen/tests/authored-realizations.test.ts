import { expect, test } from "bun:test";
import { Effect } from "effect";
import { authoredMembers } from "../src/concrete-lang/de/authored-closed-sets/inventory.js";
import {
	authoredRealizations,
	locateAuthoredIdentity,
	validateAuthoredRealizations,
} from "../src/concrete-lang/de/authored-closed-sets/realizations.js";
import { resolveAuthoredGrammarIdentity } from "../src/concrete-lang/de/grammatical-resolution/authored-identity.js";
import type { DumgenOptions, OperationTrace } from "../src/types.js";
import { operationTask } from "../src/universal/trace.js";
import { choiceAnswers } from "./execution-fixture.js";

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
	const der = member("der", "DET"),
		die = member("die", "DET");
	for (const mappings of [
		[],
		[
			{ member: der, spelled: "der" },
			{ member: die, spelled: "der" },
		],
	]) {
		const traces: OperationTrace[] = [];
		const options: DumgenOptions = {
			execute: async () => {
				throw Error("No generation");
			},
			judge: async (request) => {
				const state = request.state as {
					reviewedIdentities: (typeof der.lemma)[];
				};
				expect(
					state.reviewedIdentities.every(
						(lemma) =>
							JSON.stringify(lemma.coreFeatures) ===
							JSON.stringify(der.lemma.coreFeatures),
					),
				).toBe(true);
				return choiceAnswers(
					request.questions,
					() =>
						`identity_${state.reviewedIdentities.findIndex((lemma) => lemma.canonicalForm === "der")}`,
				);
			},
			onOperation: (trace) => traces.push(trace),
		};
		const result = await Effect.runPromise(
			operationTask(options)("resolveGrammar", {}, (signal) =>
				resolveAuthoredGrammarIdentity(
					options,
					{
						kind: "DET",
						spelled: "der",
						core: der.lemma.coreFeatures,
						inflection: null,
						markedContext: "<TARGET>der</TARGET> Mann",
					},
					signal,
					mappings,
				),
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
				operationTask(options)("resolveGrammar", {}, (signal) =>
					resolveAuthoredGrammarIdentity(
						options,
						{
							kind,
							spelled: "unknown",
							core: base.lemma.coreFeatures,
							inflection: null,
							markedContext: "unknown",
						},
						signal,
					),
				),
			),
		);
		expect(result._tag === "Left" ? result.left._tag : "Success").toBe(
			expected,
		);
		if (result._tag === "Right") expect(result.right).toBeNull();
	}
});

test("Open PRON population misses copy exact headwords and generate changed text", async () => {
	const { grammarFixture } = await import("./grammar-fixture.js");
	const { createDumgen } = await import("../src/universal/dumgen.js");
	const { validateEncounter } = await import(
		"../src/universal/validation.js"
	);
	for (const attested of ["meinesgleichen", "Meinesgleichen", "meinesgleihcen"]) {
		const typo = attested === "meinesgleihcen";
		const core = {
			case: null,
			number: null,
			"gender[psor]": null,
			extPos: null,
			foreign: null,
			person: null,
			polite: null,
			poss: null,
			pronType: "Ind",
			gender: null,
			referenceNumber: null,
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
			}).resolveGrammar(
				validateEncounter({
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
			),
		);
		expect(output.surface.lemma.canonicalForm).toBe("meinesgleichen");
		expect(
			traces[0]?.events.some(
				(event) => event.kind === "AuthoredPopulationMiss",
			),
		).toBe(true);
		expect(traces[0]?.calls.map((call) => call.executor)).toEqual(
			attested === "meinesgleichen"
				? ["TypeSafe", "TypeSafe"]
				: ["TypeSafe", "TypeSafe", "Luna"],
		);
	}
});
