import { expect, test } from "bun:test";
import { authoredFor, authoredMembers } from "dumcorpus/inventories";
import { parseUnit, routeOf } from "dumling";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { createDumgen } from "../../src/create-dumgen.js";
import { InvalidModelOutput, ProviderFailure } from "../../src/errors.js";
import type { OperationTrace } from "../../src/operation-trace.js";
import { markedSentence } from "../../src/resolve/reading.js";
import type {
	ReadingResolution,
	ResolveReadingInput,
} from "../../src/resolve/types.js";
import { fakeJev, fakeLuna, sentenceOf, unitOf } from "./support.js";

/** The fields of an Attestation's route beyond its Surface's Lemma, spelling and members. */
type RouteFields = {
	readonly inflectionalFeatures?: null;
	readonly articleEvidence?: null;
	readonly valencyEvidence?: readonly [];
};

/**
 * A one-member, canonically spelled Attestation of `lemma`, as far as
 * resolve.reading reads it: its Lemma. `fields` are its route's own, and
 * Dumling checks the whole on the Lemma's route.
 */
function attestationOf(
	lemma: Dumling.Lemma<"de">,
	{ inflectionalFeatures, ...fields }: RouteFields = {},
): Dumling.Attestation<"de"> {
	const parsed = parseUnit(
		{
			unitKind: "Attestation",
			surface: {
				unitKind: "Surface",
				language: "de",
				lemma,
				normalizedSurface: lemma.canonicalForm,
				spelling: { kind: "Canonical" },
				surfaceFeatures: null,
				...(inflectionalFeatures === undefined
					? {}
					: { inflectionalFeatures }),
			},
			members: [
				{ attested: lemma.canonicalForm, orthography: "Standard" },
			],
			realizationCoverage: "Full",
			...fields,
		},
		{ unitKind: "Attestation", ...routeOf(lemma) },
	);
	if (!parsed.success) throw parsed.error;
	return parsed.chain.value;
}

const schloss: Dumling.Lemma<"de", "Lexeme", "NOUN"> = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Schloss",
	coreFeatures: { gender: "Neut" },
};
const schlossAttestation = attestationOf(schloss, {
	inflectionalFeatures: null,
	articleEvidence: null,
	valencyEvidence: [],
});
const sentence = sentenceOf("Das Schloss klemmt.");
const nounUnit = unitOf([2], "Lexeme/NOUN");

/** Luna writing `emojiDescription`, keeping what it was sent. */
const writes = (emojiDescription: unknown) => fakeLuna(() => emojiDescription);

async function readOnce(
	jev: ReturnType<typeof fakeJev>,
	luna: ReturnType<typeof fakeLuna>,
	input: Partial<ResolveReadingInput> & {
		readonly candidates: readonly string[];
	},
): Promise<{ result: ReadingResolution; trace: OperationTrace | undefined }> {
	const traces: OperationTrace[] = [];
	const result = await Effect.runPromise(
		createDumgen({
			jev: jev.ask,
			luna: luna.ask,
			onOperation: (trace) => traces.push(trace),
		}).resolve.reading({
			attestation: schlossAttestation,
			sentence,
			unit: nounUnit,
			...input,
		}),
	);
	return { result, trace: traces[0] };
}

// The judge first, then Luna (ADR 0031, #862).

test("jev sees the stored Emoji Descriptions bare beside the marked Sentence, and its pick is a Reuse as stored", async () => {
	const jev = fakeJev({ reading: "c1" });
	const luna = writes("🔐");
	const { result, trace } = await readOnce(jev, luna, {
		candidates: ["🔒", "🏰", "🔒"],
	});
	expect(result).toEqual({ _tag: "Reuse", emojiDescription: "🏰" });
	expect(luna.sent).toEqual([]);
	const [request] = jev.sent;
	expect(request?.stage).toBe("reading");
	expect(request?.state).toMatchObject({
		markedSentence: "Das <TARGET>Schloss</TARGET> klemmt.",
		lemma: "Schloss",
	});
	expect(request?.state).not.toHaveProperty("candidates");
	const question = request?.questions.reading;
	expect(question?.type).toBe("choice");
	// Duplicates collapse; each option is the bare description.
	expect(
		question?.type === "choice" ? Object.keys(question.criteria) : [],
	).toEqual(["c0", "c1", "NoMatch"]);
	expect(question?.type === "choice" && question.criteria.c1).toBe("🏰");
	expect(trace).toMatchObject({
		operation: "resolve.reading",
		resolution: { outcome: "Reuse", reason: "Judged" },
	});
});

