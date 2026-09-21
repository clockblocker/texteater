/**
 * Derivation axis: auxiliary identity and the verbal complex features from
 * shape alone, with no jev call.
 *
 * The Sentence DTO grilling (#493) proposes that a non-head auxiliary member
 * needs no identity distribution: its authored AUX Reading follows from the
 * auxiliary's lemma, the form of the lexical head and the other auxiliaries
 * in the target. This script tries exactly that on the verb gold and the AUX
 * gold and counts where the rule and the gold disagree.
 *
 *     bun prototypes/intake/derive-aux.ts
 *
 * The head's form (participle vs infinitive vs zu-infinitive) is a grammar
 * feature in production; here it is read off the spelling with a heuristic
 * so the script stays free of calls. Each case reports whether the heuristic
 * or the rule is what failed.
 */

import auxiliaryCases from "../../src/concrete-lang/de/grammatical-resolution/lexeme/auxiliary/corpus.json";
import verbCases from "../../src/concrete-lang/de/grammatical-resolution/lexeme/verb/corpus.json";

type GrammarCase = {
	input: { markedContext: string; members: string[] };
	idealOutput: {
		lemma: { canonicalForm: string; coreFeatures: Record<string, unknown> };
		surface: {
			inflectionalFeatures: {
				perfect: string | null;
				future: string | null;
				passive: string | null;
				voice: string | null;
				verbForm: string | null;
			} | null;
		};
	};
};

type AuxLemma = "haben" | "sein" | "werden" | "bekommen";

type AuxReading =
	| "haben-perfekt"
	| "haben-obligation"
	| "sein-perfekt"
	| "sein-zustandspassiv"
	| "sein-modalpassiv"
	| "sein-verlaufsform"
	| "werden-futur"
	| "werden-vorgangspassiv"
	| "werden-wuerde-konjunktiv"
	| "bekommen-rezipientenpassiv"
	/** sein + participle with no worden: perfect or state passive is lexical. */
	| "sein-perfekt|sein-zustandspassiv";

const key = (text: string) => text.normalize("NFC").toLowerCase();

const auxForms: Record<string, AuxLemma> = {};
for (const form of [
	"sein",
	"bin",
	"bist",
	"ist",
	"sind",
	"seid",
	"war",
	"warst",
	"waren",
	"wart",
	"sei",
	"seist",
	"seiest",
	"seien",
	"seiet",
	"wäre",
	"wär",
	"wärst",
	"wärest",
	"wären",
	"wärt",
	"wäret",
	"gewesen",
])
	auxForms[form] = "sein";
for (const form of [
	"haben",
	"habe",
	"hab",
	"hast",
	"hat",
	"habt",
	"hatte",
	"hattest",
	"hatten",
	"hattet",
	"habest",
	"habet",
	"hätte",
	"hätt",
	"hättest",
	"hätten",
	"hättet",
	"gehabt",
])
	auxForms[form] = "haben";
for (const form of [
	"werden",
	"werde",
	"wirst",
	"wird",
	"werdet",
	"wurde",
	"wurdest",
	"wurden",
	"wurdet",
	"ward",
	"wardst",
	"werdest",
	"würde",
	"würdest",
	"würden",
	"würdet",
	"geworden",
	"worden",
])
	auxForms[form] = "werden";
for (const form of [
	"bekommt",
	"bekommen",
	"bekam",
	"bekomme",
	"bekommst",
	"bekamen",
	"kriegt",
	"kriegen",
	"kriege",
	"kriegst",
	"kriegte",
	"kriegten",
	"erhält",
	"erhielt",
	"erhalten",
	"erhalte",
	"erhältst",
	"erhielten",
])
	auxForms[form] = "bekommen";

const wuerdeForms = new Set(["würde", "würdest", "würden", "würdet"]);
/** Preterite werden never serves the future; with a verbal head it is passive. */
const preteriteWerden = new Set([
	"wurde",
	"wurdest",
	"wurden",
	"wurdet",
	"ward",
	"wardst",
]);
const prepositions = new Set([
	"an",
	"auf",
	"aus",
	"bei",
	"durch",
	"für",
	"gegen",
	"in",
	"mit",
	"nach",
	"über",
	"um",
	"unter",
	"von",
	"vor",
	"zu",
	"zwischen",
	"am",
]);

type HeadForm = "Participle" | "Infinitive" | "Finite" | "ZuInfinitive";

/** Spelling heuristic standing in for the grammar step's verbForm. */
function headForm(head: string, hasZu: boolean): HeadForm {
	const text = key(head);
	if (hasZu) return "ZuInfinitive";
	if (/^(ge|.*[^aeiouäöü]ge)[a-zäöüß]+(t|en)$/.test(text))
		return "Participle";
	if (
		/^(be|ver|er|ent|emp|zer|miss|über|unter|wider|durch|um)[a-zäöüß]+t$/.test(
			text,
		)
	)
		return "Participle";
	if (/ier(t)$/.test(text)) return "Participle";
	if (/en$/.test(text)) return "Infinitive";
	return "Finite";
}

