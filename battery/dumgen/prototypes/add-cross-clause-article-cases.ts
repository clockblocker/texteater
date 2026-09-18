/**
 * Authoring helper for the cross-clause article golden cases (2026-09-18).
 * Idempotent: re-running rewrites the same ids. Kept so the cases can be
 * regenerated if segmentation changes.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { segmentLatin } from "../src/universal/latin-segmentation.js";

const dataPath = new URL(
	"../src/concrete-lang/de/target-classification/source-data.json",
	import.meta.url,
);
const idsPath = new URL(
	"../src/concrete-lang/de/target-classification/evaluation-ids.ts",
	import.meta.url,
);

type Spec = {
	key: string;
	sentence: string;
	/** Each target: words by occurrence (`word#n`, 1-based) and the clicks tried on it. */
	targets: { members: string[] }[];
};

const explanation =
	"A noun absorbs only the one article opening its own phrase; articles of other nouns across the clause never join.";

const specs: Spec[] = [
	{
		key: "hike",
		sentence:
			"Als der Aufstieg anstrengender wurde, reichte die Wanderführerin dem Jungen die Flasche.",
		targets: [
			{ members: ["der", "Aufstieg"] },
			{ members: ["die#1", "Wanderführerin"] },
			{ members: ["dem", "Jungen"] },
			{ members: ["die#2", "Flasche"] },
		],
	},
	{
		// The live trace shape: a quoted clause after the reporting clause.
		key: "quoted",
		sentence:
			"Als der Aufstieg anstrengender wurde, sagte die Wanderführerin: „Der Gipfel ist nah.“",
		targets: [
			{ members: ["der", "Aufstieg"] },
			{ members: ["die", "Wanderführerin"] },
			{ members: ["Der", "Gipfel"] },
		],
	},
	{
		key: "weather",
		sentence: "Der Weg ist lang, aber das Wetter bleibt gut.",
		targets: [{ members: ["Der", "Weg"] }, { members: ["das", "Wetter"] }],
	},
	{
		key: "predicate",
		sentence: "Der Lehrer ist der Vater des Mädchens.",
		targets: [
			{ members: ["Der", "Lehrer"] },
			{ members: ["der", "Vater"] },
			{ members: ["des", "Mädchens"] },
		],
	},
];

const data = JSON.parse(readFileSync(dataPath, "utf8"));
const added: string[] = [];
for (const spec of specs) {
	const segments = segmentLatin(spec.sentence, "de").segments;
	const locate = (ref: string) => {
		const [word, nth = "1"] = ref.split("#");
		let seen = 0;
		for (const [index, segment] of segments.entries())
			if (segment.text === word && ++seen === Number(nth)) return index;
		throw Error(`Missing ${ref} in ${spec.sentence}`);
	};
	for (const target of spec.targets) {
		const memberSegmentIndices = target.members.map(locate);
		for (const [position, ref] of target.members.entries()) {
			const word = ref.split("#")[0]!;
			const noun = target.members.at(-1)!.split("#")[0]!.toLowerCase();
			const id =
				position === 0 && target.members.length > 1
					? `target-de-noun-article-cross-${spec.key}-click-${word.toLowerCase()}-of-${noun}`
					: `target-de-noun-article-cross-${spec.key}-click-${noun}`;
			data.cases[id] = {
				input: {
					clickedSegmentIndex: memberSegmentIndices[position],
					segments,
				},
				idealOutput: {
					family: "Lexeme",
					kind: "NOUN",
					memberSegmentIndices,
				},
				explanation,
				contaminationKeys: [`noun-article-cross:${spec.key}`],
			};
			added.push(id);
		}
	}
}
writeFileSync(dataPath, `${JSON.stringify(data, null, "\t")}\n`);

let ids = readFileSync(idsPath, "utf8");
const missing = added.filter((id) => !ids.includes(`"${id}"`));
if (missing.length) {
	ids = ids.replace(
		'\t"target-de-noun-article-nested-complement",\n',
		`\t"target-de-noun-article-nested-complement",\n${missing
			.map((id) => `\t"${id}",\n`)
			.join("")}`,
	);
	writeFileSync(idsPath, ids);
}
console.log(JSON.stringify({ added, newlyListed: missing }, null, 2));
