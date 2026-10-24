import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	type BreakdownRecordCheck,
	checkBreakdownRecord,
} from "../src/check-breakdown.js";
import { checkRecord } from "../src/check-record.js";
import { breakdownReadingIssues } from "../src/check-shared-readings.js";
import type { BreakdownRecord } from "../src/corpus-types.js";
import type { SpecCheck } from "../src/issues.js";
import { loadBreakdownRecords, readRecords } from "../src/load.js";
import { ruleCitation, seedJson } from "./negative-fixtures.js";

const breakdowns = loadBreakdownRecords();
const byId = (id: string) => {
	const record = breakdowns.find((breakdown) => breakdown.id === id);
	if (!record) throw Error(`Expected ${id} to load`);
	return record;
};

/** A record's pieces as `letters → Canonical Form`, filler as its letters. */
const pieces = (record: BreakdownRecord, part: "constituents" | "morphemes") =>
	record.knowledge.breakdown?.[part]?.map(({ letters, target }) =>
		target ? `${letters} → ${target.canonicalForm}` : letters,
	);

describe("Breakdown Records", () => {
	test("load the German phrasemes and the single-word seeds, each owned by a Reading", () => {
		expect(
			breakdowns.map(({ id, reading, knowledge }) => [
				id.replace("breakdown/de/", ""),
				`${reading.lemma.family} ${reading.lemma.kind} ${"emojiDescription" in reading ? reading.emojiDescription : ""}`,
				[
					...Object.keys(knowledge.breakdown ?? {}),
					...(knowledge.source ? ["source"] : []),
				].join(" "),
			]),
		).toEqual([
			["alles-in-allem", "Locution ADV 🧮", "constituents"],
			["apfelbaum", "Lexeme NOUN 🍎🌳", "constituents"],
			["aufgabe", "Lexeme NOUN 📝", "source"],
			["aus-allen-wolken-fallen", "Locution VERB 😲", "constituents"],
			["aus-dem-haeuschen-sein", "Locution VERB 🤩", "constituents"],
			["bauer-landwirt", "Lexeme NOUN 🧑‍🌾", "constituents"],
			["bauer-vogelkaefig", "Lexeme NOUN 🐦", "morphemes"],
			["befreien", "Lexeme VERB 🕊", "constituents"],
			["bildung", "Lexeme NOUN 🎓", "constituents"],
			["bratpfanne", "Lexeme NOUN 🍳", "constituents"],
			[
				"da-liegt-der-hase-im-pfeffer",
				"Locution VERB 🔑",
				"constituents",
			],
			["den-faden-verlieren", "Locution VERB 💭💨", "constituents"],
			[
				"den-nagel-auf-den-kopf-treffen",
				"Locution VERB 🎯",
				"constituents",
			],
			["dies-und-das", "Locution PRON 🧺", "constituents"],
			["dieses-und-jenes", "Locution PRON 🗂", "constituents"],
			["dumm-wie-bohnenstroh", "Locution ADJ 🤪", "constituents"],
			["durchbrechen-entzwei", "Lexeme VERB 🪵💥", "constituents"],
			["durchbrechen-hindernis", "Lexeme VERB 🧱", "constituents"],
			["e-mail", "Lexeme NOUN 📧", "constituents"],
			["einkaufen", "Lexeme VERB 🛒", "constituents"],
			["entgleisen", "Lexeme VERB 🚆", "constituents"],
			["entkernen", "Lexeme VERB 🍒", "constituents"],
			["entlarven", "Lexeme VERB 🎭", "constituents"],
			["entspannung", "Lexeme NOUN 🧘", "constituents"],
			["erblinden", "Lexeme VERB 🦯", "constituents"],
			["erbrecht", "Lexeme NOUN 📜", "constituents"],
			["fahrrad", "Lexeme NOUN 🚲", "constituents"],
			["fisch", "Lexeme NOUN 🐟", "morphemes"],
			["fischen", "Lexeme VERB 🎣", "source"],
			["freiheit", "Lexeme NOUN 🗽", "constituents"],
			["freundschaft", "Lexeme NOUN 🫂", "constituents"],
			["gaestehaus", "Lexeme NOUN 🏨", "constituents"],
			["gruendung-gruenden", "Lexeme NOUN 🏛", "constituents"],
			["gruendung-gruenduenger", "Lexeme NOUN 🌱", "constituents"],
			["guten-morgen", "Locution INTJ 👋", "constituents"],
			["guten-tag", "Locution INTJ 👋", "constituents"],
			["hand-in-hand-gehen", "Locution VERB 🤝", "constituents"],
			["himbeere", "Lexeme NOUN 🍓", "constituents"],
			["in-betracht-ziehen", "Locution VERB 🤔", "constituents"],
			["kaufen", "Lexeme VERB 💶", "morphemes"],
			["kaum-dass", "Locution SCONJ ⏱", "constituents"],
			["kita", "Lexeme NOUN 🧸", "source"],
			["kleidung", "Lexeme NOUN 👕", "constituents"],
			["kochtopf", "Lexeme NOUN 🍲", "constituents"],
			["kohlekraftwerk", "Lexeme NOUN 🏭", "constituents"],
			["laster-lastwagen", "Lexeme NOUN 🚚", "constituents"],
			["laster-untugend", "Lexeme NOUN 😈", "morphemes"],
			["lauf", "Lexeme NOUN 🏃", "source"],
			["leidtun", "Lexeme VERB 😔", "constituents"],
			["leiter-leiten", "Lexeme NOUN 👔", "constituents"],
			["leiter-sprossenleiter", "Lexeme NOUN 🪜", "morphemes"],
			["messer-messen", "Lexeme NOUN 📏", "constituents"],
			["messer-schneidwerkzeug", "Lexeme NOUN 🔪", "morphemes"],
			[
				"morgenstund-hat-gold-im-mund",
				"Saying Saying 🌅💰",
				"constituents",
			],
			["na-ja", "Locution INTJ 🤷", "constituents"],
			["nur-bahnhof-verstehen", "Locution VERB 😵‍💫", "constituents"],
			["ohne-zu", "Locution SCONJ 🚫", "constituents"],
			["rentier-ren", "Lexeme NOUN 🦌", "constituents"],
			["rentier-rentner", "Lexeme NOUN 💰", "constituents"],
			["ruf", "Lexeme NOUN 📣", "source"],
			["rufen", "Lexeme VERB 📣", "morphemes"],
			["rund-um-die-uhr-betreuung", "Lexeme NOUN ⏰🤲", "constituents"],
			["schlafsack", "Lexeme NOUN 🛌", "constituents"],
			["schreibtisch", "Lexeme NOUN ✍", "constituents"],
			["sich-wie-zu-hause-fuehlen", "Locution VERB 🏠😌", "constituents"],
			["so-gut-wie", "Locution ADV 🤏", "constituents"],
			["so-oder-so", "Locution ADV 🔁", "constituents"],
			["sonnenbrille", "Lexeme NOUN 🕶", "constituents"],
			["spannen", "Lexeme VERB 🏹", "morphemes"],
			["steuermann", "Lexeme NOUN 🧭", "constituents"],
			["stimmung-laune", "Lexeme NOUN 😊", "constituents"],
			["stimmung-tonhoehe", "Lexeme NOUN 🎻", "constituents"],
			["trimm-dich-pfad", "Lexeme NOUN 🏃🌲", "constituents"],
			["uebung-macht-den-meister", "Saying Saying 🔁🏆", "constituents"],
			["um-jeden-preis", "Locution ADV 💪", "constituents"],
			["um-zu", "Locution SCONJ 🎯", "constituents"],
			["uni", "Lexeme NOUN 🎓", "source"],
			["verarmen", "Lexeme VERB 📉", "constituents"],
			["verarzten", "Lexeme VERB 🩹", "constituents"],
			["verfilmen", "Lexeme VERB 🎬", "constituents"],
			["vergiften", "Lexeme VERB ☠", "constituents"],
			["verkabeln", "Lexeme VERB 🔌", "constituents"],
			["verkaufen", "Lexeme VERB 🏷", "constituents"],
			["wachstube-wachlokal", "Lexeme NOUN 💂", "constituents"],
			["wachstube-wachstube", "Lexeme NOUN 🕯", "constituents"],
			["was-fuer", "Locution DET ❓👉", "constituents"],
			["was-weiss-ich", "Locution INTJ 🤷", "constituents"],
			[
				"wer-zuerst-kommt-mahlt-zuerst",
				"Saying Saying 🥇",
				"constituents",
			],
			["zu-hause", "Locution ADV 🏠", "constituents"],
			["zunichtemachen", "Lexeme VERB 💥", "constituents"],
		]);
	});

	test("group a phraseme's article with its noun and split a fused word by component", () => {
		expect(
			pieces(byId("breakdown/de/den-faden-verlieren"), "constituents"),
		).toEqual(["den Faden → Faden", " ", "verlieren → verlieren"]);
		expect(
			pieces(
				byId("breakdown/de/da-liegt-der-hase-im-pfeffer"),
				"constituents",
			),
		).toEqual([
			"da → da",
			" ",
			"liegt → liegen",
			" ",
			"der Hase → Hase",
			" ",
			"i → in",
			"m Pfeffer → Pfeffer",
		]);
	});

	test("let a Locution be a phraseme's part, broken down one level further, and join sich to its lexically reflexive verb", () => {
		expect(
			pieces(
				byId("breakdown/de/sich-wie-zu-hause-fuehlen"),
				"constituents",
			),
		).toEqual([
			"sich → sich fühlen",
			" ",
			"wie → wie",
			" ",
			"zu Hause → zu Hause",
			" ",
			"fühlen → sich fühlen",
		]);
		expect(pieces(byId("breakdown/de/zu-hause"), "constituents")).toEqual([
			"zu → zu",
			" ",
			"Hause → Haus",
		]);
	});

	test("split each decided single-word path", () => {
		const constituents = (name: string) =>
			pieces(byId(`breakdown/de/${name}`), "constituents");
		expect(constituents("kohlekraftwerk")).toEqual([
			"Kohle → Kohle",
			"kraftwerk → Kraftwerk",
		]);
		expect(constituents("gaestehaus")).toEqual([
			"Gäst → Gast",
			"e → -e-",
			"haus → Haus",
		]);
		expect(constituents("entspannung")).toEqual([
			"Entspann → entspannen",
			"ung → -ung",
		]);
		expect(constituents("verkaufen")).toEqual([
			"ver → ver-",
			"kaufen → kaufen",
		]);
		expect(constituents("einkaufen")).toEqual([
			"ein → ein-",
			"kaufen → kaufen",
		]);
		expect(constituents("verarzten")).toEqual([
			"ver → ver-",
			"arzt → Arzt",
			"en",
		]);
		expect(pieces(byId("breakdown/de/spannen"), "morphemes")).toEqual([
			"spann → spann",
			"en → -en",
		]);
		expect(
			byId("breakdown/de/lauf").knowledge.source?.target,
		).toMatchObject({
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: "laufen",
		});
	});

	test("give each direction pair a Source one way only, and a shortening its base (#1279)", () => {
		const sourceOf = (name: string) => {
			const target = byId(`breakdown/de/${name}`).knowledge.source
				?.target;
			return target && `${target.kind} ${target.canonicalForm}`;
		};
		expect(sourceOf("fischen")).toBe("NOUN Fisch");
		expect(sourceOf("fisch")).toBeUndefined();
		expect(pieces(byId("breakdown/de/fisch"), "morphemes")).toEqual([
			"Fisch → fisch",
			" → ∅",
		]);
		expect(sourceOf("ruf")).toBe("VERB rufen");
		expect(sourceOf("rufen")).toBeUndefined();
		expect(pieces(byId("breakdown/de/rufen"), "morphemes")).toEqual([
			"ruf → ruf",
			"en → -en",
		]);
		expect(sourceOf("aufgabe")).toBe("VERB aufgeben");
		expect(sourceOf("uni")).toBe("NOUN Universität");
		expect(sourceOf("kita")).toBe("NOUN Kindertagesstätte");
	});

	test("give the two Readings of Wachstube one Lemma and two splits", () => {
		const guard = byId("breakdown/de/wachstube-wachlokal");
		const wax = byId("breakdown/de/wachstube-wachstube");
		expect(guard.reading.lemma).toEqual(wax.reading.lemma);
		expect(pieces(guard, "constituents")).toEqual([
			"Wach → wachen",
			"stube → Stube",
		]);
		expect(pieces(wax, "constituents")).toEqual([
			"Wachs → Wachs",
			"tube → Tube",
		]);
	});
});

