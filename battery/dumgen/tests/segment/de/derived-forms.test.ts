import { expect, test } from "bun:test";
import { closedVerbForms } from "dumcorpus/inventories";
import {
	articleForms,
	expletiveForms,
	isArticle,
	reflexiveForms,
	reflexiveSubject,
	slotsOf,
} from "../../../src/segment/de/candidates.js";
import {
	einForms,
	objectPronounSubject,
	quantityBisschen,
	seinParticiples,
} from "../../../src/segment/de/code-rules.js";
import { authoredInventory } from "../../../src/segment/de/inventory.js";
import { modalForms } from "../../../src/segment/de/locution-choice.js";
import { sentenceOf } from "../../../src/segment/de/sentence.js";
import { perfectAuxiliaries } from "../../../src/segment/de/verb-choice.js";
import type { Segment } from "../../../src/segment/segmented-sentence.js";

// Each set is derived from dumcorpus/inventories (#976) and pinned to the
// hand-typed set it replaced; only ’s joins the expletive forms.
const sorted = (set: Iterable<string>) => [...set].sort();

test("the article forms are the hand-typed article and short article forms", () => {
	expect(sorted(articleForms)).toEqual(
		sorted([
			"der",
			"die",
			"das",
			"den",
			"dem",
			"des",
			"ein",
			"eine",
			"einen",
			"einem",
			"einer",
			"eines",
			"'ne",
			"'nen",
			"'nem",
			"'ner",
			"ne",
			"nen",
			"n",
			"'n",
			"nem",
			"ner",
		]),
	);
});

test("the reflexive forms and their subjects are the hand-typed ones", () => {
	expect(sorted(reflexiveForms)).toEqual(
		sorted(["sich", "mich", "dich", "uns", "euch", "mir", "dir"]),
	);
	expect(Object.fromEntries(reflexiveSubject)).toEqual({
		mir: "ich",
		mich: "ich",
		uns: "wir",
		dir: "du",
		dich: "du",
		euch: "ihr",
	});
	expect(Object.fromEntries(objectPronounSubject)).toEqual({
		mir: "ich",
		mich: "ich",
		uns: "wir",
		dir: "du",
		dich: "du",
		euch: "ihr",
		ihm: null,
		ihn: null,
		ihnen: null,
	});
});

test("the expletive forms are es, 's and s, and now typographic ’s", () => {
	expect(sorted(expletiveForms)).toEqual(sorted(["es", "'s", "’s", "s"]));
});

test("the code rules' word sets are the hand-typed ones", () => {
	expect(sorted(quantityBisschen)).toEqual(sorted(["bisschen", "bißchen"]));
	expect(sorted(seinParticiples)).toEqual(
		sorted(["worden", "gewesen", "geworden"]),
	);
	expect(sorted(einForms)).toEqual(
		sorted([
			"ein",
			"eine",
			"einen",
			"einem",
			"einer",
			"eines",
			"welche",
			"welcher",
			"welchen",
			"welchem",
			"welches",
		]),
	);
});

test("the modal forms are the forms of the six hand-typed modals", () => {
	expect(sorted(modalForms)).toEqual(
		sorted(
			["dürfen", "können", "mögen", "müssen", "sollen", "wollen"].flatMap(
				(modal) => closedVerbForms[modal] ?? [],
			),
		),
	);
});

test("the perfect auxiliaries are haben's and sein's forms but gehabt and gewesen", () => {
	expect(sorted(perfectAuxiliaries)).toEqual(
		sorted(
			[
				...(closedVerbForms.haben ?? []),
				...(closedVerbForms.sein ?? []),
			].filter((form) => form !== "gehabt" && form !== "gewesen"),
		),
	);
});

const word = (text: string, surface?: string): Segment => ({
	kind: "ResolvableText",
	text,
	...(surface ? { surface } : {}),
});
const space: Segment = { kind: "Whitespace", text: " " };

test("a typographic apostrophe opens the slot its plain one does", () => {
	// Geht0 ’s1 _2 gut3
	const gehts = sentenceOf({
		segments: [word("Geht"), word("’s", "es"), space, word("gut")],
	});
	expect(
		slotsOf(gehts, authoredInventory)
			.filter((slot) => slot.kind === "expletive")
			.map((slot) => slot.piece.text),
	).toEqual(["’s"]);
	// Das0 _1 ist2 _3 ’ne4 _5 Frage6
	const frage = sentenceOf({
		segments: [
			word("Das"),
			space,
			word("ist"),
			space,
			word("’ne", "eine"),
			space,
			word("Frage"),
		],
	});
	const article = frage.pieces[2];
	if (!article) throw Error("Missing ’ne");
	expect(isArticle(article)).toBe(true);
	expect(
		slotsOf(frage, authoredInventory)
			.filter((slot) => slot.kind === "article")
			.map((slot) => slot.piece.text),
	).toEqual(["Das", "’ne"]);
});
