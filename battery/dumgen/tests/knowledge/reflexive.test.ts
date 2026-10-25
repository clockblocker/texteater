import { expect, test } from "bun:test";
import type { GermanKnowledgeChange } from "../../src/knowledge/types.js";
import {
	knowledgeInput,
	knowledgeJev,
	knowledgeLuna,
	produceOnce,
} from "./support.js";

// The Reading's 🪞 settles its Reflexive Slot (ADR 0052).

const verb = (canonicalForm: string) => ({
	family: "Lexeme",
	kind: "VERB",
	canonicalForm,
	coreFeatures: { hasSepPrefix: null },
});
const besideOneself = {
	family: "Locution",
	kind: "VERB",
	canonicalForm: "außer sein",
	coreFeatures: {},
};
const subject = {
	status: "Required",
	complements: [{ kind: "Case", governedCase: "Nom", referent: "Someone" }],
} as const;
const reflexive = (
	governedCase: "Acc" | "Dat",
	status: "Required" | "Optional" = "Required",
) => ({
	status,
	complements: [{ kind: "Reflexive", governedCase } as const],
});
const attestedReflexive = (governedCase: "Acc" | "Dat") => ({
	member: 1,
	complement: { kind: "Reflexive", governedCase },
	realizedCase: governedCase,
});
const frameOf = (changes: readonly GermanKnowledgeChange[]): unknown => {
	const change = changes.find((change) => change.aspect === "valency");
	return change && "value" in change ? change.value : undefined;
};

/** A valency-only run on `emoji`, Luna proposing `valency`. */
async function frame(
	emoji: string,
	valency: readonly unknown[],
	valencyEvidence: readonly unknown[] = [],
	origin: "New" | "TopUp" = "New",
	occurrence: {
		readonly lemma: ReturnType<typeof verb> | typeof besideOneself;
		readonly sentence: string;
		readonly target: readonly string[];
	} = {
		lemma: verb("schämen"),
		sentence: "Er schämt sich.",
		target: ["schämt", "sich"],
	},
) {
	const luna = knowledgeLuna({ valency: { valency } });
	const { result, trace } = await produceOnce(
		{ jev: knowledgeJev().ask, luna: luna.ask },
		knowledgeInput(
			occurrence.lemma,
			emoji,
			occurrence.sentence,
			occurrence.target,
			{ request: { valency: null }, valencyEvidence, origin },
		),
	);
	return { result, trace, luna };
}

test("Luna is offered the Reflexive, and a 🪞 Reading's Reflexive Slot is Required, in the case the creating occurrence's form shows", async () => {
	const { result, luna } = await frame(
		"🪞😳",
		[subject, reflexive("Dat", "Optional")],
		[attestedReflexive("Acc")],
		"New",
		{
			lemma: verb("schämen"),
			sentence: "Ich schäme mich.",
			target: ["schäme", "mich"],
		},
	);
	expect(JSON.stringify(luna.sent[0]?.outputSchema)).toContain("Reflexive");
	expect(frameOf(result.changes)).toEqual([subject, reflexive("Acc")]);
	expect(luna.sent[0]?.systemPrompt).toContain("Test it in the first person");
});

test("a sich hides its case, so Luna's case for the meaning goes before the one jev judged", async () => {
	// macht sich Sorgen: jev judged Acc, Luna proposes Dat.
	const { result } = await frame(
		"🪞😟",
		[subject, reflexive("Dat")],
		[attestedReflexive("Acc")],
		"New",
		{
			lemma: { ...besideOneself, canonicalForm: "Sorgen machen" },
			sentence: "Er macht sich Sorgen.",
			target: ["macht", "sich", "Sorgen"],
		},
	);
	expect(frameOf(result.changes)).toEqual([subject, reflexive("Dat")]);
	// A blank preposition, as Luna writes outside a fixed phrase, is none.
	const blank = await frame(
		"🪞😳",
		[
			subject,
			{
				status: "Required",
				complements: [
					{ kind: "Reflexive", governedCase: "Dat", preposition: "" },
				],
			},
		],
		[attestedReflexive("Acc")],
	);
	expect(frameOf(blank.result.changes)).toEqual([subject, reflexive("Dat")]);
	// Luna proposing none, the occurrence's still stands.
	const added = await frame("🪞😳", [subject], [attestedReflexive("Acc")]);
	expect(frameOf(added.result.changes)).toEqual([subject, reflexive("Acc")]);
});

test("a 🪞 Reading gets the occurrence's Reflexive right after the subject when Luna proposes none, and Luna's case on a later occurrence", async () => {
	const added = await frame("🪞😳", [subject], [attestedReflexive("Acc")]);
	expect(frameOf(added.result.changes)).toEqual([subject, reflexive("Acc")]);
	const later = await frame(
		"🪞😳",
		[subject, reflexive("Dat")],
		[attestedReflexive("Acc")],
		"TopUp",
	);
	expect(frameOf(later.result.changes)).toEqual([subject, reflexive("Dat")]);
});

test("a 🪞 Reading whose Reflexive case nothing names fails its frame", async () => {
	const { result } = await frame("🪞😳", [subject]);
	expect(frameOf(result.changes)).toBeUndefined();
	expect(result.failures).toEqual([
		expect.objectContaining({
			aspect: "valency",
			leaf: "Reflexive",
			code: "Unresolved",
		}),
	]);
});

test("a Reading without 🪞 drops a Required Reflexive Slot and keeps an Optional one", async () => {
	const required = await frame("😳", [subject, reflexive("Acc")]);
	expect(frameOf(required.result.changes)).toEqual([subject]);
	expect(required.trace?.events).toContainEqual(
		expect.objectContaining({ name: "DroppedValencySlots" }),
	);
	const optional = await frame("😳", [subject, reflexive("Acc", "Optional")]);
	expect(frameOf(optional.result.changes)).toEqual([
		subject,
		reflexive("Acc", "Optional"),
	]);
});

test("a fixed phrase's Reflexive keeps the preposition the occurrence realized it after", async () => {
	const ausser = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADP",
		canonicalForm: "außer",
		coreFeatures: {},
	} as const;
	const evidence = {
		member: 2,
		complement: {
			kind: "Reflexive",
			governedCase: "Dat",
			preposition: ausser,
		},
		realizedCase: "Dat",
	};
	const { result } = await frame("🪞😡", [subject], [evidence], "New", {
		lemma: besideOneself,
		sentence: "Er war außer sich.",
		target: ["war", "außer", "sich"],
	});
	expect(frameOf(result.changes)).toEqual([
		subject,
		{
			status: "Required",
			complements: [
				{ kind: "Reflexive", governedCase: "Dat", preposition: ausser },
			],
		},
	]);
});