const constituentsOf = (record: ReturnType<typeof seedJson>) =>
	record.knowledge.breakdown.constituents;
const morpheme = (kind: string, canonicalForm: string) => ({
	language: "de",
	canonicalForm,
	family: "Morpheme",
	kind,
});

/** Each edits a seed so that exactly one check fails. */
const fixtures: {
	name: string;
	seed: string;
	id?: string;
	check: SpecCheck;
	edit: (record: ReturnType<typeof seedJson>) => void;
}[] = [
	{
		name: "a path outside breakdown/<language>/<kebab-case>",
		seed: "den-faden-verlieren",
		id: "breakdown/Den_Faden",
		check: "Id",
		edit: () => {},
	},
	{
		name: "a Coverage field, which a Breakdown Record does not have",
		seed: "den-faden-verlieren",
		check: "Shape",
		edit: (record) => {
			record.coverage = "Full";
		},
	},
	{
		name: "a Review Depth past Segmentation",
		seed: "den-faden-verlieren",
		check: "Shape",
		edit: (record) => {
			record.reviewDepth = "Reading";
			record.sources.rules = [ruleCitation];
		},
	},
	{
		name: "a Lemma for its owner",
		seed: "den-faden-verlieren",
		check: "Reading",
		edit: (record) => {
			record.reading = record.reading.lemma;
		},
	},
	{
		name: "neither a Breakdown nor a Source",
		seed: "den-faden-verlieren",
		check: "Breakdown",
		edit: (record) => {
			record.knowledge = {};
		},
	},
	{
		name: "letters that don't spell the Canonical Form (dumrel)",
		seed: "den-faden-verlieren",
		check: "Breakdown",
		edit: (record) => {
			constituentsOf(record)[2].letters = "verloren";
		},
	},
	{
		name: "a Source for a Locution",
		seed: "den-faden-verlieren",
		check: "Breakdown",
		edit: (record) => {
			record.knowledge = {
				source: { target: constituentsOf(record)[2].target },
			};
		},
	},
	{
		name: "a phraseme part that is a Morpheme",
		seed: "den-faden-verlieren",
		check: "Breakdown",
		edit: (record) => {
			constituentsOf(record)[2].target = morpheme("Root", "verlier");
		},
	},
	{
		name: "two filler pieces in a row",
		seed: "um-zu",
		check: "Breakdown",
		edit: (record) => {
			constituentsOf(record).splice(
				1,
				1,
				{ letters: " " },
				{ letters: "… " },
			);
		},
	},
	{
		name: "a linked word that its letters don't spell",
		seed: "kohlekraftwerk",
		check: "Breakdown",
		edit: (record) => {
			const [kohle, kraftwerk] = constituentsOf(record);
			kohle.target = kraftwerk.target;
		},
	},
	{
		name: "a word's part left as filler",
		seed: "kohlekraftwerk",
		check: "Breakdown",
		edit: (record) => {
			delete constituentsOf(record)[0].target;
		},
	},
	{
		name: "a linking element outside the closed Interfix set",
		seed: "gaestehaus",
		check: "Breakdown",
		edit: (record) => {
			constituentsOf(record)[1].target.canonicalForm = "-x-";
			constituentsOf(record)[1].letters = "x";
			record.reading.lemma.canonicalForm = "Gästxhaus";
		},
	},
	{
		name: "a Prefix spelled without its hyphen",
		seed: "verkaufen",
		check: "Breakdown",
		edit: (record) => {
			constituentsOf(record)[0].target.canonicalForm = "ver";
		},
	},
	{
		name: "a separable verb whose first part isn't its particle",
		seed: "einkaufen",
		check: "Breakdown",
		edit: (record) => {
			record.reading.lemma.coreFeatures.hasSepPrefix = "aus";
		},
	},
	{
		name: "a constituent linking to an Ending (dumrel)",
		seed: "verarzten",
		check: "Breakdown",
		edit: (record) => {
			constituentsOf(record)[2].target = morpheme("Ending", "-en");
		},
	},
	{
		name: "a citation ending that doesn't close the word",
		seed: "verarzten",
		check: "Breakdown",
		edit: (record) => {
			const parts = constituentsOf(record);
			parts.unshift(parts.pop());
			record.reading.lemma.canonicalForm = "enverarzt";
		},
	},
	{
		name: "a morpheme left unlinked",
		seed: "spannen",
		check: "Breakdown",
		edit: (record) => {
			delete record.knowledge.breakdown.morphemes[0].target;
		},
	},
	{
		name: "a constituent that ends inside a morpheme",
		seed: "entspannung",
		check: "Breakdown",
		edit: (record) => {
			record.knowledge.breakdown.morphemes = [
				{ letters: "Ent", target: morpheme("Prefix", "ent-") },
				{ letters: "spannu", target: morpheme("Root", "spann") },
				{ letters: "ng", target: morpheme("Suffix", "-ung") },
			];
		},
	},
	{
		name: "a Source beside Constituents (dumrel)",
		seed: "verkaufen",
		check: "Breakdown",
		edit: (record) => {
			record.knowledge.source = {
				target: constituentsOf(record)[1].target,
			};
		},
	},
	{
		name: "a reviewed Breakdown citing no Rule",
		seed: "den-faden-verlieren",
		check: "Uncited",
		edit: (record) => {
			record.reviewDepth = "Segmentation";
		},
	},
];

