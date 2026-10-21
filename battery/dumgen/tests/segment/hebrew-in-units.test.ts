import { expect, test } from "bun:test";
import { intake } from "./hebrew-intake-fixture.js";
import { lexeme } from "./hebrew-route-fixture.js";

test("Hebrew intake keeps source pieces while articles share their Heads", async () => {
	const government = await intake("והממשלה");
	expect(government.sentence).toMatchObject({
		text: "והממשלה",
		segments: [
			{ kind: "ResolvableText", text: "ו" },
			{ kind: "ResolvableText", text: "ה" },
			{ kind: "ResolvableText", text: "ממשלה" },
		],
		units: [
			{ segments: [0], route: lexeme("CCONJ") },
			{ segments: [1, 2], route: lexeme("NOUN") },
		],
	});
	expect(government.sentence?.segments.map(({ text }) => text).join("")).toBe(
		"והממשלה",
	);
	expect(government.stages).toEqual(["segments", "units", "route"]);

	const house = await intake("הבית");
	expect(house.sentence?.segments.map(({ text }) => text)).toEqual([
		"ה",
		"בית",
	]);
	expect(house.sentence?.units).toEqual([
		{ segments: [0, 1], route: lexeme("NOUN") },
	]);

	const dana = await intake("ודנה");
	expect(dana.sentence?.segments.map(({ text }) => text)).toEqual([
		"ו",
		"דנה",
	]);
	expect(dana.sentence?.units).toEqual([
		{ segments: [0], route: lexeme("CCONJ") },
		{ segments: [1], route: lexeme("PROPN") },
	]);

	const toHouse = await intake("ולבית");
	expect(toHouse.sentence?.segments.map(({ text }) => text)).toEqual([
		"ו",
		"ל",
		"בית",
	]);
	expect(toHouse.sentence?.units).toEqual([
		{ segments: [0], route: lexeme("CCONJ") },
		{ segments: [1, 2], route: "Unresolved" },
	]);

	const fromHouse = await intake("מבית");
	expect(fromHouse.sentence?.segments.map(({ text }) => text)).toEqual([
		"מ",
		"בית",
	]);

	const lexicalInitial = await intake("שבית");
	expect(lexicalInitial.sentence?.segments.map(({ text }) => text)).toEqual([
		"שבית",
	]);
});

test("Hebrew intake never splits a niqqud grapheme cluster", async () => {
	const { sentence } = await intake("וְהַמֶּמְשָׁלָה");
	expect(sentence?.segments.map(({ text }) => text)).toEqual([
		"וְ",
		"הַ",
		"מֶּמְשָׁלָה",
	]);
	expect(sentence?.segments.map(({ text }) => text).join("")).toBe("וְהַמֶּמְשָׁלָה");
});

test("Hebrew lets the contextual judge split a maqaf compound", async () => {
	const { sentence } = await intake("בית־ספר");
	expect(sentence?.segments).toEqual([
		{ kind: "ResolvableText", text: "בית" },
		{ kind: "Punctuation", text: "־" },
		{ kind: "ResolvableText", text: "ספר" },
	]);
});

test("Hebrew keeps formatted numbers and internal abbreviation marks clickable", async () => {
	const { sentence } = await intake(
		"ב־1.5.2025 היו 18,696 תלמידים; רמב״ם אמר׃",
	);
	expect(sentence?.segments).toEqual([
		{ kind: "ResolvableText", text: "ב־1.5.2025" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "היו" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "18,696" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "תלמידים" },
		{ kind: "Punctuation", text: ";" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "רמב״ם" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "אמר" },
		{ kind: "Punctuation", text: "׃" },
	]);
	expect(sentence?.segments.map(({ text }) => text).join("")).toBe(
		"ב־1.5.2025 היו 18,696 תלמידים; רמב״ם אמר׃",
	);
});

test("Hebrew keeps standalone integers and times as clickable numeric Segments", async () => {
	const { sentence } = await intake("בשנת 2026 היו 3 מפגשים ב־08:30.");
	expect(
		sentence?.segments.map(({ kind, text }) => ({ kind, text })),
	).toEqual([
		{ kind: "ResolvableText", text: "בשנת" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "2026" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "היו" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "3" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "מפגשים" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "ב־08" },
		{ kind: "Punctuation", text: ":" },
		{ kind: "ResolvableText", text: "30" },
		{ kind: "Punctuation", text: "." },
	]);
	expect(sentence?.segments.map(({ text }) => text).join("")).toBe(
		"בשנת 2026 היו 3 מפגשים ב־08:30.",
	);
	expect(
		sentence?.units
			.flatMap(({ segments }) => segments)
			.sort((a, b) => a - b),
	).toEqual(
		sentence?.segments.flatMap(({ kind }, index) =>
			kind === "ResolvableText" ? [index] : [],
		),
	);
});

test("Hebrew joins fixed lexical cores with their source-split articles", async () => {
	const definiteConstruct = await intake("בית הספר");
	expect(definiteConstruct.sentence?.units).toEqual([
		{ segments: [0, 2, 3], route: "Unresolved" },
	]);

	const mediterranean = await intake("הים התיכון");
	expect(mediterranean.sentence?.units).toEqual([
		{ segments: [0, 1, 3, 4], route: "Unresolved" },
	]);

	const freePreposition = await intake("של ארצות הברית");
	expect(freePreposition.sentence?.units).toEqual([
		{ segments: [0], route: lexeme("ADP") },
		{ segments: [2, 4], route: "Unresolved" },
	]);

	const nonFixed = await intake("בית גדול");
	expect(nonFixed.sentence?.units).toEqual([
		{ segments: [0], route: lexeme("NOUN") },
		{ segments: [2], route: lexeme("ADJ") },
	]);
});

test("Hebrew contextual multiword unit membership falls back below the confidence floor", async () => {
	const { sentence } = await intake("בית ספר", true);
	expect(sentence?.units).toEqual([
		{ segments: [0], route: lexeme("NOUN") },
		{ segments: [2], route: lexeme("NOUN") },
	]);
});

test("Hebrew smoke excerpts preserve every grapheme and unit membership", async () => {
	for (const excerpt of [
		"יש להגיש את הבקשה למידע מוקדם באופן מקוון.",
		'כשאנו אומרים את המשפט: "הילדים הלכו לביתם" יש כאן שלוש מילות יסוד.',
		"חיפה היא עיר נמל בצפון ישראל הממוקמת במורדות הר כרמל לחוף הים התיכון.",
	]) {
		const { sentence } = await intake(excerpt);
		expect(sentence?.segments.map(({ text }) => text).join("")).toBe(
			excerpt,
		);
		const assigned =
			sentence?.units.flatMap(({ segments }) => segments) ?? [];
		const resolvable =
			sentence?.segments.flatMap((segment, index) =>
				segment.kind === "ResolvableText" ? [index] : [],
			) ?? [];
		expect(assigned.sort((left, right) => left - right)).toEqual(
			resolvable,
		);
	}
});