test("after NoMatch Luna writes a New one from the marked Sentence and the Canonical Form alone", async () => {
	const jev = fakeJev({ reading: "NoMatch" });
	const luna = writes("🔐");
	const { result, trace } = await readOnce(jev, luna, {
		candidates: ["🏰"],
	});
	expect(result).toEqual({ _tag: "New", emojiDescription: "🔐" });
	expect(jev.stages()).toEqual(["reading"]);
	expect(luna.sent).toHaveLength(1);
	expect(luna.sent[0]?.input).toEqual({
		markedSentence: "Das <TARGET>Schloss</TARGET> klemmt.",
		lemma: "Schloss",
	});
	// Luna never sees the stored descriptions.
	expect(JSON.stringify(luna.sent[0]?.input)).not.toContain("🏰");
	expect(
		trace?.calls.map(({ stage, executor }) => [stage, executor]),
	).toEqual([
		["reading", "jev"],
		["emojiDescription", "luna"],
	]);
	expect(trace?.resolution).toEqual({ outcome: "New", reason: "Written" });
});

test("with nothing stored, Luna writes at once and jev is not asked", async () => {
	const jev = fakeJev();
	const luna = writes("🔐");
	const { result } = await readOnce(jev, luna, { candidates: [] });
	expect(result).toEqual({ _tag: "New", emojiDescription: "🔐" });
	expect(jev.sent).toEqual([]);
});

test("Luna writing a stored description, compared as Dumling parses it, is a Reuse of the stored one", async () => {
	const jev = fakeJev({ reading: "NoMatch" });
	const luna = writes("🕰️ ");
	const { result, trace } = await readOnce(jev, luna, {
		candidates: ["🏰", "🕰"],
	});
	expect(result).toEqual({ _tag: "Reuse", emojiDescription: "🕰" });
	expect(trace?.resolution).toEqual({
		outcome: "Reuse",
		reason: "Collision",
	});
});

test("Luna's description is stored as Dumling parses it: no variation selector or skin tone", async () => {
	const { result } = await readOnce(fakeJev(), writes("🫳🏽"), {
		candidates: [],
	});
	expect(result).toEqual({ _tag: "New", emojiDescription: "🫳" });
});

// Authored Lemmas and Closed Routes (ADR 0021, #863).

const authoredLemma = (canonicalForm: string, kind: string) => {
	const first = authoredMembers.find(
		({ lemma }) =>
			lemma.canonicalForm === canonicalForm && lemma.kind === kind,
	);
	if (!first) throw Error(`No authored ${kind} ${canonicalForm}`);
	return {
		lemma: first.lemma,
		readings: authoredFor(first.lemma).map(
			({ reading }) => reading.emojiDescription,
		),
	};
};

test("an authored Lemma with one Reading takes it with no call: New until it is stored, then Reuse", async () => {
	const { lemma, readings } = authoredLemma("nicht", "PART");
	expect(readings).toHaveLength(1);
	const [only = ""] = readings;
	const input = {
		attestation: attestationOf(lemma),
		sentence: sentenceOf("Er kommt nicht."),
		unit: unitOf([4], "Lexeme/PART"),
	};
	const jev = fakeJev();
	const luna = writes("🔐");
	const fresh = await readOnce(jev, luna, { ...input, candidates: ["🏰"] });
	expect(fresh.result).toEqual({ _tag: "New", emojiDescription: only });
	expect(fresh.trace?.resolution).toEqual({
		outcome: "New",
		reason: "Authored",
	});
	const stored = await readOnce(jev, luna, {
		...input,
		candidates: [only],
	});
	expect(stored.result).toEqual({ _tag: "Reuse", emojiDescription: only });
	expect(jev.sent).toEqual([]);
	expect(luna.sent).toEqual([]);
});

