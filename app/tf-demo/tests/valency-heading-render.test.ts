import { expect, test } from "bun:test";
import {
	adp,
	headingLine,
	type Lemma,
	locution,
	reflexive,
	renderReading,
	type ValencyFrame,
	valencyLines,
	verb,
} from "./support/valency-heading-fixture";

const nom = { kind: "Case", governedCase: "Nom" } as const;
const acc = { kind: "Case", governedCase: "Acc" } as const;
const dat = { kind: "Case", governedCase: "Dat" } as const;
const prep = (canonicalForm: string, governedCase: "Acc" | "Dat" | "Gen") =>
	({
		kind: "Preposition",
		preposition: adp(canonicalForm),
		governedCase,
	}) as const;

const cases: readonly {
	readonly lemma: Lemma;
	readonly emoji?: string;
	readonly frame: ValencyFrame;
	readonly heading: string;
	readonly bullets: readonly string[];
}[] = [
	{
		lemma: verb("aufpassen", "auf"),
		frame: [[nom, prep("auf", "Acc")]],
		heading: "auf|passen",
		bullets: ["auf `jN` auf|passen"],
	},
	{
		lemma: verb("anfangen", "an"),
		frame: [[nom, prep("mit", "Dat")]],
		heading: "an|fangen",
		bullets: ["mit `jM` an|fangen"],
	},
	{
		lemma: verb("fragen", null),
		frame: [
			[nom, prep("nach", "Dat")],
			[nom, acc],
			[nom, acc, prep("nach", "Dat")],
		],
		heading: "fragen",
		bullets: ["nach `jM` fragen", "`jN` fragen", "`jN` nach `jM` fragen"],
	},
	{
		lemma: {
			family: "Lexeme",
			kind: "ADJ",
			canonicalForm: "stolz",
			coreFeatures: {},
		},
		frame: [
			[prep("auf", "Acc")],
			[{ kind: "Clause", form: "Dass", preposition: adp("auf") }],
		],
		heading: "stolz",
		bullets: ["stolz auf `jN`", "stolz darauf, `dass …`"],
	},
	{
		lemma: locution("auf den Keks gehen"),
		frame: [[nom, dat]],
		heading: "auf den Keks gehen",
		bullets: ["`jM` auf den Keks gehen"],
	},
	{
		lemma: locution("zur Verfügung stellen"),
		// Pattern order is canonicalized to Dat before Acc in display.
		frame: [[nom, acc, dat]],
		heading: "zur Verfügung stellen",
		bullets: ["`jM` `jN` zur Verfügung stellen"],
	},
	{
		lemma: verb("vorstellen", "vor"),
		emoji: "🪞💭",
		frame: [[nom, reflexive("Dat"), acc]],
		heading: "sich vor|stellen",
		bullets: ["sich (Dat) `jN` vor|stellen"],
	},
	{
		lemma: verb("erinnern", null),
		emoji: "🪞🧠",
		frame: [[nom, reflexive("Acc"), prep("an", "Acc")]],
		heading: "sich erinnern",
		bullets: ["sich an `jN` erinnern"],
	},
	{
		lemma: verb("schämen", null),
		emoji: "🪞😳",
		frame: [[nom, reflexive("Acc")]],
		heading: "sich schämen",
		bullets: ["sich schämen"],
	},
	{
		lemma: verb("ausruhen", "aus"),
		emoji: "🛌",
		frame: [[nom, reflexive("Acc")]],
		heading: "(sich) aus|ruhen",
		bullets: ["sich aus|ruhen"],
	},
	{
		lemma: locution("Sorgen machen"),
		emoji: "🪞😟",
		frame: [[nom, reflexive("Dat"), prep("um", "Acc")]],
		heading: "sich Sorgen machen",
		bullets: ["sich (Dat) um `jN` Sorgen machen"],
	},
	{
		lemma: locution("es gemütlich machen"),
		emoji: "🪞🛋️",
		frame: [[nom, reflexive("Dat")]],
		heading: "es sich gemütlich machen",
		bullets: ["es sich (Dat) gemütlich machen"],
	},
	{
		lemma: locution("außer sein"),
		emoji: "🪞😤",
		frame: [[nom, reflexive("Dat", "außer")]],
		heading: "außer sich sein",
		bullets: ["außer sich (Dat) sein"],
	},
	{
		lemma: locution("es in haben"),
		emoji: "🪞🔥",
		frame: [[nom, reflexive("Dat", "in")]],
		heading: "es in sich haben",
		bullets: ["es in sich (Dat) haben"],
	},
	// A complement whose preposition is a Fixed word goes right after it.
	{
		lemma: locution("mit zu tun haben"),
		frame: [
			[nom, prep("mit", "Dat")],
			[nom, prep("mit", "Dat"), { kind: "Clause", form: "Dass" }],
		],
		heading: "mit zu tun haben",
		bullets: ["mit `jM` zu tun haben", "`dass …` mit `jM` zu tun haben"],
	},
	{
		lemma: verb("wohnen", null),
		frame: [[nom, { kind: "Adverbial", standIn: "Irgendwo" }]],
		heading: "wohnen",
		bullets: ["`irgendwo` wohnen"],
	},
	{
		lemma: verb("legen", null),
		frame: [[nom, acc, { kind: "Adverbial", standIn: "Irgendwohin" }]],
		heading: "legen",
		bullets: ["`jN` `irgendwohin` legen"],
	},
	{
		lemma: verb("aussehen", "aus"),
		frame: [[nom, { kind: "Predicative", marker: "None" }]],
		heading: "aus|sehen",
		bullets: ["`irgendwie` aus|sehen"],
	},
	{
		lemma: verb("dauern", null),
		frame: [[nom, { kind: "Adverbial", standIn: "IrgendwieLange" }]],
		heading: "dauern",
		bullets: ["`irgendwie lange` dauern"],
	},
	{
		lemma: verb("kosten", null),
		frame: [[nom, acc, { kind: "Adverbial", standIn: "IrgendwieViel" }]],
		heading: "kosten",
		bullets: ["`jN` `irgendwie viel` kosten"],
	},
	{
		lemma: verb("halten", null),
		frame: [[nom, acc, { kind: "Predicative", marker: "Für" }]],
		heading: "halten",
		bullets: ["`jN` für `…` halten"],
	},
	{
		lemma: verb("zeigen", null),
		emoji: "🪞🎭",
		frame: [
			[nom, reflexive("Acc"), { kind: "Predicative", marker: "Als" }],
		],
		heading: "sich zeigen",
		bullets: ["sich als `…` zeigen"],
	},
	{
		lemma: verb("müssen", null),
		frame: [[nom, { kind: "Clause", form: "BareInfinitive" }]],
		heading: "müssen",
		bullets: ["`etw tun` müssen"],
	},
	{
		lemma: verb("achten", null),
		frame: [
			[nom, prep("auf", "Acc")],
			[nom, { kind: "Clause", form: "Dass", preposition: adp("auf") }],
		],
		heading: "achten",
		bullets: ["auf `jN` achten", "darauf, `dass …` achten"],
	},
	{
		lemma: {
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Angst",
			coreFeatures: { gender: "Fem" },
		},
		frame: [[prep("vor", "Dat")]],
		heading: "Angst",
		bullets: ["Angst vor `jM`"],
	},
];

