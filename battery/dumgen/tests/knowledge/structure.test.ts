import { expect, test } from "bun:test";
import type * as Dumrel from "dumrel/types";
import {
	knowledgeInput,
	knowledgeJev,
	knowledgeLuna,
	produceOnce,
} from "./support.js";

const noun = {
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Strauß",
	coreFeatures: { gender: "Masc" },
};
const adjective = (canonicalForm: string) => ({
	family: "Lexeme",
	kind: "ADJ",
	canonicalForm,
	coreFeatures: { comparable: null },
});

test("the plural dimension is the forms when jev judges a plural, else jev's marker; a plural with no form is Unresolved", async () => {
	const run = (plurality: string, forms: string[]) =>
		produceOnce(
			{
				jev: knowledgeJev({ plurality }).ask,
				luna: knowledgeLuna({ plural: forms }).ask,
			},
			knowledgeInput(noun, "💐", "Sie bekam einen Strauß.", ["Strauß"], {
				request: {},
				paradigm: { dimensions: ["plural"] },
			}),
		);
	const marker = (value: string): Dumrel.ParadigmChange[] => [
		{
			kind: "Contribute",
			dimension: "plural",
			value,
			provenance: "Produced",
		},
		{
			kind: "License",
			dimension: "plural",
			reading: expect.objectContaining({ emojiDescription: "💐" }),
			variants: [value],
		},
	];
	expect(
		(await run("PluralOnly", ["Sträuße"])).result.paradigmChanges,
	).toEqual(marker("PluralOnly"));
	expect((await run("NoPlural", [])).result.paradigmChanges).toEqual(
		marker("NoPlural"),
	);
	expect((await run("HasPlural", [])).result.failures).toEqual([
		expect.objectContaining({ aspect: "plural", code: "Unresolved" }),
	]);
});

test("a participle's source verb is named by form, checked by jev, and its meaning judged (ADR 0036)", async () => {
	const source = {
		verb: "verlieben",
		reflexive: "Acc",
		separablePrefix: null,
		preterite: "verliebte",
		participle: "verliebt",
	};
	const verbal = knowledgeJev({ form: "Participle", meaning: "Verbal" });
	const { result } = await produceOnce(
		{
			jev: verbal.ask,
			luna: knowledgeLuna({ participleSource: source }).ask,
		},
		knowledgeInput(
			adjective("verliebt"),
			"😍",
			"Sie ist verliebt.",
			["verliebt"],
			{
				request: { participleSource: null },
			},
		),
	);
	expect(result.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "participleSource",
			value: {
				verb: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "VERB",
					canonicalForm: "sich verlieben",
					coreFeatures: {
						hasSepPrefix: null,
						lexicallyReflexive: "Acc",
					},
				},
				meaning: "Verbal",
			},
		},
	]);
	expect(verbal.stages()).toEqual(["participleJudgment"]);

	// The judge refuses the form: no source.
	const refused = await produceOnce(
		{
			jev: knowledgeJev({ form: "NotParticiple", meaning: "Verbal" }).ask,
			luna: knowledgeLuna({ participleSource: source }).ask,
		},
		knowledgeInput(
			adjective("verliebt"),
			"😍",
			"Sie ist verliebt.",
			["verliebt"],
			{
				request: { participleSource: null },
			},
		),
	);
	expect(refused.result).toEqual({
		changes: [],
		paradigmChanges: [],
		pendingRelations: [],
		failures: [],
	});

	// A plain adjective, or a participle spelled otherwise, takes no judgment.
	const plain = knowledgeJev();
	const none = await produceOnce(
		{
			jev: plain.ask,
			luna: knowledgeLuna({
				participleSource: { ...source, participle: "verlobt" },
			}).ask,
		},
		knowledgeInput(
			adjective("verliebt"),
			"😍",
			"Sie ist verliebt.",
			["verliebt"],
			{
				request: { participleSource: null },
			},
		),
	);
	expect(none.result.changes).toEqual([]);
	expect(plain.sent).toEqual([]);
});