type Derived = {
	readonly readings: Record<string, AuxReading>;
	readonly perfect: "Yes" | null;
	readonly future: "Yes" | null;
	readonly passive: "Process" | "State" | "Recipient" | null;
	readonly voice: "Pass" | null;
	readonly head: string;
	readonly headForm: HeadForm;
};

/** Auxiliary Readings and complex features from the members alone. */
function derive(members: readonly string[]): Derived {
	const auxes = members.filter((m) => key(m) in auxForms);
	const hasZu = members.some((m) => key(m) === "zu");
	const hasAm = members.some((m) => key(m) === "am");
	const lexical = members.filter(
		(m) =>
			!(key(m) in auxForms) &&
			!prepositions.has(key(m)) &&
			key(m) !== "sich" &&
			key(m) !== "es",
	);
	// gewesen / geworden as the last member are the head of a copula or lexical werden target.
	const head = lexical.at(-1) ?? auxes.at(-1) ?? members.at(-1) ?? "";
	const serving = auxes.filter((m) => m !== head);
	const form = headForm(head, hasZu);
	const lemmas = serving.map((m) => auxForms[key(m)]!);
	const hasWorden = serving.some((m) => key(m) === "worden");

	const readings: Record<string, AuxReading> = {};
	let perfect: Derived["perfect"] = null;
	let future: Derived["future"] = null;
	let passive: Derived["passive"] = null;

	for (const aux of serving) {
		const lemma = auxForms[key(aux)]!;
		const spelled = key(aux);
		if (lemma === "bekommen") {
			readings[aux] = "bekommen-rezipientenpassiv";
			passive = "Recipient";
		} else if (lemma === "werden") {
			if (
				spelled === "worden" ||
				form === "Participle" ||
				preteriteWerden.has(spelled)
			) {
				readings[aux] = "werden-vorgangspassiv";
				passive = "Process";
			} else if (wuerdeForms.has(spelled)) {
				readings[aux] = "werden-wuerde-konjunktiv";
			} else {
				readings[aux] = "werden-futur";
				future = "Yes";
			}
		} else if (lemma === "haben") {
			if (form === "ZuInfinitive") readings[aux] = "haben-obligation";
			else {
				readings[aux] = "haben-perfekt";
				perfect = "Yes";
			}
		} else {
			// sein
			if (form === "ZuInfinitive") readings[aux] = "sein-modalpassiv";
			else if (hasAm) readings[aux] = "sein-verlaufsform";
			else if (
				hasWorden ||
				key(head) === "gewesen" ||
				key(head) === "geworden"
			) {
				readings[aux] = "sein-perfekt";
				perfect = "Yes";
			} else if (form === "Participle") {
				readings[aux] = "sein-perfekt|sein-zustandspassiv";
			} else {
				readings[aux] = "sein-perfekt";
				perfect = "Yes";
			}
		}
	}
	// A perfect auxiliary serving a passive: the werden-participle marks perfect.
	if (hasWorden) perfect = "Yes";
	// The gewesen/geworden head: the finite sein serves it as perfect.
	if (
		(key(head) === "gewesen" || key(head) === "geworden") &&
		lemmas.includes("sein")
	)
		perfect = "Yes";

	return {
		readings,
		perfect,
		future,
		passive,
		voice: passive ? "Pass" : null,
		head,
		headForm: form,
	};
}

type Verdict = "match" | "lexical" | "mismatch";

function verdictFor(
	gold: GrammarCase,
	derived: Derived,
): { verdict: Verdict; detail: string } {
	const features = gold.idealOutput.surface.inflectionalFeatures;
	const expected = {
		perfect: features?.perfect ?? null,
		future: features?.future ?? null,
		passive: features?.passive ?? null,
		voice: features?.voice ?? null,
	};
	const ambiguous = Object.values(derived.readings).some((r) =>
		r.includes("|"),
	);
	if (ambiguous) {
		// The lexical fork: either branch must reproduce the gold.
		const perfectBranch = {
			...expected,
			perfect: "Yes",
			passive: null,
			voice: null,
		};
		const stateBranch = {
			...expected,
			perfect: null,
			passive: "State",
			voice: "Pass",
		};
		const ok =
			JSON.stringify(expected) === JSON.stringify(perfectBranch) ||
			JSON.stringify(expected) === JSON.stringify(stateBranch);
		return {
			verdict: ok ? "lexical" : "mismatch",
			detail: JSON.stringify(expected),
		};
	}
	const got = {
		perfect: derived.perfect,
		future: derived.future,
		passive: derived.passive,
		voice: derived.voice,
	};
	const same = JSON.stringify(got) === JSON.stringify(expected);
	return {
		verdict: same ? "match" : "mismatch",
		detail: `${JSON.stringify(expected)} vs ${JSON.stringify(got)}`,
	};
}

