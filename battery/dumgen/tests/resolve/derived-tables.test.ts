import { expect, test } from "bun:test";
import {
	drShortenings,
	rShortenings,
} from "../../src/resolve/de/member-spelling.js";
import {
	bareWWords,
	reflexives,
	suppletivePositive,
} from "../../src/resolve/de/open-route.js";

// Resolution's tables read from dumcorpus/inventories (#978), each pinned
// to the hand-typed table it replaced. Only draus and drunter are new.

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
