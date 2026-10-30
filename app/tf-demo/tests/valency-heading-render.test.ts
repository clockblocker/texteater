import { expect, test } from "bun:test";
import type { FunctionReturnType } from "convex/server";
import { renderToStaticMarkup } from "react-dom/server";
import type { api } from "../convex/_generated/api";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../shared/knowledge-preferences";
import { renderNote } from "../src/notes";

type ReadingNote = Extract<
	NonNullable<FunctionReturnType<typeof api.readingNotes.get>>,
	{ readonly kind: "Reading" }
>;
type ValencyFrame = NonNullable<ReadingNote["knowledge"]["valency"]>;
type Lemma = {
	readonly family: "Lexeme" | "Locution";
	readonly kind: string;
	readonly canonicalForm: string;
	readonly coreFeatures: Record<string, unknown>;
};

const verb = (canonicalForm: string, hasSepPrefix: string | null): Lemma => ({
	family: "Lexeme",
	kind: "VERB",
	canonicalForm,
	coreFeatures: { hasSepPrefix },
});
type GermanPreposition = Extract<
	Extract<
		ValencyFrame[number]["complements"][number],
		{ readonly kind: "Preposition" }
	>["preposition"],
	{ readonly language: "de" }
>;

const adp = (canonicalForm: string): GermanPreposition => ({
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "ADP",
	canonicalForm,
	coreFeatures: {},
});

const locution = (canonicalForm: string): Lemma => ({
	family: "Locution",
	kind: "VERB",
	canonicalForm,
	coreFeatures: {},
});

/** A Reflexive Slot, with the preposition a fixed phrase puts it after. */
const reflexive = (
	status: "Required" | "Optional",
	governedCase: "Acc" | "Dat",
	preposition?: string,
): ValencyFrame[number] => ({
	status,
	complements: [
		{
			kind: "Reflexive",
			governedCase,
			...(preposition === undefined
				? {}
				: { preposition: adp(preposition) }),
		},
	],
});

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
						referent: "Either",
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
						referent: "Something",
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
				complements: [
					{ kind: "Case", governedCase: "Nom", referent: "Someone" },
				],
			},
			{
				status: "Optional",
				complements: [
					{
						kind: "Preposition",
						preposition: adp("auf"),
						governedCase: "Acc",
						referent: "Either",
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
						referent: "Either",
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
				complements: [
					{ kind: "Case", governedCase: "Dat", referent: "Someone" },
				],
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
						referent: "Something",
					},
				],
			},
			{
				status: "Optional",
				complements: [
					{ kind: "Case", governedCase: "Dat", referent: "Someone" },
				],
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
						referent: "Something",
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
						referent: "Either",
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
				complements: [
					{ kind: "Case", governedCase: "Nom", referent: "Either" },
				],
			},
			{
				status: "Required",
				complements: [
					{
						kind: "Preposition",
						preposition: adp("mit"),
						governedCase: "Dat",
						referent: "Either",
					},
				],
			},
			{
				status: "Optional",
				complements: [{ kind: "Clause", form: "Dass" }],
			},
		],
		heading: "mit `jM` zu tun haben",
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
		complements: [
			{ kind: "Case", governedCase: "Nom", referent: "Either" },
		],
	},
	{
		status: "Required",
		complements: [
			{
				kind: "Preposition",
				preposition: adp("mit"),
				governedCase: "Dat",
				referent: "Either",
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
		`<span data-slot="valency-preposition" class="font-semibold">${text}</span>`;
	const slot = (text: string) =>
		`<span data-slot="valency-token" class="font-mono text-[0.9em] text-ink-soft">${text}</span>`;
	// The Locution's Fixed `mit` is its slot's preposition.
	expect(markup).toContain(
		`${preposition("mit")} ${slot("jM")} zu tun haben`,
	);
	expect(markup).toContain(
		`en: have to do ${preposition("with")} ${slot("something")}`,
	);
	expect(markup).toContain(
		`ru: иметь отношение ${preposition("к")} ${slot("чему-то")}`,
	);
	// A translation with no valency stays plain.
	expect(markup).toContain("en: concern</span>");
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
					referent: "Either",
				},
			],
		},
	]);
	expect(markup).toContain(
		'<span data-slot="valency-preposition" class="font-semibold">auf</span> <span data-slot="valency-token"',
	);
});

