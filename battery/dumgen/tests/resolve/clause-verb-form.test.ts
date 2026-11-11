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

// The open verbs that govern a bare infinitive (#1342) count as a modal
// does, in a VERB unit of the clause.

test("beside a finite form of lassen, gehen or lernen in its clause a verb jev reads as finite is an infinitive", async () => {
	// Sie0 _1 lässt2 _3 die4 _5 Kinder6 _7 spielen8 .9
	const kept = await clicked(
		"Sie lässt die Kinder spielen.",
		[
			[[0], "Lexeme/PRON"],
			[[2], "Lexeme/VERB"],
			[[4, 6], "Lexeme/NOUN"],
			[[8], "Lexeme/VERB"],
		],
		3,
	);
	expect(kept.surface).toMatchObject({
		inflectionalFeatures: { verbForm: "Inf", mood: null, tense: null },
	});
	// Sie0 _1 geht2 _3 einkaufen4 .5
	const gone = await clicked(
		"Sie geht einkaufen.",
		[
			[[0], "Lexeme/PRON"],
			[[2], "Lexeme/VERB"],
			[[4], "Lexeme/VERB"],
		],
		2,
	);
	expect(gone.surface).toMatchObject({
		inflectionalFeatures: { verbForm: "Inf" },
	});
	// Bald0 _1 lernte2 _3 er4 _5 schwimmen6 .7
	const learnt = await clicked(
		"Bald lernte er schwimmen.",
		[
			[[0], "Lexeme/ADV"],
			[[2], "Lexeme/VERB"],
			[[4], "Lexeme/PRON"],
			[[6], "Lexeme/VERB"],
		],
		3,
	);
	expect(learnt.surface).toMatchObject({
		inflectionalFeatures: { verbForm: "Inf" },
	});
});

test("a governor's form in no VERB unit, a governor spelled like its infinitive, or one in a coordinated clause leaves the form to jev", async () => {
	// Sie0 _1 suchten2 _3 eine4 _5 Bleibe6 .7: die Bleibe is a noun.
	const lodging = await clicked(
		"Sie suchten eine Bleibe.",
		[
			[[0], "Lexeme/PRON"],
			[[2], "Lexeme/VERB"],
			[[4, 6], "Lexeme/NOUN"],
		],
		1,
	);
	expect(lodging.surface).toMatchObject({
		inflectionalFeatures: { verbForm: "Fin" },
	});
	expect(lodging.asked).toContain("verbForm");
	// Sie0 _1 gehen2 _3 schwimmen4 .5: gehen may be the infinitive itself.
	const plural = await clicked(
		"Sie gehen schwimmen.",
		[
			[[0], "Lexeme/PRON"],
			[[2], "Lexeme/VERB"],
			[[4], "Lexeme/VERB"],
		],
		2,
	);
	expect(plural.surface).toMatchObject({
		inflectionalFeatures: { verbForm: "Fin" },
	});
	// Er0 _1 geht2 _3 und4 _5 sie6 _7 warten8 .9: und opens a clause of its own.
	const coordinated = await clicked(
		"Er geht und sie warten.",
		[
			[[0], "Lexeme/PRON"],
			[[2], "Lexeme/VERB"],
			[[4], "Lexeme/CCONJ"],
			[[6], "Lexeme/PRON"],
			[[8], "Lexeme/VERB"],
		],
		4,
	);
	expect(coordinated.surface).toMatchObject({
		inflectionalFeatures: { verbForm: "Fin" },
	});
	expect(coordinated.asked).toContain("verbForm");
});
