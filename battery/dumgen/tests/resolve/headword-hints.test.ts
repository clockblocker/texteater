import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { fakeJev, resolveOnce, sentenceOf, unitOf, writes } from "./support.js";

// A stored Lemma reaches Luna as a hint only when it was found under a
// member the headword holds (#1339): Luna took a hint it was offered
// outright (#1337), so one found only under an auxiliary, a reflexive or
// an article would name the wrong word.

const verb = (canonicalForm: string): Dumling.Lemma<"de"> => ({
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "VERB",
	canonicalForm,
	coreFeatures: { hasSepPrefix: null },
});

test("a stored Lemma found only under an auxiliary is no hint for the verb it serves", async () => {
	// Sie0 _1 wird2 _3 schwimmen4 .5: wird is the future's werden.
	const luna = writes("schwimmen");
	await resolveOnce(
		{ jev: fakeJev({ aux_m0: "u0" }).ask, luna: luna.ask },
		{
			sentence: sentenceOf("Sie wird schwimmen."),
			unit: unitOf([2, 4], "Lexeme/VERB"),
			lemmaCandidates: [
				{ lemma: verb("werden"), foundUnder: ["wird"] },
				{ lemma: verb("schwimmen"), foundUnder: ["schwimmen"] },
				{ lemma: verb("schwimmern"), foundUnder: ["schwimmen"] },
			],
		},
	);
	expect(luna.sent.length).toBeGreaterThan(0);
	for (const { input } of luna.sent)
		expect(input).toHaveProperty("lemmaCandidates", [
			{
				canonicalForm: "schwimmen",
				coreFeatures: { hasSepPrefix: null },
			},
			{
				canonicalForm: "schwimmern",
				coreFeatures: { hasSepPrefix: null },
			},
		]);
});