test("a Partizip I is checked by code, so jev judges only its meaning; an inseparable prefix is never separable (#887)", async () => {
	// Luna names the Partizip II, but the adjective is the Partizip I.
	const judge = knowledgeJev({ meaning: "Verbal" });
	const { result } = await produceOnce(
		{
			jev: judge.ask,
			luna: knowledgeLuna({
				participleSource: {
					verb: "duften",
					reflexive: null,
					separablePrefix: null,
					preterite: "duftete",
					participle: "geduftet",
				},
			}).ask,
		},
		knowledgeInput(
			adjective("duftend"),
			"👃",
			"Ein duftend Brot.",
			["duftend"],
			{ request: { participleSource: null } },
		),
	);
	expect(result.changes).toEqual([
		expect.objectContaining({
			aspect: "participleSource",
			value: expect.objectContaining({ meaning: "Verbal" }),
		}),
	]);
	expect(Object.keys(judge.sent[0]?.questions ?? {})).toEqual(["meaning"]);

	const inseparable = await produceOnce(
		{
			jev: knowledgeJev({ form: "Participle", meaning: "Verbal" }).ask,
			luna: knowledgeLuna({
				participleSource: {
					verb: "verstecken",
					reflexive: null,
					separablePrefix: "ver",
					preterite: "versteckte",
					participle: "versteckt",
				},
			}).ask,
		},
		knowledgeInput(
			adjective("versteckt"),
			"🙈",
			"Ein versteckt Haus.",
			["versteckt"],
			{ request: { participleSource: null } },
		),
	);
	expect(inseparable.result.changes).toEqual([
		expect.objectContaining({
			value: expect.objectContaining({
				verb: expect.objectContaining({
					canonicalForm: "verstecken",
					coreFeatures: {
						hasSepPrefix: null,
						lexicallyReflexive: null,
					},
				}),
			}),
		}),
	]);
});

const locution = (
	kind: string,
	canonicalForm: string,
	coreFeatures: Readonly<Record<string, unknown>> = {},
) => ({
	family: "Locution",
	kind,
	canonicalForm,
	coreFeatures,
});

test("Locution Type, Saying Type with its attribution and Formula Role are judged; Collocation is offered only to a VERB (#669)", async () => {
	const jev = knowledgeJev({ locutionType: "Collocation" });
	const { result } = await produceOnce(
		{ jev: jev.ask, luna: knowledgeLuna({}).ask },
		knowledgeInput(
			locution("VERB", "in Erwägung ziehen"),
			"🤔",
			"Sie zogen es in Erwägung.",
			["zogen", "in", "Erwägung"],
			{ request: { locutionType: null } },
		),
	);
	expect(result.changes).toEqual([
		{ kind: "Contribute", aspect: "locutionType", value: "Collocation" },
	]);
	const adverbJev = knowledgeJev({ locutionType: "Neither" });
	const adverb = await produceOnce(
		{ jev: adverbJev.ask, luna: knowledgeLuna({}).ask },
		knowledgeInput(
			locution("ADV", "Knall auf Fall", { comparable: null }),
			"⚡",
			"Er ging Knall auf Fall.",
			["Knall", "auf", "Fall"],
			{ request: { locutionType: null } },
		),
	);
	expect(adverb.result.changes).toEqual([]);
	const question = adverbJev.sent[0]?.questions.locutionType;
	expect(
		question?.type === "choice" ? Object.keys(question.criteria ?? {}) : [],
	).toEqual(["Idiom", "Neither"]);

	const sayingLuna = knowledgeLuna({
		attribution: "Friedrich Schiller, Wilhelm Tell",
	});
	const saying = await produceOnce(
		{
			jev: knowledgeJev({ sayingType: "WingedWord" }).ask,
			luna: sayingLuna.ask,
		},
		knowledgeInput(
			{
				family: "Saying",
				kind: "Saying",
				canonicalForm: "Die Axt im Haus erspart den Zimmermann",
				coreFeatures: {},
			},
			"🪓",
			"Die Axt im Haus erspart den Zimmermann.",
			["Die", "Axt", "im", "Haus", "erspart", "den", "Zimmermann"],
			{ request: { sayingType: null } },
		),
	);
	expect(saying.result.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "sayingType",
			value: {
				type: "WingedWord",
				attribution: "Friedrich Schiller, Wilhelm Tell",
			},
		},
	]);
	expect(sayingLuna.aspects()).toEqual(["attribution"]);

	const formula = await produceOnce(
		{
			jev: knowledgeJev({ formulaRole: "Farewell" }).ask,
			luna: knowledgeLuna({}).ask,
		},
		knowledgeInput(
			locution("INTJ", "bis bald"),
			"👋",
			"Bis bald!",
			["Bis", "bald"],
			{ request: { formulaRole: null } },
		),
	);
	expect(formula.result.changes).toEqual([
		{ kind: "Contribute", aspect: "formulaRole", value: "Farewell" },
	]);
});