test("a German Reading shows its frame in the heading alone, with no Valency Block", () => {
	for (const { lemma, frame } of cases)
		expect(renderReading(lemma, frame)).not.toContain(
			'aria-label="Valency"',
		);
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
							referent: "Someone",
						},
					],
				},
			]),
		),
	).toBe("🧩 warten");
});

test("a Slot with alternatives or a free complement shows nothing until #676", () => {
	const reden = verb("reden", null);
	const frame = [
		{
			status: "Optional",
			complements: [
				{
					kind: "Preposition",
					preposition: adp("über"),
					governedCase: "Acc",
					referent: "Either",
				},
				{
					kind: "Preposition",
					preposition: adp("von"),
					governedCase: "Dat",
					referent: "Either",
				},
			],
		},
		{
			status: "Optional",
			complements: [{ kind: "Adverbial", standIn: "Irgendwie" }],
		},
		{
			status: "Optional",
			complements: [
				{ kind: "Predicative", of: "Subject", marker: "Als" },
			],
		},
		{
			status: "Optional",
			complements: [
				{ kind: "Clause", form: "Dass", correlate: "Optional" },
			],
		},
	] satisfies ValencyFrame;
	expect(headingLine(renderReading(reden, frame))).toBe("🧩 reden");
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
							referent: "Someone",
						},
					],
				},
			]),
		),
	).toBe("🧩 `jM` reden");
});

/** The Reading's title, emoji included, with slot tokens written back as backticked text. */
function headingLine(markup: string): string {
	const title = markup.match(/data-reading-title=""[^>]*>(.*?)<\/h\d>/)?.[1];
	if (title === undefined) throw new Error("no Reading title rendered");
	return plainText(title);
}

function plainText(html: string): string {
	return html
		.replace(/<span data-slot="valency-token"[^>]*>(.*?)<\/span>/g, "`$1`")
		.replace(/<[^>]+>/g, "")
		.replaceAll("&gt;", ">")
		.replaceAll("&lt;", "<");
}

function renderReading(
	lemma: Lemma,
	valency: ValencyFrame | undefined,
	translations?: ReadingNote["knowledge"]["translations"],
): string {
	const note = readingNote(lemma, valency, translations);
	return renderToStaticMarkup(
		renderNote({
			noteData: note,
			capabilities: {
				knowledgeSettings: DEFAULT_KNOWLEDGE_SETTINGS,
				sourceContexts: {
					items: note.sourceContexts.page,
					hasMore: false,
					isLoading: false,
					error: null,
					loadMore: null,
				},
				personalAnnotation: {
					isSaving: false,
					error: null,
					save: null,
				},
				follow: () => {},
			},
		}),
	);
}

function readingNote(
	lemma: Lemma,
	valency: ValencyFrame | undefined,
	translations: ReadingNote["knowledge"]["translations"] = {
		en: [[{ kind: "Text", text: "a translation" }]],
	},
): ReadingNote {
	return {
		kind: "Reading",
		target: { kind: "Reading", readingId: "reading-1" },
		reading: {
			unitKind: "Reading",
			ownerKind: "Reading",
			ownerKey: "reading-key-1",
			readingId: "reading-1",
			emojiDescription: "🧩",
			lemma: {
				unitKind: "Lemma",
				ownerKind: "Lemma",
				ownerKey: "lemma-key-1",
				lemmaId: "lemma-1",
				language: "de",
				...lemma,
			},
		},
		knowledgeState: { status: "Full", activity: "Idle" },
		personalAnnotation: "",
		knowledge: {
			translations,
			...(valency ? { valency } : {}),
		},
		knowledgeUpdatedAt: null,
		definitionText: { state: "Plain" },
		relations: [],
		relationsTruncated: false,
		grammaticalAlternatives: [],
		pendingRelations: [],
		structuralReferences: [],
		sourceContexts: {
			page: [
				{
					attestationId: "attestation-1",
					scrollId: "text-1",
					sentencePosition: 0,
					sentenceSnippet: "A source sentence.",
					segments: [{ kind: "ResolvableText", text: "source" }],
					memberSegmentIndices: [0],
					memberTexts: ["source"],
					origin: { kind: "Scroll" },
					target: {
						kind: "Scroll",
						scrollId: "text-1",
						focusAttestationId: "attestation-1",
						title: "A source sentence.",
					},
				},
			],
			continueCursor: "",
			isDone: true,
		},
	} as unknown as ReadingNote;
}
