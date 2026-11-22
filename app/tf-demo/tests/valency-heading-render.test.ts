import { expect, test } from "bun:test";
import {
	adp,
	headingLine,
	type Lemma,
	locution,
	reflexive,
	renderReading,
	type ValencyFrame,
	verb,
} from "./support/valency-heading-fixture";

const cases: readonly {
	readonly lemma: Lemma;
	readonly frame: ValencyFrame;
	readonly heading: string;
}[] = [
	{
		lemma: verb("aufpassen", "auf"),
		frame: [
			{
				status: "Optional",
				complements: [
					{
						kind: "Preposition",
						preposition: adp("auf"),
						governedCase: "Acc",
					},
				],
			},
		],
		heading: "(auf `jN`) auf|passen",
	},
	{
		lemma: verb("anfangen", "an"),
		frame: [
			{
				status: "Optional",
				complements: [
					{
						kind: "Preposition",
						preposition: adp("mit"),
						governedCase: "Dat",
					},
				],
			},
		],
		heading: "(mit `jM`) an|fangen",
	},
	{
		lemma: verb("warten", null),
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Nom" }],
			},
			{
				status: "Optional",
				complements: [
					{
						kind: "Preposition",
						preposition: adp("auf"),
						governedCase: "Acc",
					},
				],
			},
		],
		heading: "(auf `jN`) warten",
	},
	{
		lemma: {
			family: "Lexeme",
			kind: "ADJ",
			canonicalForm: "stolz",
			coreFeatures: {},
		},
		frame: [
			{
				status: "Optional",
				complements: [
					{
						kind: "Preposition",
						preposition: adp("auf"),
						governedCase: "Acc",
					},
				],
			},
		],
		heading: "stolz (auf `jN`)",
	},
	{
		lemma: {
			family: "Locution",
			kind: "VERB",
			canonicalForm: "auf den Keks gehen",
			coreFeatures: {},
		},
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Dat" }],
			},
		],
		heading: "`jM` auf den Keks gehen",
	},
	{
		lemma: {
			family: "Locution",
			kind: "VERB",
			canonicalForm: "zur Verfügung stellen",
			coreFeatures: {},
		},
		// Frame order is not display order: Dat comes before Acc.
		frame: [
			{
				status: "Required",
				complements: [
					{
						kind: "Case",
						governedCase: "Acc",
					},
				],
			},
			{
				status: "Optional",
				complements: [{ kind: "Case", governedCase: "Dat" }],
			},
		],
		heading: "(`jM`) `jN` zur Verfügung stellen",
	},
	// Not ADR 0034's lines: the frame's lexical reflexive goes where the
	// Citation puts it (ADR 0052), naming its case when it is Dat.
	{
		lemma: verb("vorstellen", "vor"),
		frame: [
			reflexive("Required", "Dat"),
			{
				status: "Required",
				complements: [
					{
						kind: "Case",
						governedCase: "Acc",
					},
				],
			},
		],
		heading: "sich (Dat) `jN` vor|stellen",
	},
	{
		lemma: verb("erinnern", null),
		frame: [
			reflexive("Required", "Acc"),
			{
				status: "Optional",
				complements: [
					{
						kind: "Preposition",
						preposition: adp("an"),
						governedCase: "Acc",
					},
				],
			},
		],
		heading: "sich (an `jN`) erinnern",
	},
	{
		lemma: verb("schämen", null),
		frame: [reflexive("Required", "Acc")],
		heading: "sich schämen",
	},
	{
		lemma: verb("ausruhen", "aus"),
		frame: [reflexive("Optional", "Acc")],
		heading: "(sich) aus|ruhen",
	},
	{
		lemma: locution("Sorgen machen"),
		frame: [reflexive("Required", "Dat")],
		heading: "sich (Dat) Sorgen machen",
	},
	{
		lemma: locution("es gemütlich machen"),
		frame: [reflexive("Required", "Dat")],
		heading: "es sich (Dat) gemütlich machen",
	},
	{
		lemma: locution("außer sein"),
		frame: [reflexive("Required", "Dat", "außer")],
		heading: "außer sich (Dat) sein",
	},
	{
		lemma: locution("es in haben"),
		frame: [reflexive("Required", "Dat", "in")],
		heading: "es in sich (Dat) haben",
	},
	// A slot whose preposition is a Fixed word goes right after it.
	{
		lemma: locution("mit zu tun haben"),
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Nom" }],
			},
			{
				status: "Required",
				complements: [
					{
						kind: "Preposition",
						preposition: adp("mit"),
						governedCase: "Dat",
					},
				],
			},
		],
		heading: "mit `jM` zu tun haben",
	},
	{
		lemma: locution("mit zu tun haben"),
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Nom" }],
			},
			{
				status: "Required",
				complements: [
					{
						kind: "Preposition",
						preposition: adp("mit"),
						governedCase: "Dat",
					},
				],
			},
			{
				status: "Optional",
				complements: [{ kind: "Clause", form: "Dass" }],
			},
		],
		heading: "(`dass …`) mit `jM` zu tun haben",
	},
	// Free-marker complements and Slot alternatives (#676).
	{
		lemma: verb("wohnen", null),
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Nom" }],
			},
			{
				status: "Required",
				complements: [{ kind: "Adverbial", standIn: "Irgendwo" }],
			},
		],
		heading: "`irgendwo` wohnen",
	},
	{
		lemma: verb("legen", null),
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Nom" }],
			},
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Acc" }],
			},
			{
				status: "Required",
				complements: [{ kind: "Adverbial", standIn: "Irgendwohin" }],
			},
		],
		heading: "`jN` `irgendwohin` legen",
	},
	{
		lemma: verb("aussehen", "aus"),
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Nom" }],
			},
			{
				status: "Required",
				complements: [{ kind: "Predicative", marker: "None" }],
			},
		],
		heading: "`irgendwie` aus|sehen",
	},
	{
		lemma: verb("reden", null),
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Nom" }],
			},
			{
				status: "Optional",
				complements: [
					{
						kind: "Preposition",
						preposition: adp("über"),
						governedCase: "Acc",
					},
					{
						kind: "Preposition",
						preposition: adp("von"),
						governedCase: "Dat",
					},
				],
			},
		],
		heading: "(über `jN` | von `jM`) reden",
	},
	{
		lemma: verb("versuchen", null),
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Nom" }],
			},
			{
				status: "Required",
				complements: [
					{ kind: "Case", governedCase: "Acc" },
					{ kind: "Clause", form: "ZuInfinitive" },
				],
			},
		],
		heading: "[`jN` | `etw zu tun`] versuchen",
	},
	{
		lemma: verb("zurückkehren", "zurück"),
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Nom" }],
			},
			{
				status: "Optional",
				complements: [
					{
						kind: "Preposition",
						preposition: adp("zu"),
						governedCase: "Dat",
					},
					{ kind: "Adverbial", standIn: "Irgendwohin" },
				],
			},
		],
		heading: "(zu `jM` | `irgendwohin`) zurück|kehren",
	},
	{
		lemma: verb("dauern", null),
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Nom" }],
			},
			{
				status: "Required",
				complements: [{ kind: "Adverbial", standIn: "IrgendwieLange" }],
			},
		],
		heading: "`irgendwie lange` dauern",
	},
	{
		lemma: verb("kosten", null),
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Nom" }],
			},
			{
				status: "Optional",
				complements: [{ kind: "Case", governedCase: "Acc" }],
			},
			{
				status: "Required",
				complements: [{ kind: "Adverbial", standIn: "IrgendwieViel" }],
			},
		],
		heading: "(`jN`) `irgendwie viel` kosten",
	},
	{
		lemma: verb("halten", null),
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Nom" }],
			},
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Acc" }],
			},
			{
				status: "Required",
				complements: [{ kind: "Predicative", marker: "Für" }],
			},
		],
		heading: "`jN` für `…` halten",
	},
	{
		lemma: verb("zeigen", null),
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Nom" }],
			},
			reflexive("Required", "Acc"),
			{
				status: "Required",
				complements: [{ kind: "Predicative", marker: "Als" }],
			},
		],
		heading: "sich als `…` zeigen",
	},
	{
		lemma: verb("müssen", null),
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Nom" }],
			},
			{
				status: "Required",
				complements: [{ kind: "Clause", form: "BareInfinitive" }],
			},
		],
		heading: "`etw tun` müssen",
	},
	{
		lemma: verb("fragen", null),
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Nom" }],
			},
			{
				status: "Optional",
				complements: [{ kind: "Case", governedCase: "Acc" }],
			},
			{
				status: "Optional",
				complements: [
					{ kind: "Case", governedCase: "Acc" },
					{ kind: "Clause", form: "Ob" },
					{ kind: "Clause", form: "W" },
				],
			},
		],
		heading: "(`jN`) (`jN` | `ob …` | `w- …`) fragen",
	},
	{
		lemma: {
			family: "Lexeme",
			kind: "ADJ",
			canonicalForm: "stolz",
			coreFeatures: {},
		},
		frame: [
			{
				status: "Optional",
				complements: [
					{
						kind: "Preposition",
						preposition: adp("auf"),
						governedCase: "Acc",
					},
					{ kind: "Clause", form: "Dass", correlate: "Optional" },
				],
			},
		],
		heading: "stolz (auf `jN` | `dass …`)",
	},
	// A subject Slot with Clause alternatives stays omitted.
	{
		lemma: verb("sein", null),
		frame: [
			{
				status: "Required",
				complements: [
					{ kind: "Case", governedCase: "Nom" },
					{ kind: "Clause", form: "Dass", correlate: "Optional" },
					{
						kind: "Clause",
						form: "ZuInfinitive",
						correlate: "Optional",
					},
					{ kind: "Clause", form: "Ob", correlate: "Optional" },
					{ kind: "Clause", form: "W", correlate: "Optional" },
				],
			},
			{
				status: "Required",
				complements: [{ kind: "Predicative", marker: "None" }],
			},
		],
		heading: "`irgendwie` sein",
	},
	{
		lemma: locution("eine Frage stellen"),
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Nom" }],
			},
			{
				status: "Optional",
				complements: [
					{ kind: "Case", governedCase: "Dat" },
					{
						kind: "Preposition",
						preposition: adp("an"),
						governedCase: "Acc",
					},
				],
			},
		],
		heading: "(`jM` | an `jN`) eine Frage stellen",
	},
];