/** Each issue's check, keyed with whether it fails the record. */
const issueKeys = (checked: BreakdownRecordCheck) =>
	new Map<string, SpecCheck>([
		...checked.errors.map((issue): [string, SpecCheck] => [
			`error ${issue.check} ${issue.path}`,
			issue.check,
		]),
		...checked.issues.map((issue): [string, SpecCheck] => [
			`work ${issue.check} ${issue.path}`,
			issue.check,
		]),
	]);

describe("Breakdown Record negative fixtures", () => {
	for (const fixture of fixtures)
		test(`fail ${fixture.check}: ${fixture.name}`, () => {
			const seed = `breakdown/de/${fixture.seed}`;
			const json = seedJson(seed);
			const checkedSeed = checkBreakdownRecord(seed, json);
			expect(checkedSeed.errors).toEqual([]);
			expect(checkedSeed.record).toBeDefined();
			const before = issueKeys(checkedSeed);
			fixture.edit(json);
			const added = [
				...issueKeys(checkBreakdownRecord(fixture.id ?? seed, json)),
			].filter(([key]) => !before.has(key));
			expect(new Set(added.map(([, check]) => check))).toEqual(
				new Set([fixture.check]),
			);
		});

	test("accept both halves when every constituent ends where a morpheme does", () => {
		const json = seedJson("breakdown/de/entspannung");
		json.knowledge.breakdown.morphemes = [
			{ letters: "Ent", target: morpheme("Prefix", "ent-") },
			{ letters: "spann", target: morpheme("Root", "spann") },
			{ letters: "ung", target: morpheme("Suffix", "-ung") },
			{ letters: "", target: morpheme("Ending", "∅") },
		];
		const checked = checkBreakdownRecord("breakdown/de/entspannung", json);
		expect([...checked.errors, ...checked.issues]).toEqual([]);
	});

	test("the loader lists a failing Draft Breakdown and fails a reviewed one", () => {
		const seed = "breakdown/de/den-faden-verlieren";
		const directory = mkdtempSync(join(tmpdir(), "dumcorpus-records-"));
		const write = (id: string, record: unknown) =>
			writeFileSync(
				join(directory, `${id}.json`),
				JSON.stringify(record),
			);
		try {
			mkdirSync(join(directory, "breakdown/de"), { recursive: true });
			write("breakdown/de/valid", seedJson(seed));
			const draft = seedJson(seed);
			draft.knowledge = {};
			write("breakdown/de/draft", draft);
			const reviewed = seedJson(seed);
			reviewed.reviewDepth = "Segmentation";
			reviewed.sources.rules = [ruleCitation];
			reviewed.knowledge = {};
			write("breakdown/de/reviewed", reviewed);
			const { breakdownRecords, issues, worklist } =
				readRecords(directory);
			expect(breakdownRecords.map((record) => record.id)).toEqual([
				"breakdown/de/valid",
			]);
			expect(
				issues.map((issue) => `${issue.record} ${issue.check}`),
			).toEqual(["breakdown/de/reviewed Breakdown"]);
			expect(
				worklist.map((entry) => [
					entry.record,
					entry.issues.map((issue) => `${issue.check} ${issue.path}`),
				]),
			).toEqual([["breakdown/de/draft", ["Breakdown knowledge"]]]);
		} finally {
			rmSync(directory, { recursive: true });
		}
	});
});

