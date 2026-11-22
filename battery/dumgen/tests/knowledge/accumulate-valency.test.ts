import { expect, test } from "bun:test";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import { TraceSink } from "../../src/call.js";
import type { AccumulateValencyInput } from "../../src/knowledge/types.js";
import type { OperationTrace } from "../../src/operation-trace.js";
import { operations } from "../../src/operations.js";
import { liveOver } from "../live-over.js";
import {
	adp,
	attestedPreposition,
	knowledgeInput,
	knowledgeJev,
	knowledgeLuna,
} from "./support.js";

const verb = (canonicalForm: string, hasSepPrefix: string | null = null) => ({
	family: "Lexeme",
	kind: "VERB",
	canonicalForm,
	coreFeatures: { hasSepPrefix },
});

const noun = (canonicalForm: string, gender: "Masc" | "Fem" | "Neut") => ({
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm,
	coreFeatures: { gender },
});

const nom = { kind: "Case", governedCase: "Nom" } as const;
const acc = { kind: "Case", governedCase: "Acc" } as const;
const nachDat = {
	kind: "Preposition",
	preposition: adp("nach"),
	governedCase: "Dat",
} as const;

async function accumulateOnce(
	models: Parameters<typeof liveOver>[0],
	input: AccumulateValencyInput,
) {
	let trace: OperationTrace | undefined;
	const result = await Effect.runPromise(
		operations.knowledge.accumulateValency(input).pipe(
			Effect.provide(liveOver(models)),
			Effect.provideService(TraceSink, (recorded) => {
				trace = recorded;
			}),
		),
	);
	return { result, trace };
}

function valencyInput(
	lemma: Parameters<typeof knowledgeInput>[0],
	emoji: string,
	sentence: string,
	target: readonly string[],
	valency: readonly Dumrel.ValencyPattern[],
	valencyEvidence: readonly unknown[] = [],
): AccumulateValencyInput {
	const base = knowledgeInput(lemma, emoji, sentence, target, {
		valencyEvidence,
	});
	return {
		language: "de",
		reading: base.reading,
		attestation: base.attestation,
		sentence: base.sentence,
		valency,
	};
}

test("when jev matches a stored pattern, Luna is never called and realizedPattern is returned", async () => {
	const jev = knowledgeJev({ pattern: "p0" });
	const luna = knowledgeLuna({});
	const stored: Dumrel.ValencyPattern[] = [[nom, nachDat]];
	const { result, trace } = await accumulateOnce(
		{ jev: jev.ask, luna: luna.ask },
		valencyInput(
			verb("fragen"),
			"❓",
			"Sie fragten nach Reiseführern.",
			["fragten", "nach"],
			stored,
			[attestedPreposition("nach", "Dat")],
		),
	);
	expect(result).toEqual({
		changes: [],
		realizedPattern: [nom, nachDat],
		failures: [],
	});
	expect(luna.sent).toHaveLength(0);
	expect(trace?.operation).toBe("knowledge.accumulateValency");
	expect(trace?.events).toContainEqual({
		name: "ValencyAccumulation",
		data: { outcome: "Covered", by: "N nach D" },
	});
});

test("when jev answers NoMatch, Luna extracts the new concrete pattern and emits Contribute", async () => {
	const jev = knowledgeJev({ pattern: "NoMatch" });
	const luna = knowledgeLuna({ valencyAccumulation: "N A" });
	const stored: Dumrel.ValencyPattern[] = [[nom, nachDat]];
	const { result, trace } = await accumulateOnce(
		{ jev: jev.ask, luna: luna.ask },
		valencyInput(
			verb("fragen"),
			"❓",
			"Du hast mich gefragt.",
			["hast", "gefragt"],
			stored,
		),
	);
	expect(result.failures).toEqual([]);
	expect(result.realizedPattern).toEqual([nom, acc]);
	expect(result.changes).toEqual([
		{ kind: "Contribute", aspect: "valency", value: [[nom, acc]] },
	]);
	expect(trace?.events).toContainEqual({
		name: "ValencyAccumulation",
		data: { outcome: "Added", written: "N A" },
	});
});

test("when Luna writes a pattern already stored (even in different complement order), no change is emitted", async () => {
	const jev = knowledgeJev({ pattern: "NoMatch" });
	const luna = knowledgeLuna({ valencyAccumulation: "N nach D A" });
	const stored: Dumrel.ValencyPattern[] = [[nom, acc, nachDat]];
	const { result, trace } = await accumulateOnce(
		{ jev: jev.ask, luna: luna.ask },
		valencyInput(
			verb("fragen"),
			"❓",
			"Er fragte sie nach dem Weg.",
			["fragte", "nach"],
			stored,
			[attestedPreposition("nach", "Dat")],
		),
	);
	expect(result.changes).toEqual([]);
	expect(result.realizedPattern).toEqual([nom, acc, nachDat]);
	expect(trace?.events).toContainEqual({
		name: "ValencyAccumulation",
		data: { outcome: "Contained", written: "N A nach D" },
	});
});

test("when stored valency is empty, jev is skipped and Luna extracts directly", async () => {
	const jev = knowledgeJev({});
	const luna = knowledgeLuna({ valencyAccumulation: "N A" });
	const { result, trace } = await accumulateOnce(
		{ jev: jev.ask, luna: luna.ask },
		valencyInput(
			verb("fragen"),
			"❓",
			"Du hast mich gefragt.",
			["hast", "gefragt"],
			[],
		),
	);
	expect(result.changes).toEqual([
		{ kind: "Contribute", aspect: "valency", value: [[nom, acc]] },
	]);
	expect(result.realizedPattern).toEqual([nom, acc]);
	expect(trace?.calls.map(({ executor }) => executor)).toEqual(["luna"]);
});

test("bare nouns with no valencyEvidence and no clause cues fast-skip with zero model calls", async () => {
	const jev = knowledgeJev({});
	const luna = knowledgeLuna({});
	const { result, trace } = await accumulateOnce(
		{ jev: jev.ask, luna: luna.ask },
		valencyInput(
			noun("Tisch", "Masc"),
			"🪑",
			"Der Tisch steht dort.",
			["Tisch"],
			[],
		),
	);
	expect(result).toEqual({
		changes: [],
		realizedPattern: null,
		failures: [],
	});
	expect(trace?.calls).toEqual([]);
});

test("correlate clauses cover the attested preposition without adding a duplicate Preposition complement", async () => {
	const jev = knowledgeJev({ pattern: "NoMatch" });
	const luna = knowledgeLuna({ valencyAccumulation: "N auf dass" });
	const { result } = await accumulateOnce(
		{ jev: jev.ask, luna: luna.ask },
		valencyInput(
			verb("achten"),
			"👀",
			"Er achtet darauf, dass alles stimmt.",
			["achtet"],
			[
				[
					nom,
					{
						kind: "Preposition",
						preposition: adp("auf"),
						governedCase: "Acc",
					},
				],
			],
			[
				{
					member: null,
					complement: {
						kind: "Preposition",
						preposition: adp("auf"),
						governedCase: "Acc",
					},
					realizedCase: "Acc",
				},
			],
		),
	);
	expect(result.realizedPattern).toEqual([
		nom,
		{ kind: "Clause", form: "Dass", preposition: adp("auf") },
	]);
	expect(result.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "valency",
			value: [
				[
					nom,
					{ kind: "Clause", form: "Dass", preposition: adp("auf") },
				],
			],
		},
	]);
});
