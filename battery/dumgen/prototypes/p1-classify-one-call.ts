/**
 * P1: target classification in ONE jev round trip.
 * Membership questions stay as in production; the route question asks about
 * "the complete fixed unit containing the clicked occurrence" instead of about
 * the exact assembled group, so it no longer depends on the membership answers.
 * The production singletonRoute question is kept in the same call so both
 * route policies can be scored from one run.
 */
import { choice } from "promptsmith/typesafe";
import { targetCriteria } from "../src/concrete-lang/de/target-classification/judgments.js";
import { evaluationCaseIds } from "../src/concrete-lang/de/target-classification/evaluation-ids.js";
import data from "../src/concrete-lang/de/target-classification/source-data.json";
import { indexedContext } from "../src/universal/validation.js";
import { ask, runCases, save, stable, summarize, type Call, type CaseResult } from "./harness.js";

const routes = {
	"Lexeme/ADJ": "Adjective, including adjectival participles and adverbial adjective uses",
	"Lexeme/ADP": "Adposition (preposition, postposition or fixed circumposition)",
	"Lexeme/ADV": "Adverb, including a whole adverbial correlator",
	"Lexeme/AUX": "Meaning-bearing modal with an overt infinitive, or copula; includes its own scoped grammatical auxiliaries",
	"Lexeme/CCONJ": "Coordinating conjunction, including a complete fixed correlator",
	"Lexeme/DET": "Determiner modifying a noun",
	"Lexeme/INTJ": "Interjection",
	"Lexeme/NOUN": "Common noun, including substantivized participles",
	"Lexeme/NUM": "Numeral",
	"Lexeme/PART": "Particle",
	"Lexeme/PRON": "Pronoun used substantively, or attributive genitive dessen/deren/wessen",
	"Lexeme/PROPN": "Proper noun",
	"Lexeme/SCONJ": "Subordinating conjunction, including fixed multi-member conjunctions",
	"Lexeme/SYM": "Symbol",
	"Lexeme/VERB": "Whole lexical verb with its own scoped auxiliaries and fixed members",
	"Phraseme/Aphorism": "Established concise attributed maxim",
	"Phraseme/DiscourseFormula": "Established fixed discourse formula",
	"Phraseme/Idiom": "Established noncompositional expression in this contextual meaning",
	"Phraseme/Proverb": "Established traditional saying",
	"Construction/Fusion": "One fused preposition/article source word",
	Unresolved: "The unit is invalid, incomplete, includes free material, or has no defensible allowed route",
};

const scope = process.argv[2] === "all" ? Object.keys(data.cases) : evaluationCaseIds.filter((id) => !data.demonstrationIds.includes(id));
const cases = scope.map((id) => ({ id, ...(data.cases as Record<string, any>)[id] }));

async function run(c: (typeof cases)[number]): Promise<CaseResult & { alt?: unknown }> {
	const calls: Call[] = [];
	const sentence = { id: c.id, language: "de" as const, segments: c.input.segments };
	const k = c.input.clickedSegmentIndex;
	const state = {
		sentence: indexedContext(sentence),
		clickedSegmentIndex: k,
		criteria: "In `sentence`, <sN> tags identify selectable occurrences by original segment index N. Untagged text supplies context only. " + targetCriteria,
	};
	const questions: Record<string, ReturnType<typeof choice>> = {};
	for (const [index, segment] of sentence.segments.entries()) {
		if (segment.kind !== "ResolvableText" || index === k) continue;
		questions[`member_${index}`] = choice(
			`Under \`criteria\`, does occurrence <s${index}> in \`sentence\` belong to the same complete fixed unit as the occurrence identified by \`clickedSegmentIndex\`?`,
			{ Include: "It is a fixed member of that same unit", Exclude: "It belongs to another unit or is free contextual material", Unresolved: "Its membership cannot be defensibly decided" },
		);
	}
	questions.unitRoute = choice(
		`Under \`criteria\`, what is the Family/Kind of the complete fixed unit that contains occurrence <s${k}> in \`sentence\`? Classify the whole unit, not the clicked word's standalone part of speech. Choose Unresolved when no defensible complete target contains it.`,
		routes,
	);
	questions.singletonRoute = choice(
		`Is the exact group [${k}] (only occurrence <s${k}> in \`sentence\`) a defensible complete target under \`criteria\`? Choose the Family/Kind of the whole unit or Unresolved.`,
		routes,
	);
	const result = await ask(calls, "p1/classify", state, questions);
	const members = [k];
	let unresolvedMember = false;
	for (const id of Object.keys(questions)) {
		if (!id.startsWith("member_")) continue;
		const a = result.answers[id]!;
		if (a.type !== "choice") continue;
		if (a.choice === "Unresolved") unresolvedMember = true;
		if (a.choice === "Include") members.push(Number(id.slice(7)));
	}
	members.sort((a, b) => a - b);
	const unit = (result.answers.unitRoute as { choice: string }).choice;
	const single = (result.answers.singletonRoute as { choice: string }).choice;
	const project = (route: string) => {
		if (unresolvedMember || route === "Unresolved") return { decision: "Unresolved" };
		const [family, kind] = route.split("/");
		return { family, kind, memberSegmentIndices: members };
	};
	const actual = project(unit);
	const alt = project(members.length === 1 ? single : unit);
	return { id: c.id, pass: stable(actual) === stable(c.idealOutput), expected: c.idealOutput, actual, calls, alt };
}

const results = await runCases(cases, 6, run);
const summary = summarize(`P1 classify one call (unitRoute) [${process.argv[2] ?? "eval"}]`, results);
const altPass = results.filter((r) => stable((r as any).alt) === stable(r.expected)).length;
console.log(JSON.stringify({ altPolicy: "singletonRoute when singleton else unitRoute", passed: altPass, passRate: +(altPass / results.length).toFixed(3) }));
await save(`/tmp/p1-${process.argv[2] ?? "eval"}.json`, { summary, results });
