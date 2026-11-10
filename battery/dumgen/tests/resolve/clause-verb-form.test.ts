import { expect, test } from "bun:test";
import type { RouteKey } from "../../src/segment/de/routes.js";
import {
	attested,
	fakeJev,
	resolveOnce,
	sentenceOf,
	unitOf,
	writes,
} from "./support.js";

// A dependent infinitive is told from a finite form by its clause (#1339):
// zu before it makes it an infinitive, and beside a modal's finite form
// in another unit of the clause jev's finite reading gives way to the
// likeliest of infinitive and participle.

/** jev reads every verb as finite where it may: only the clause rules that out. */
const finite = {
	prefix: "None",
	verbForm: "Fin",
	mood: "Ind",
	tense: "Pres",
	person: "3",
	number: "Plur",
};

async function clicked(
	text: string,
	routes: readonly (readonly [number[], RouteKey])[],
	at: number,
	form = "Fin",
) {
	const units = routes.map(([segments, key]) => unitOf(segments, key));
	const unit = units[at];
	if (!unit) throw Error("no unit");
	const jev = fakeJev({ ...finite, verbForm: form });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("warten").ask },
		{ sentence: { ...sentenceOf(text), units }, unit },
	);
	return {
		surface: attested(result).surface,
		asked: jev.questions("grammar"),
	};
}

test("beside a modal's finite form in its clause a verb jev reads as finite is an infinitive, and a participle stays one", async () => {
	// Sie0 _1 mussten2 _3 lange4 _5 warten6 .7
	const units: readonly (readonly [number[], RouteKey])[] = [
		[[0], "Lexeme/PRON"],
		[[2], "Lexeme/VERB"],
		[[4], "Lexeme/ADV"],
		[[6], "Lexeme/VERB"],
	];
	const waited = await clicked("Sie mussten lange warten.", units, 3);
	expect(waited.surface).toMatchObject({
		inflectionalFeatures: { verbForm: "Inf", mood: null, tense: null },
	});
	// Es0 _1 kann2 _3 abgenommen4 _5 werden6 .7 is no infinitive of abnehmen.
	const taken = await clicked(
		"Es kann abgenommen werden.",
		[
			[[0], "Lexeme/PRON"],
			[[2], "Lexeme/VERB"],
			[[4], "Lexeme/VERB"],
			[[6], "Lexeme/VERB"],
		],
		2,
		"Part",
	);
	expect(taken.surface).toMatchObject({
		inflectionalFeatures: { verbForm: "Part" },
	});
});

test("zu right before a verb makes it an infinitive", async () => {
	// Sie0 _1 versucht2 _3 zu4 _5 warten6 .7
	const { surface } = await clicked(
		"Sie versucht zu warten.",
		[
			[[0], "Lexeme/PRON"],
			[[2], "Lexeme/VERB"],
			[[4], "Lexeme/PART"],
			[[6], "Lexeme/VERB"],
		],
		3,
	);
	expect(surface).toMatchObject({
		inflectionalFeatures: { verbForm: "Inf" },
	});
});

test("a modal spelled like its infinitive, or one past a comma, leaves the form to jev", async () => {
	// Wir0 _1 müssen2 _3 warten4 .5: müssen may be the infinitive itself.
	const ambiguous = await clicked(
		"Wir müssen warten.",
		[
			[[0], "Lexeme/PRON"],
			[[2], "Lexeme/VERB"],
			[[4], "Lexeme/VERB"],
		],
		2,
	);
	expect(ambiguous.surface).toMatchObject({
		inflectionalFeatures: { verbForm: "Fin" },
	});
	expect(ambiguous.asked).toContain("verbForm");
	// Er0 _1 kann2 ,3 _4 wir5 _6 warten7 .8: the comma ends kann's clause.
	const apart = await clicked(
		"Er kann, wir warten.",
		[
			[[0], "Lexeme/PRON"],
			[[2], "Lexeme/VERB"],
			[[5], "Lexeme/PRON"],
			[[7], "Lexeme/VERB"],
		],
		3,
	);
	expect(apart.surface).toMatchObject({
		inflectionalFeatures: { verbForm: "Fin" },
	});
});
