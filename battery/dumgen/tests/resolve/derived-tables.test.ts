import { expect, test } from "bun:test";
import { authoredMembers } from "dumcorpus/inventories";
import {
	drShortenings,
	rShortenings,
} from "../../src/resolve/de/member-spelling.js";
import {
	bareWWords,
	suppletivePositive,
} from "../../src/resolve/de/open-route/adverbial.js";
import {
	auxiliaryFeatures,
	auxiliaryUse,
	reflexives,
} from "../../src/resolve/de/open-route/verbal.js";
import { auxiliaryUses } from "../../src/resolve/de/prompts.js";

// Resolution's tables read from dumcorpus/inventories (#978, #979), each
// pinned to the hand-typed table it replaced. Only draus and drunter are new.

test("the r- shorthands are the hand-typed ones", () => {
	expect(rShortenings).toEqual({
		rein: ["herein", "hinein"],
		raus: ["heraus", "hinaus"],
		rüber: ["herüber", "hinüber"],
		runter: ["herunter", "hinunter"],
		rauf: ["herauf", "hinauf"],
		ran: ["heran"],
		rum: ["herum"],
	});
});

test("the dr- shorthands are the hand-typed ones plus draus and drunter", () => {
	expect(drShortenings).toEqual({
		dran: ["daran"],
		drauf: ["darauf"],
		draus: ["daraus"],
		drin: ["darin"],
		drüber: ["darüber"],
		drum: ["darum"],
		drunter: ["darunter"],
	});
});

test("each suppletive compared form cites the hand-typed positive", () => {
	expect(Object.fromEntries(suppletivePositive)).toEqual({
		lieber: "gern",
		liebsten: "gern",
		eher: "bald",
		ehesten: "bald",
		besser: "gut",
		besten: "gut",
		mehr: "viel",
		meisten: "viel",
		weniger: "wenig",
		wenigsten: "wenig",
	});
});

test("the bare w-words are the hand-typed ones", () => {
	expect([...bareWWords].sort()).toEqual(
		["wo", "wie", "wann", "woher", "wohin"].sort(),
	);
});

test("a lexical reflexive shows the hand-typed case", () => {
	expect(Object.fromEntries(reflexives)).toEqual({
		sich: undefined,
		uns: undefined,
		euch: undefined,
		mich: "Acc",
		dich: "Acc",
		mir: "Dat",
		dir: "Dat",
	});
	expect([...reflexives.keys()].sort()).toEqual(
		["sich", "uns", "euch", "mich", "dich", "mir", "dir"].sort(),
	);
});

test("each auxiliary use makes the hand-typed Surface features", () => {
	expect(Object.fromEntries(auxiliaryFeatures)).toEqual({
		"haben 🏁": { perfect: "Yes" },
		"sein 🏁": { perfect: "Yes" },
		"werden 🔮": { future: "Yes" },
		"werden 🔄": { passive: "Process", voice: "Pass" },
		"bekommen 🎁": { passive: "Recipient", voice: "Pass" },
		"lassen 🗣👉": { voice: "Cau" },
	});
});

test("the AUX question's prompt text names exactly the authored AUX uses", () => {
	// A re-emojied AUX member would otherwise drop out of the question.
	expect(Object.keys(auxiliaryUses).sort()).toEqual(
		authoredMembers
			.filter(({ lemma }) => lemma.kind === "AUX")
			.map(auxiliaryUse)
			.sort(),
	);
});