test("a Closed Route's Lemma with several authored Readings has jev pick among them, with no NoMatch and no Luna", async () => {
	const { lemma, readings } = authoredLemma("welcher", "DET");
	expect(readings.length).toBeGreaterThan(1);
	const jev = fakeJev({ reading: "a1" });
	const luna = writes("🔐");
	const { result, trace } = await readOnce(jev, luna, {
		attestation: attestationOf(lemma, { inflectionalFeatures: null }),
		sentence: sentenceOf("Welcher Zug kommt?"),
		unit: unitOf([0], "Lexeme/DET"),
		candidates: [],
	});
	expect(result).toEqual({
		_tag: "New",
		emojiDescription: readings[1] ?? "",
	});
	expect(jev.stages()).toEqual(["authoredReading"]);
	const question = jev.sent[0]?.questions.reading;
	expect(
		question?.type === "choice" ? Object.keys(question.criteria) : [],
	).toEqual(readings.map((_, index) => `a${index}`));
	expect(luna.sent).toEqual([]);
	expect(trace?.resolution).toEqual({
		outcome: "New",
		reason: "AuthoredJudged",
	});
});

test("an Open Route's authored Readings go to the judge beside the stored ones, and a pick of one not stored yet is New", async () => {
	const { lemma, readings } = authoredLemma("darum", "ADV");
	const [causal = "", other = ""] = readings;
	const jev = fakeJev({ reading: "a1" });
	const luna = writes("🔐");
	const { result, trace } = await readOnce(jev, luna, {
		attestation: attestationOf(lemma, { inflectionalFeatures: null }),
		sentence: sentenceOf("Darum kommt er."),
		unit: unitOf([0], "Lexeme/ADV"),
		candidates: [causal, "🧭"],
	});
	expect(result).toEqual({
		_tag: "New",
		emojiDescription: readings[1] ?? "",
	});
	expect(jev.stages()).toEqual(["reading"]);
	const question = jev.sent[0]?.questions.reading;
	// Authored first, marked a…, then what is stored besides, each once.
	expect(question?.type === "choice" ? question.criteria : {}).toEqual({
		a0: causal,
		a1: other,
		c2: "🧭",
		NoMatch: expect.any(String),
	});
	expect(question?.type === "choice" ? question.instructions : "").toContain(
		"Options a… are the word's authored Readings",
	);
	expect(luna.sent).toEqual([]);
	expect(trace?.resolution).toEqual({ outcome: "New", reason: "Judged" });
});

test("an Open Route's Lemma whose authored Readings miss the sense gets a New one from Luna beside them (#877 R4)", async () => {
	const { lemma, readings } = authoredLemma("darum", "ADV");
	const jev = fakeJev({ reading: "NoMatch" });
	const luna = writes("🎯");
	const { result, trace } = await readOnce(jev, luna, {
		attestation: attestationOf(lemma, { inflectionalFeatures: null }),
		sentence: sentenceOf("Darum geht es."),
		unit: unitOf([0], "Lexeme/ADV"),
		candidates: [],
	});
	expect(result).toEqual({ _tag: "New", emojiDescription: "🎯" });
	expect(jev.stages()).toEqual(["reading"]);
	expect(luna.sent).toHaveLength(1);
	expect(JSON.stringify(luna.sent[0]?.input)).not.toContain(
		readings[0] ?? "",
	);
	expect(trace?.resolution).toEqual({ outcome: "New", reason: "Written" });
	// Luna writing an authored description takes that Reading.
	const collided = await readOnce(
		fakeJev({ reading: "NoMatch" }),
		writes(readings[1]),
		{
			attestation: attestationOf(lemma, { inflectionalFeatures: null }),
			sentence: sentenceOf("Darum geht es."),
			unit: unitOf([0], "Lexeme/ADV"),
			candidates: [],
		},
	);
	expect(collided.result).toEqual({
		_tag: "New",
		emojiDescription: readings[1] ?? "",
	});
	expect(collided.trace?.resolution?.reason).toBe("Collision");
});

test("Luna answers the Emoji Description as JSON under a string schema (#526, E10's arm RS)", async () => {
	const luna = writes("🔐");
	await readOnce(fakeJev(), luna, { candidates: [] });
	expect(luna.sent[0]).toMatchObject({
		outputFormat: "json",
		outputSchema: { type: "string", minLength: 1 },
	});
});

