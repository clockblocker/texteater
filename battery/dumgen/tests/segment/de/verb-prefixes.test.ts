import { expect, test } from "bun:test";
import {
	germanInseparablePrefixes,
	germanSeparablePrefixes,
} from "dumcorpus/inventories";
import { prefixParticles } from "../../../src/resolve/de/open-route/verbal.js";
import { particleForms } from "../../../src/segment/de/candidates.js";
import { strandedTails } from "../../../src/segment/de/code-rules.js";
import { germanInfixParticles } from "../../../src/segment/de/fusion-entries.js";

// Each selection is a named filter over dumcorpus's separable prefixes
// (#977). #1057 decided which words each filter holds out; taking a word
// in or out changes requests or segmentation.
const sorted = (set: Iterable<string>) => [...set].sort();

const without = (held: string) => {
	const out = new Set(held.split(" "));
	return [...germanSeparablePrefixes].filter((word) => !out.has(word));
};

/** The words that open no particle slot (#1057). */
const noSlot =
	"bekannt da dagegen flach groß gut irre leer offen sicher stand voll";

test("the particle slot opens on every separable prefix but the held-out words", () => {
	expect(sorted(particleForms)).toEqual(sorted(without(noSlot)));
	for (const word of "leid wahr nahe kund wider daneben dazwischen durcheinander darnieder".split(
		" ",
	))
		expect(particleForms.has(word)).toBe(true);
});

test("the infixed zu takes every separable prefix but da and hin", () => {
	expect(sorted(germanInfixParticles)).toEqual(sorted(without("da hin")));
});

test("resolution offers the slot particles and the held-out words but irre and stand", () => {
	expect(sorted(prefixParticles)).toEqual(sorted(without("irre stand")));
});

test("the stranded tails are the hand-typed prepositions", () => {
	expect(sorted(strandedTails)).toEqual(
		sorted(["für", "von", "gegen", "in", "neben", "hinter", "zwischen"]),
	);
});

test("the inseparable prefixes are the hand-typed ones", () => {
	expect(sorted(germanInseparablePrefixes)).toEqual(
		sorted(["be", "emp", "ent", "er", "ge", "miss", "ver", "zer"]),
	);
});

test("every Dumgen particle selection is a dumcorpus separable prefix", () => {
	const outside = [
		...particleForms,
		...germanInfixParticles,
		...prefixParticles,
	].filter((word) => !germanSeparablePrefixes.has(word));
	expect(outside).toEqual([]);
});
