/**
 * P4: stray-article membership (2026-09-18).
 * Live jev traces showed the membership judge attaching every definite
 * article in the sentence to a clicked noun ([die, Der, Weg, das] for a click
 * on Weg). Three variants over the production question set, one round trip:
 *   head      criteria wording before the 2026-09-18 tightening
 *   tightened current `targetCriteria` (at most one article, the phrase-opening one)
 *   owned     tightened + one `ownedArticle` choice over the article occurrences;
 *             for NOUN routes the article members come only from that answer
 * Production assembly (incl. the noun article guard) scores every variant, and
 * "stray" counts assemblies the guard would have to catch.
 *
 *   zsh -ic 'bun prototypes/p4-noun-article-membership.ts [articles|eval|all] [head|tightened|owned]...'
 */
import type { Questions } from "promptsmith/typesafe";
import {
	articleForms,
	articleMembers,
	assembleTarget,
	classificationState,
	membershipQuestions,
	routeQuestion,
} from "../src/concrete-lang/de/target-classification/assembly.js";
import { evaluationCaseIds } from "../src/concrete-lang/de/target-classification/evaluation-ids.js";
import { targetCriteria } from "../src/concrete-lang/de/target-classification/judgments.js";
import data from "../src/concrete-lang/de/target-classification/source-data.json";
import type { SegmentedSentence } from "../src/types.js";
import { choice } from "../src/universal/questions.js";
import {
	ask,
	type Call,
	type CaseResult,
	runCases,
	save,
	stable,
	summarize,
} from "./harness.js";

const tightened =
	"A noun absorbs at most one article, the one opening its own nominal phrase; an article separated from the clicked noun by a verb, a clause boundary or another noun belongs to that other noun and never joins: clicking Weg in Der Weg ist das Ziel gives [Der,Weg], never das. ";
if (!targetCriteria.includes(tightened))
	throw Error("Criteria drifted; update the head variant");
const criteria = {
	head: targetCriteria.replace(tightened, ""),
	tightened: targetCriteria,
	owned: targetCriteria,
} as const;
type Variant = keyof typeof criteria;

const scope = process.argv[2] ?? "articles";
const variants = (
	process.argv.slice(3).length
		? process.argv.slice(3)
		: ["head", "tightened", "owned"]
) as Variant[];
const cases = (
	scope === "all"
		? Object.keys(data.cases)
		: scope === "eval"
			? evaluationCaseIds.filter(
					(id) => !data.demonstrationIds.includes(id),
				)
			: Object.keys(data.cases).filter((id) =>
					id.startsWith("target-de-noun-article"),
				)
).map((id) => ({ id, ...(data.cases as Record<string, any>)[id] }));

type Result = CaseResult & { stray: boolean; reason?: string };

async function run(
	variant: Variant,
	c: (typeof cases)[number],
): Promise<Result> {
	const calls: Call[] = [];
	const sentence: SegmentedSentence = {
		id: c.id,
		language: "de",
		segments: c.input.segments,
	};
	const input = {
		sentence,
		clickedSegmentIndex: c.input.clickedSegmentIndex,
	};
	const questions: Questions = {
		...membershipQuestions(input),
		route: routeQuestion,
	};
	const articleIndices = sentence.segments.flatMap((segment, index) =>
		segment.kind === "ResolvableText" &&
		articleForms.has(segment.text.toLowerCase())
			? [index]
			: [],
	);
	if (variant === "owned" && articleIndices.length)
		questions.ownedArticle = choice(
			"If the complete fixed unit containing the occurrence identified by `clickedSegmentIndex` is a common noun, which occurrence in `sentence` is the one article it owns under `criteria`? Choose None for a bare noun, a non-article determiner, a Fusion-supplied article, or a unit that is not a common noun.",
			{
				...Object.fromEntries(
					articleIndices.map((index) => [
						`s${index}`,
						`Occurrence <s${index}>`,
					]),
				),
				None: "No owned article occurrence",
			},
		);
	const result = await ask(
		calls,
		`p4/${variant}`,
		classificationState(input, criteria[variant]),
		questions,
	);
	let answers = result.answers;
	if (variant === "owned" && answers.ownedArticle?.type === "choice") {
		// Article membership comes only from the owned-article answer when the
		// route is a common noun; other routes keep the per-member answers.
		const route =
			answers.route?.type === "choice" ? answers.route.choice : "";
		if (route === "Lexeme/NOUN") {
			const owned =
				answers.ownedArticle.choice === "None"
					? null
					: Number(answers.ownedArticle.choice.slice(1));
			answers = Object.fromEntries(
				Object.entries(answers).map(([id, answer]) => {
					if (!id.startsWith("member_") || answer.type !== "choice")
						return [id, answer];
					const index = Number(id.slice(7));
					if (!articleIndices.includes(index)) return [id, answer];
					return [
						id,
						{
							...answer,
							choice: index === owned ? "Include" : "Exclude",
						},
					];
				}),
			) as typeof answers;
		}
	}
	// Stray = what membership alone would assemble before the noun article guard.
	const raw = [input.clickedSegmentIndex];
	for (const [id, answer] of Object.entries(answers))
		if (
			id.startsWith("member_") &&
			answer?.type === "choice" &&
			answer.choice === "Include"
		)
			raw.push(Number(id.slice(7)));
	raw.sort((a, b) => a - b);
	const rawArticles = articleMembers(sentence, raw);
	const stray =
		rawArticles.length > 1 ||
		(rawArticles.length === 1 && rawArticles[0] !== raw[0]);
	const assembly = assembleTarget(input, answers);
	const actual =
		assembly.decision === "Resolved"
			? {
					family: assembly.family,
					kind: assembly.kind,
					memberSegmentIndices: assembly.memberSegmentIndices,
				}
			: { decision: "Unresolved" };
	return {
		id: c.id,
		pass: stable(actual) === stable(c.idealOutput),
		expected: c.idealOutput,
		actual,
		calls,
		stray,
		reason:
			assembly.decision === "Unresolved" ? assembly.reason : undefined,
	};
}

const report: Record<string, unknown> = {};
for (const variant of variants) {
	const results = (await runCases(cases, 6, (c) =>
		run(variant, c),
	)) as Result[];
	const summary = summarize(`P4 ${variant} [${scope}]`, results);
	const stray = results.filter((r) => r.stray);
	const guardHits = results.filter((r) => r.reason?.includes("article"));
	const extra = {
		strayArticleAssemblies: stray.length,
		guardHits: guardHits.length,
		failedIds: results
			.filter((r) => !r.pass)
			.map((r) => `${r.id}: ${stable(r.actual)}`),
	};
	console.log(JSON.stringify(extra, null, 2));
	report[variant] = { summary, ...extra, results };
}
await save(`/tmp/p4-${scope}.json`, report);
