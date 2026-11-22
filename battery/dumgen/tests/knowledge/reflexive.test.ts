import { expect, test } from "bun:test";
import {
	type ProposedPattern,
	printGermanPattern,
} from "../../src/knowledge/de/valency-notation.js";
import type { GermanKnowledgeChange } from "../../src/knowledge/types.js";
import {
	knowledgeInput,
	knowledgeJev,
	knowledgeLuna,
	produceOnce,
} from "./support.js";

// The Reading's 🪞 settles its Reflexive complement (ADR 0052).

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
const subject = { kind: "Case", governedCase: "Nom" } as const;
const reflexive = (governedCase: "Acc" | "Dat") =>
	({ kind: "Reflexive", governedCase }) as const;
const attestedReflexive = (governedCase: "Acc" | "Dat") => ({
	member: 1,
	complement: { kind: "Reflexive", governedCase },
	realizedCase: governedCase,
});
const frameOf = (changes: readonly GermanKnowledgeChange[]): unknown => {
	const change = changes.find((change) => change.aspect === "valency");
	return change && "value" in change ? change.value : undefined;
};

/** A valency-only run on `emoji`, Luna proposing `pattern`, written in the notation. */
async function frame(
	emoji: string,
	pattern: ProposedPattern,
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
	const luna = knowledgeLuna({
		valency: printGermanPattern(pattern, { verb: true }),
	});
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

test("Luna is offered Reflexive, and a 🪞 Reading's Reflexive uses the creating occurrence's attested case", async () => {
	const { result, luna } = await frame(
		"🪞😳",
		[subject, reflexive("Dat")],
		[attestedReflexive("Acc")],
		"New",
		{
			lemma: verb("schämen"),
			sentence: "Ich schäme mich.",
			target: ["schäme", "mich"],
		},
	);
	expect(luna.sent[0]?.input).toHaveProperty(
		"complementKinds",
		expect.arrayContaining(["Reflexive"]),
	);
	expect(frameOf(result.changes)).toEqual([[subject, reflexive("Acc")]]);
	expect(luna.sent[0]?.systemPrompt).toContain("Test it in the first person");
});

test("a sich names no case, so Luna's case for the meaning stands, and with neither the pattern fails", async () => {
	const hidden = { member: 1, complement: { kind: "Reflexive" } };
	const { result } = await frame(
		"🪞😟",
		[subject, reflexive("Dat")],
		[hidden],
		"New",
		{
			lemma: { ...besideOneself, canonicalForm: "Sorgen machen" },
			sentence: "Er macht sich Sorgen.",
			target: ["macht", "sich", "Sorgen"],
		},
	);
	expect(frameOf(result.changes)).toEqual([[subject, reflexive("Dat")]]);
	const none = await frame("🪞😳", [subject], [hidden]);
	expect(frameOf(none.result.changes)).toBeUndefined();
	expect(none.result.failures).toEqual([
		expect.objectContaining({ aspect: "valency", leaf: "Reflexive" }),
	]);
});

test("a 🪞 Reading gets the occurrence's Reflexive when Luna proposes none, and Luna's case on TopUp", async () => {
	const added = await frame("🪞😳", [subject], [attestedReflexive("Acc")]);
	expect(frameOf(added.result.changes)).toEqual([
		[subject, reflexive("Acc")],
	]);
	const later = await frame(
		"🪞😳",
		[subject, reflexive("Dat")],
		[attestedReflexive("Acc")],
		"TopUp",
	);
	expect(frameOf(later.result.changes)).toEqual([
		[subject, reflexive("Dat")],
	]);
});

test("a 🪞 Reading whose Reflexive case nothing names fails its pattern", async () => {
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

test("a Reading without 🪞 converts an unattested sich into its ordinary Case object, drops it beside one, and keeps an attested optional reflexive", async () => {
	const ordinary = await frame("↪", [subject, reflexive("Acc")]);
	expect(frameOf(ordinary.result.changes)).toEqual([
		[subject, { kind: "Case", governedCase: "Acc" }],
	]);
	const object = { kind: "Case", governedCase: "Acc" } as const;
	const beside = await frame("😳", [subject, reflexive("Acc"), object]);
	expect(frameOf(beside.result.changes)).toEqual([[subject, object]]);
	expect(beside.trace?.events).toContainEqual(
		expect.objectContaining({ name: "DroppedValencyComplements" }),
	);
	const optional = await frame(
		"😳",
		[subject, reflexive("Acc")],
		[{ member: 1, complement: { kind: "Reflexive" } }],
	);
	expect(frameOf(optional.result.changes)).toEqual([
		[subject, reflexive("Acc")],
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
		[
			subject,
			{ kind: "Reflexive", governedCase: "Dat", preposition: ausser },
		],
	]);
});