describe("the Breakdown guard", () => {
	test("passes the corpus", () => {
		const { records } = readRecords(
			new URL("../records/", import.meta.url).pathname,
		);
		expect(breakdownReadingIssues(records, breakdowns)).toEqual([]);
	});

	test("flags a second Breakdown Record for one Reading", () => {
		const faden = byId("breakdown/de/den-faden-verlieren");
		expect(
			breakdownReadingIssues(
				[],
				[faden, { ...faden, id: "breakdown/de/again" }],
			).map((issue) => `${issue.record} ${issue.check} ${issue.path}`),
		).toEqual(["breakdown/de/again SharedReading reading"]);
	});

	test("flags a Spec Record target whose Source differs from the Reading's Breakdown Record", () => {
		const json = seedJson("de/lauf-schneller");
		const record = checkRecord("de/lauf-schneller", json).record;
		if (!record) throw Error("Expected de/lauf-schneller to load");
		const lauf = byId("breakdown/de/lauf");
		const target = record.targets[0];
		if (!target?.reading) throw Error("Expected a Reading");
		const rennen = {
			language: "de",
			canonicalForm: "rennen",
			family: "Lexeme",
			kind: "VERB",
		} as const;
		const knowledge = { source: { target: rennen } };
		const issues = breakdownReadingIssues(
			[{ id: record.id, targets: [{ ...target, knowledge }] }],
			[{ ...lauf, reading: target.reading }],
		);
		expect(issues.map((issue) => `${issue.check} ${issue.path}`)).toEqual([
			"SharedReading targets.0.reading.knowledge.source",
		]);
	});
});