for (const { lemma, emoji = "🧩", frame, heading, bullets } of cases) {
	test(`heading stays clean (${heading}) and Valency Block lists ${bullets.join("; ")}`, () => {
		const markup = renderReading(lemma, frame, { emojiDescription: emoji });
		expect(headingLine(markup)).toBe(`${emoji} ${heading}`);
		expect(markup).toContain(">Valency</h2>");
		expect(valencyLines(markup)).toEqual([...bullets]);
	});
}

test("the Valency Block and translations print prepositions and slots in the same two styles (ADR 0055)", () => {
	const markup = renderReading(
		locution("mit zu tun haben"),
		[[nom, prep("mit", "Dat")]],
		{
			translations: {
				en: [
					[
						{ kind: "Text", text: "have to do" },
						{ kind: "Preposition", text: "with" },
						{ kind: "Slot", text: "something" },
					],
					[{ kind: "Text", text: "concern" }],
				],
				ru: [
					[
						{ kind: "Text", text: "иметь отношение" },
						{ kind: "Preposition", text: "к" },
						{ kind: "Slot", text: "чему-то" },
					],
				],
			},
		},
	);
	const preposition = (text: string) =>
		`<span data-slot="valency-preposition" class="font-normal text-ink-soft">${text}</span>`;
	const tokenSlot = (text: string) =>
		`<span data-slot="valency-token" class="font-mono text-[0.82em] font-[450] text-ink-soft">${text}</span>`;
	const glossSlot = (text: string) =>
		`<span data-slot="valency-token" class="text-ink-muted">${text}</span>`;
	expect(markup).toContain(
		`${preposition("mit")} ${tokenSlot("jM")} zu tun haben`,
	);
	const row = (language: string) =>
		`>${language}</dt><dd lang="${language}">`;
	expect(markup).toContain(
		`${row("en")}have to do ${preposition("with")} ${glossSlot("something")}`,
	);
	expect(markup).toContain(
		`${row("ru")}иметь отношение ${preposition("к")} ${glossSlot("чему-то")}`,
	);
	expect(markup).toContain(
		'<span class="text-ink-faint"> · </span>concern</dd>',
	);
});

test("no Valency Block renders when a Reading has no patterns or only bare intransitive [Nom]", () => {
	for (const markup of [
		renderReading(locution("mit zu tun haben"), []),
		renderReading(verb("aufpassen", "auf"), undefined),
		renderReading(verb("schlafen", null), [[nom]]),
	]) {
		expect(markup).not.toContain(">Valency</h2>");
		expect(valencyLines(markup)).toEqual([]);
	}
	expect(headingLine(renderReading(verb("aufpassen", "auf"), []))).toBe(
		"🧩 auf|passen",
	);
});

test("more than 4 accumulated patterns fold behind a Show N more toggle", () => {
	const markup = renderReading(verb("fragen", null), [
		[nom, acc],
		[nom, prep("nach", "Dat")],
		[nom, acc, prep("nach", "Dat")],
		[nom, { kind: "Clause", form: "Ob" }],
		[nom, { kind: "Clause", form: "W" }],
		[nom, acc, { kind: "Clause", form: "Ob" }],
	]);
	expect(valencyLines(markup)).toHaveLength(4);
	expect(markup).toContain("Show 2 more");
});