const readingHint: Record<string, AuxReading[]> = {
	future: ["werden-futur"],
	perfect: [
		"haben-perfekt",
		"sein-perfekt",
		"sein-perfekt|sein-zustandspassiv",
	],
	passive: ["werden-vorgangspassiv"],
	subjunctive: [
		"haben-perfekt",
		"sein-perfekt",
		"sein-perfekt|sein-zustandspassiv",
		"werden-wuerde-konjunktiv",
	],
	recipient: ["bekommen-rezipientenpassiv"],
	"infinitive-sein": ["sein-perfekt", "sein-perfekt|sein-zustandspassiv"],
	"infinitive-haben": ["haben-perfekt"],
	worden: ["werden-vorgangspassiv"],
	ward: ["werden-vorgangspassiv"],
};

function main() {
	const tallies: Record<Verdict, number> = {
		match: 0,
		lexical: 0,
		mismatch: 0,
	};
	const lines: string[] = [];

	console.log("== verb gold: complex features from shape ==");
	for (const [id, c] of Object.entries(
		verbCases as Record<string, GrammarCase>,
	)) {
		if (c.idealOutput.lemma.coreFeatures.verbType === "Mod") continue;
		const derived = derive(c.input.members);
		if (Object.keys(derived.readings).length === 0) {
			const f = c.idealOutput.surface.inflectionalFeatures;
			const expectsComplex = f?.perfect || f?.future || f?.passive;
			if (expectsComplex) {
				tallies.mismatch += 1;
				lines.push(
					`  MISMATCH ${id}: gold expects a complex but no auxiliary member: ${c.input.members.join(" ")}`,
				);
			}
			continue;
		}
		const { verdict, detail } = verdictFor(c, derived);
		tallies[verdict] += 1;
		const readings = Object.entries(derived.readings)
			.map(([a, r]) => `${a}→${r}`)
			.join(", ");
		lines.push(
			`  ${verdict.toUpperCase().padEnd(8)} ${id}: [${c.input.members.join(" ")}] head=${derived.head}/${derived.headForm} ${readings}${verdict === "mismatch" ? ` :: ${detail}` : ""}`,
		);
	}
	console.log(lines.join("\n"));
	console.log(
		`\n  targets with auxiliaries: ${tallies.match + tallies.lexical + tallies.mismatch}`,
	);
	console.log(`  match (shape alone): ${tallies.match}`);
	console.log(
		`  lexical fork (sein + participle, no worden): ${tallies.lexical}`,
	);
	console.log(`  mismatch: ${tallies.mismatch}`);

	console.log("\n== AUX gold: the serving Reading from the sentence ==");
	let auxMatch = 0;
	let auxTotal = 0;
	for (const [id, c] of Object.entries(
		auxiliaryCases as Record<string, GrammarCase>,
	)) {
		const hint = Object.keys(readingHint)
			.sort((a, b) => b.length - a.length)
			.find((h) => id.includes(h));
		if (!hint) {
			console.log(`  SKIP     ${id}: no reading hint in the id`);
			continue;
		}
		// The AUX case marks only the auxiliary; rebuild the complex from the sentence.
		const plain = c.input.markedContext.replace(/<\/?TARGET>/g, "");
		const words = plain
			.replace(/[.,!?;:"„“]/g, " ")
			.split(/\s+/)
			.filter(Boolean);
		const aux = c.input.members[0]!;
		// Verbal words on either side of the auxiliary, in sentence order:
		// participles, infinitives and other auxiliary forms; modals stay out.
		const isVerbal = (w: string) =>
			key(w) in auxForms ||
			headForm(w, false) === "Participle" ||
			(/en$/.test(key(w)) && !/^[A-ZÄÖÜ]/.test(w));
		const members = words.filter((w) => w === aux || isVerbal(w));
		const derived = derive(members);
		const reading = derived.readings[aux];
		const ok =
			reading !== undefined && readingHint[hint]!.includes(reading);
		auxTotal += 1;
		if (ok) auxMatch += 1;
		console.log(
			`  ${ok ? "MATCH   " : "MISMATCH"} ${id}: [${members.join(" ")}] ${aux}→${reading ?? "none"} (hint ${hint})`,
		);
	}
	console.log(`\n  AUX readings matched: ${auxMatch}/${auxTotal}`);
}

main();
