import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { attestationExpletiveSpellingIssues } from "../src/check-expletive-spelling.js";

// A clitic 's is a way of writing es: Fused in Mir geht's gut, Shorthand in
// Wenn 's morgen regnet.
const fusedEs = (attested: string, spelling: string, surface = "es") => ({
	attested,
	orthography: "Fused",
	fusion: {
		spelling,
		components: [
			{ span: "geht", surface: "geht" },
			{ span: attested, surface },
		],
	},
	component: 1,
});
const gehtEs = {
	unitKind: "Surface",
	language: "de",
	normalizedSurface: "geht es",
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "gehen",
		coreFeatures: { hasSepPrefix: null, lexicallyReflexive: null },
	},
	inflectionalFeatures: {
		verbForm: "Fin",
		tense: "Pres",
		mood: "Ind",
		person: "3",
		number: "Sing",
		expletive: "Subject",
		perfect: null,
		future: null,
		passive: null,
		voice: null,
	},
};
/** An Attestation as Dumling parses it; Dumling never reads the spelling. */
function attest(input: Record<string, unknown>): Dumling.Attestation {
	const parsed = parseUnit({
		unitKind: "Attestation",
		surface: gehtEs,
		realizationCoverage: "Full",
		valencyEvidence: [],
		...input,
	});
	if (!parsed.success || parsed.chain.unitKind !== "Attestation")
		throw Error(`Dumling rejects ${JSON.stringify(input)}`);
	return parsed.chain.value;
}
const issues = (evidence: { attested: string; orthography: string }) =>
	attestationExpletiveSpellingIssues(
		attest({
			members: [{ attested: "geht", orthography: "Standard" }, evidence],
			expletiveEvidence: evidence,
		}),
	);

test("subject evidence spells es in full, as a Fused or Shorthand clitic, or as a Typo", () => {
	for (const evidence of [
		{ attested: "es", orthography: "Standard" },
		{ attested: "Es", orthography: "Standard" },
		fusedEs("'s", "geht's"),
		fusedEs("’s", "geht’s"),
		fusedEs("s", "gehts"),
		{ attested: "'s", orthography: "Shorthand" },
		{ attested: "’s", orthography: "Shorthand" },
		{ attested: "'S", orthography: "Shorthand" },
		{ attested: "Ess", orthography: "Typo" },
	])
		expect(issues(evidence)).toEqual([]);
});

test("subject evidence fails on any other spelling", () => {
	for (const evidence of [
		// A full es is Standard, never Fused or Shorthand.
		{ attested: "es", orthography: "Shorthand" },
		fusedEs("es", "gehtes"),
		// A clitic that is not es.
		{ attested: "'n", orthography: "Shorthand" },
		{ attested: "'ne", orthography: "Shorthand" },
		{ attested: "`s", orthography: "Shorthand" },
		fusedEs("'m", "geht'm"),
		// A Fused s that realizes another word, as in ins.
		fusedEs("s", "gehts", "das"),
		// A clitic spelling is no Standard es.
		{ attested: "'s", orthography: "Standard" },
	])
		expect(issues(evidence)).toEqual([
			{
				path: "expletiveEvidence",
				message: `${evidence.attested} (${evidence.orthography}) does not spell the subject expletive es`,
			},
		]);
});

test("a verb without a subject expletive has nothing to check", () => {
	const geht = attest({
		surface: {
			...gehtEs,
			normalizedSurface: "geht",
			inflectionalFeatures: {
				...gehtEs.inflectionalFeatures,
				expletive: null,
			},
		},
		members: [{ attested: "geht", orthography: "Standard" }],
		expletiveEvidence: null,
	});
	expect(attestationExpletiveSpellingIssues(geht)).toEqual([]);
});
