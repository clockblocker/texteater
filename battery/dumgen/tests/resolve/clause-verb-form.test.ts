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
// zu before it, or a modal's finite form in another unit of the clause.

/** jev reads every verb as finite: only the clause can make it an infinitive. */
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
) {
	const units = routes.map(([segments, key]) => unitOf(segments, key));
	const unit = units[at];
	if (!unit) throw Error("no unit");
	const jev = fakeJev(finite);
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("warten").ask },
		{ sentence: { ...sentenceOf(text), units }, unit },
	);
	return {
		surface: attested(result).surface,
		asked: jev.questions("grammar"),
	};
}

test("beside a modal's finite form in its clause a verb is an infinitive, and its form is not asked", async () => {
	// Sie0 _1 mussten2 _3 lange4 _5 warten6 .7
	const { surface, asked } = await clicked(
		"Sie mussten lange warten.",
		[
			[[0], "Lexeme/PRON"],
			[[2], "Lexeme/VERB"],
			[[4], "Lexeme/ADV"],
			[[6], "Lexeme/VERB"],
		],
		3,
	);
	expect(surface).toMatchObject({
		inflectionalFeatures: {
			verbForm: "Inf",
			mood: null,
			tense: null,
		},
	});
	expect(asked).not.toContain("verbForm");
	expect(asked).not.toContain("mood");
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
