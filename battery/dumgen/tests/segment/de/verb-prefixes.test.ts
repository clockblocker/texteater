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
// (#977), pinned to the hand-typed list it replaced. Taking a word in or
// out changes requests or segmentation (#1057).
const sorted = (set: Iterable<string>) => [...set].sort();

/** The hand-typed `particleForms` and `moreParticleForms` together. */
const slotParticles = [
	..."ab an auf aus bei dabei dar durch ein empor entgegen entlang fehl fern fest fort frei gegenüber heim her herab heran herauf heraus herbei herein herüber herum herunter hervor hin hinab hinauf hinaus hinein hinüber hinunter hinweg hinzu hoch los mit nach nieder raus rein rüber runter rauf ran statt teil um vor voran voraus vorbei vorüber vorweg weg weiter wieder zu zurecht zurück zusammen zuvor über unter kennen preis bloß kaputt klar".split(
		" ",
	),
	..."umher übrig fertig auseinander beiseite hinterher davon dazu dahin daher vorwärts rückwärts entzwei bereit".split(
		" ",
	),
];

test("the particle slot opens on the hand-typed particles", () => {
	expect(sorted(particleForms)).toEqual(sorted(slotParticles));
});

test("the infixed zu follows the hand-typed infix particles", () => {
	expect(sorted(germanInfixParticles)).toEqual(
		sorted(
			"ab an auf aus auseinander bei beiseite bekannt bereit dabei dagegen daher dahin daneben dar davon dazu dazwischen durch ein empor entgegen entlang fehl fertig fest fort fern frei gegenüber gut heim her herab heran herauf heraus herbei herein herüber herum herunter hervor hinab hinauf hinaus hinein hinüber hinunter hinweg hinzu hoch irre kennen klar kund leer los mit nach nahe nieder offen preis sicher spazieren statt stand teil um unter vor voran voraus vorbei vorüber voll wahr weg weiter wider wieder zu zurecht zurück zusammen zuvor".split(
				" ",
			),
		),
	);
});

test("resolution offers the slot particles and da and leid as a VERB's prefix", () => {
	expect(sorted(prefixParticles)).toEqual(
		sorted([...slotParticles, "da", "leid"]),
	);
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