test("a Closed Route's Lemma with no authored Reading is a Catalog Miss, with no call", async () => {
	const jev = fakeJev();
	const luna = writes("🔐");
	const { result, trace } = await readOnce(jev, luna, {
		attestation: attestationOf(
			{
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "PRON",
				canonicalForm: "blarg",
				coreFeatures: {
					case: "Nom",
					gender: null,
					number: "Sing",
					person: "3",
					polite: null,
					poss: null,
					pronType: "Prs",
				},
			},
			{ inflectionalFeatures: null, articleEvidence: null },
		),
		sentence: sentenceOf("Blarg kommt."),
		unit: unitOf([0], "Lexeme/PRON"),
		candidates: [],
	});
	expect(result).toMatchObject({
		_tag: "CatalogMiss",
		route: { language: "de", family: "Lexeme", kind: "PRON" },
	});
	expect(trace?.resolution?.outcome).toBe("CatalogMiss");
	expect(jev.sent).toEqual([]);
	expect(luna.sent).toEqual([]);
});

// A New refused as stale is judged again (ADR 0031 decision 6, #596).

test("a stale New is judged again over the current candidates; a second NoMatch takes the written one with no Luna call", async () => {
	const jev = fakeJev({ reading: "NoMatch" });
	const luna = writes("🧩");
	const { result, trace } = await readOnce(jev, luna, {
		candidates: ["🏰", "🔒"],
		written: "🔐",
	});
	expect(result).toEqual({ _tag: "New", emojiDescription: "🔐" });
	expect(jev.stages()).toEqual(["reading"]);
	expect(luna.sent).toEqual([]);
	expect(trace?.resolution).toEqual({ outcome: "New", reason: "Rejudged" });
});

test("judged again, a pick reuses the Reading stored since, and a written one stored since is reused with no call", async () => {
	const picked = await readOnce(fakeJev({ reading: "c1" }), writes("🧩"), {
		candidates: ["🏰", "🔒"],
		written: "🔐",
	});
	expect(picked.result).toEqual({ _tag: "Reuse", emojiDescription: "🔒" });
	const jev = fakeJev();
	const stored = await readOnce(jev, writes("🧩"), {
		candidates: ["🏰", "🔐"],
		written: "🔐",
	});
	expect(stored.result).toEqual({ _tag: "Reuse", emojiDescription: "🔐" });
	expect(stored.trace?.resolution?.reason).toBe("WrittenStored");
	expect(jev.sent).toEqual([]);
});

// The description Grammar's Canonical Form call drafted stands in for
// Luna's after the judge (ADR 0031).

test("with nothing stored, the drafted description is the New one, with no call", async () => {
	const jev = fakeJev();
	const luna = writes("🧩");
	const { result, trace } = await readOnce(jev, luna, {
		candidates: [],
		drafted: "🔐",
	});
	expect(result).toEqual({ _tag: "New", emojiDescription: "🔐" });
	expect(jev.sent).toEqual([]);
	expect(luna.sent).toEqual([]);
	expect(trace?.resolution).toEqual({ outcome: "New", reason: "Drafted" });
});

test("with stored Readings jev still judges first: its pick is reused and the draft dropped", async () => {
	const jev = fakeJev({ reading: "c0" });
	const luna = writes("🧩");
	const { result } = await readOnce(jev, luna, {
		candidates: ["🏰"],
		drafted: "🔐",
	});
	expect(result).toEqual({ _tag: "Reuse", emojiDescription: "🏰" });
	expect(jev.stages()).toEqual(["reading"]);
	// The judge sees the stored descriptions only, never the draft.
	expect(JSON.stringify(jev.sent[0])).not.toContain("🔐");
	expect(luna.sent).toEqual([]);
});

test("after NoMatch the draft is the New one, and a draft already stored is a Reuse of it", async () => {
	const noMatch = await readOnce(
		fakeJev({ reading: "NoMatch" }),
		writes("🧩"),
		{
			candidates: ["🏰"],
			drafted: "🔐",
		},
	);
	expect(noMatch.result).toEqual({ _tag: "New", emojiDescription: "🔐" });
	expect(noMatch.trace?.calls.map(({ stage }) => stage)).toEqual(["reading"]);
	const collided = await readOnce(
		fakeJev({ reading: "NoMatch" }),
		writes("🧩"),
		{ candidates: ["🏰", "🕰"], drafted: "🕰️" },
	);
	expect(collided.result).toEqual({ _tag: "Reuse", emojiDescription: "🕰" });
	expect(collided.trace?.resolution?.reason).toBe("Collision");
});