for (const { lemma, frame, heading } of cases) {
	test(`the heading reads ${heading}`, () => {
		expect(headingLine(renderReading(lemma, frame))).toBe(`🧩 ${heading}`);
	});
}

/** `mit zu tun haben`'s frame: the subject, `mit` + Dat, and an Optional dass-clause. */
const mitZuTunHaben: ValencyFrame = [
	{
		status: "Required",
		complements: [{ kind: "Case", governedCase: "Nom" }],
	},
	{
		status: "Required",
		complements: [
			{
				kind: "Preposition",
				preposition: adp("mit"),
				governedCase: "Dat",
			},
		],
	},
];

test("the heading and the translations print a preposition and a slot in the same two styles (ADR 0055)", () => {
	const markup = renderReading(locution("mit zu tun haben"), mitZuTunHaben, {
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
	});
	const preposition = (text: string) =>
		`<span data-slot="valency-preposition" class="font-normal text-ink-soft">${text}</span>`;
	const tokenSlot = (text: string) =>
		`<span data-slot="valency-token" class="font-mono text-[0.82em] font-[450] text-ink-soft">${text}</span>`;
	const glossSlot = (text: string) =>
		`<span data-slot="valency-token" class="text-ink-muted">${text}</span>`;
	// The Locution's Fixed `mit` is its slot's preposition.
	expect(markup).toContain(
		`${preposition("mit")} ${tokenSlot("jM")} zu tun haben`,
	);
	// A Sheet sets one row per language: its tag, then its translations.
	const row = (language: string) =>
		`>${language}</dt><dd lang="${language}">`;
	expect(markup).toContain(
		`${row("en")}have to do ${preposition("with")} ${glossSlot("something")}`,
	);
	expect(markup).toContain(
		`${row("ru")}иметь отношение ${preposition("к")} ${glossSlot("чему-то")}`,
	);
	// A translation with no valency stays plain, a middle dot after the first.
	expect(markup).toContain(
		'<span class="text-ink-faint"> · </span>concern</dd>',
	);
});