test("a stale New judged again keeps the written description over the draft", async () => {
	const { result, trace } = await readOnce(
		fakeJev({ reading: "NoMatch" }),
		writes("🧩"),
		{ candidates: ["🏰"], written: "🔐", drafted: "🗝" },
	);
	expect(result).toEqual({ _tag: "New", emojiDescription: "🔐" });
	expect(trace?.resolution?.reason).toBe("Rejudged");
});

// The error channel (#859, #858) and no salvage (#889).

test("Luna's text that is no Emoji Description is an InvalidModelOutput, neither salvaged nor asked again", async () => {
	const luna = writes("😔 unfortunately");
	const failure = await Effect.runPromise(
		Effect.flip(
			createDumgen({
				jev: fakeJev().ask,
				luna: luna.ask,
			}).resolve.reading({
				attestation: schlossAttestation,
				sentence,
				unit: nounUnit,
				candidates: [],
			}),
		),
	);
	expect(failure).toBeInstanceOf(InvalidModelOutput);
	expect(failure).toMatchObject({ stage: "emojiDescription" });
	expect(luna.sent).toHaveLength(1);
});

test("a jev failure is a ProviderFailure, and a pick outside the options an InvalidModelOutput", async () => {
	const down = fakeJev({}, { fail: () => true });
	const reading = (jev: ReturnType<typeof fakeJev>) =>
		Effect.runPromise(
			Effect.flip(
				createDumgen({
					jev: jev.ask,
					luna: writes("🔐").ask,
				}).resolve.reading({
					attestation: schlossAttestation,
					sentence,
					unit: nounUnit,
					candidates: ["🏰"],
				}),
			),
		);
	expect(await reading(down)).toBeInstanceOf(ProviderFailure);
	expect(down.sent).toHaveLength(1);
	expect(await reading(fakeJev({ reading: "c7" }))).toBeInstanceOf(
		InvalidModelOutput,
	);
});

test("a Foreign Attestation, a unit off its route, a failed Sentence or a candidate that is no Emoji Description is a Defect before anything is asked", async () => {
	const jev = fakeJev();
	const luna = writes("🔐");
	const dumgen = createDumgen({ jev: jev.ask, luna: luna.ask });
	const input: ResolveReadingInput = {
		attestation: schlossAttestation,
		sentence,
		unit: nounUnit,
		candidates: [],
	};
	const foreign = attestationOf({
		unitKind: "Lemma",
		language: "de",
		family: "Foreign",
		kind: "Foreign",
		canonicalForm: "cool",
		coreFeatures: { sourceLang: "en" },
	});
	const cases: [Partial<ResolveReadingInput>, string][] = [
		[
			{
				attestation: foreign,
				unit: unitOf([2], "Foreign/Foreign"),
			},
			"ADR 0045",
		],
		[{ unit: unitOf([2], "Lexeme/VERB") }, "off the unit's route"],
		[{ unit: { segments: [2], route: "Unresolved" } }, "Unresolved"],
		[{ sentence: { ...sentence, failed: true } }, "segment it again"],
		[{ candidates: ["castle"] }, "no Emoji Description"],
		[{ drafted: "castle" }, "The drafted"],
	];
	for (const [change, message] of cases)
		await expect(
			Effect.runPromise(dumgen.resolve.reading({ ...input, ...change })),
		).rejects.toThrow(message);
	expect(jev.sent).toEqual([]);
	expect(luna.sent).toEqual([]);
});

test("the target is marked run by run, as production sends a split unit: each word of es gibt apart, a fused word's pieces together", () => {
	const esGibt = sentenceOf("Es gibt Brot.");
	expect(markedSentence(esGibt.segments, [0, 2])).toBe(
		"<TARGET>Es</TARGET> <TARGET>gibt</TARGET> Brot.",
	);
	const fused = [
		{ text: "Er" },
		{ text: " " },
		{ text: "zu" },
		{ text: "r" },
	];
	expect(markedSentence(fused, [2, 3])).toBe("Er <TARGET>zur</TARGET>");
});