test("a free slot's preposition takes the preposition style", () => {
	const markup = renderReading(verb("warten", null), [
		{
			status: "Required",
			complements: [
				{
					kind: "Preposition",
					preposition: adp("auf"),
					governedCase: "Acc",
				},
			],
		},
	]);
	expect(markup).toContain(
		'<span data-slot="valency-preposition" class="font-normal text-ink-soft">auf</span> <span data-slot="valency-token"',
	);
});

test("a German Reading shows its frame in the heading alone, with no Valency Block", () => {
	for (const { lemma, frame } of cases)
		expect(renderReading(lemma, frame)).not.toContain(">Valency</h2>");
});

test("a heading without a frame to show cites the Canonical Form", () => {
	expect(headingLine(renderReading(locution("mit zu tun haben"), []))).toBe(
		"🧩 mit zu tun haben",
	);
	expect(headingLine(renderReading(verb("aufpassen", "auf"), []))).toBe(
		"🧩 auf|passen",
	);
	expect(
		headingLine(
			renderReading(verb("warten", null), [
				{
					status: "Required",
					complements: [
						{
							kind: "Case",
							governedCase: "Nom",
						},
					],
				},
			]),
		),
	).toBe("🧩 warten");
});

test("a Slot orders bare case, preposition and markerless Slots and styles placeholders and alternatives (#676)", () => {
	const reden = verb("reden", null);
	const frame = [
		{
			status: "Optional",
			complements: [
				{
					kind: "Preposition",
					preposition: adp("über"),
					governedCase: "Acc",
				},
				{
					kind: "Preposition",
					preposition: adp("von"),
					governedCase: "Dat",
				},
			],
		},
		{
			status: "Optional",
			complements: [{ kind: "Adverbial", standIn: "Irgendwie" }],
		},
		{
			status: "Optional",
			complements: [{ kind: "Predicative", marker: "Als" }],
		},
		{
			status: "Optional",
			complements: [
				{ kind: "Clause", form: "Dass", correlate: "Optional" },
			],
		},
	] satisfies ValencyFrame;
	expect(headingLine(renderReading(reden, frame))).toBe(
		"🧩 (über `jN` | von `jM`) (`irgendwie`) (als `…`) (`dass …`) reden",
	);
	expect(
		headingLine(
			renderReading(reden, [
				...frame,
				{
					status: "Required",
					complements: [
						{
							kind: "Case",
							governedCase: "Dat",
						},
					],
				},
			]),
		),
	).toBe(
		"🧩 `jM` (über `jN` | von `jM`) (`irgendwie`) (als `…`) (`dass …`) reden",
	);

	// Placeholders render in proportional soft ink (not mono), markers in
	// preposition style, and Required alternatives in muted square brackets.
	const versuchen = renderReading(verb("versuchen", null), [
		{
			status: "Required",
			complements: [
				{ kind: "Case", governedCase: "Acc" },
				{ kind: "Clause", form: "ZuInfinitive" },
			],
		},
	]);
	expect(versuchen).toContain(
		'<span class="font-normal text-ink-muted">[</span><span data-slot="valency-token" class="font-mono text-[0.82em] font-[450] text-ink-soft">jN</span><span class="font-normal text-ink-muted"> | </span><span data-slot="valency-token" class="font-normal text-ink-soft">etw zu tun</span><span class="font-normal text-ink-muted">]</span>',
	);
	const halten = renderReading(verb("halten", null), [
		{
			status: "Required",
			complements: [{ kind: "Predicative", marker: "Für" }],
		},
	]);
	expect(halten).toContain(
		'<span data-slot="valency-preposition" class="font-normal text-ink-soft">für</span> <span data-slot="valency-token" class="font-normal text-ink-soft">…</span>',
	);
});
