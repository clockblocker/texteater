import { fileURLToPath } from "node:url";
import { defineCodegen, formatTypeScript, runCodegenCommand } from "codegen";
import {
	canonicalFormKey,
	lemmaIdentityKey,
	parseUnit,
	syncretize,
} from "dumling";
import type * as Dumrel from "dumrel/types";
import { sourceMembers } from "../src/inventories/de/inventory.js";
import { syncretismDefinitions } from "../src/inventories/de/syncretism-definitions.js";
import type { AuthoredMember } from "../src/inventories/member.js";

// Generates the German pronoun Syncretisms (system ADR 0046) from the
// members authored by hand into src/inventories/de/generated/syncretisms.ts,
// as data literals, so the inventories entry still loads no Zod (ADR 0025).
//
// A cell is a PRON Lexeme Lemma with case in Core. A group is the cells that
// share a spelling, compared without letter case, and every Core Feature but
// gender, number and politeness, the features only the referent settles.
// Each closed part of a group, two or more of its cells, gets a Syncretism:
// every cell of the group that has the part's shared values belongs to it.
const generatedDirectory = new URL(
	"../src/inventories/de/generated/",
	import.meta.url,
);

/** The Core Features only the referent settles, in which a group's cells may differ. */
const referentFeatures = new Set(["gender", "number", "polite"]);

type Core = Readonly<Record<string, unknown>>;
type Lemma = AuthoredMember["lemma"];
/** A pillar cell: one PRON Lemma with its authored members, one per Reading. */
type Cell = { lemma: Lemma; members: AuthoredMember[] };

const coreOf = (lemma: Lemma): Core => lemma.coreFeatures;
const json = (value: unknown) => JSON.stringify(value);

/** Every subset of `items` with two or more items, in a stable order. */
function subsetsOfAtLeastTwo<T>(items: readonly T[]): T[][] {
	const subsets: T[][] = [[]];
	for (const item of items)
		for (const subset of subsets.slice()) subsets.push([...subset, item]);
	return subsets.filter((subset) => subset.length >= 2);
}

/** The readable key of a Syncretism's definition override. */
function labelOf(lemma: Lemma, syncretic: readonly string[]): string {
	const core = coreOf(lemma);
	return `${lemma.kind} ${lemma.canonicalForm} ${String(core.case)} ${String(core.pronType)}: ${syncretic.join(" ")}`;
}

/** The one value every unit has, or a failure naming the units' values. */
function shared<T>(label: string, what: string, values: readonly T[]): T {
	if (new Set(values.map(json)).size !== 1)
		throw Error(
			`${label}: its units' ${what} differ (${values.map(json).join(", ")}); a Syncretism needs the one they share (ADR 0046)`,
		);
	return values[0] as T;
}

/** Each language's translations merged in unit order, without duplicates. */
function mergedTranslations(
	knowledge: readonly Dumrel.ReadingKnowledge[],
): Record<string, string[]> {
	const merged: Record<string, string[]> = {};
	for (const { translations } of knowledge)
		for (const [language, glosses] of Object.entries(translations ?? {}))
			merged[language] = [
				...new Set([...(merged[language] ?? []), ...(glosses ?? [])]),
			];
	return merged;
}

/**
 * The Syncretism's Knowledge: the units' shared transcription, their
 * translations merged, and the authored definition, else theirs joined in
 * unit order. Any other aspect must be the same for every unit.
 */
function joinedKnowledge(
	label: string,
	knowledge: readonly Dumrel.ReadingKnowledge[],
	definition: string | undefined,
): Dumrel.ReadingKnowledge {
	const aspects = new Set(knowledge.flatMap((each) => Object.keys(each)));
	return Object.fromEntries(
		[...aspects].map((aspect) => {
			const values = knowledge.map(
				(each) => (each as Record<string, unknown>)[aspect],
			);
			if (aspect === "translations")
				return [aspect, mergedTranslations(knowledge)];
			if (aspect === "definition")
				return [
					aspect,
					definition ??
						[
							...new Set(
								values.filter((value) => value !== undefined),
							),
						].join(" "),
				];
			return [aspect, shared(label, aspect, values)];
		}),
	) as Dumrel.ReadingKnowledge;
}

/** Parses a generated unit, which must be stored as Dumling normalizes it. */
function parsed<K extends "Lemma" | "Reading">(
	label: string,
	unitKind: K,
	unit: unknown,
) {
	const result = parseUnit(unit);
	if (!result.success)
		throw Error(
			`${label}: Dumling rejects its ${unitKind}: ${result.error.message}`,
		);
	if (result.chain.unitKind !== unitKind)
		throw Error(`${label}: expected a ${unitKind}`);
	// The unitKind check cannot narrow a value typed by a conditional on K.
	return result.chain.value as K extends "Lemma"
		? Lemma
		: AuthoredMember["reading"];
}

const cells = new Map<string, Cell>();
for (const member of sourceMembers) {
	const { lemma } = member;
	if (
		lemma.family !== "Lexeme" ||
		lemma.kind !== "PRON" ||
		(coreOf(lemma).case ?? null) === null
	)
		continue;
	const key = lemmaIdentityKey(lemma);
	const cell = cells.get(key) ?? { lemma, members: [] };
	cell.members.push(member);
	cells.set(key, cell);
}
const groups = new Map<string, Cell[]>();
for (const cell of cells.values()) {
	const core = coreOf(cell.lemma);
	const settled = Object.keys(core)
		.filter((feature) => !referentFeatures.has(feature))
		.toSorted()
		.map((feature) => [feature, core[feature] ?? null]);
	const key = json([
		cell.lemma.kind,
		canonicalFormKey(cell.lemma.canonicalForm, cell.lemma.language),
		settled,
	]);
	groups.set(key, [...(groups.get(key) ?? []), cell]);
}

const generated: { label: string; member: AuthoredMember }[] = [];
for (const group of groups.values())
	for (const part of subsetsOfAtLeastTwo(group)) {
		const syncretism = syncretize(part.map(({ lemma }) => lemma));
		const { syncretic } = syncretism;
		const settled = (cell: Cell) =>
			Object.entries(coreOf(syncretism)).every(
				([feature, value]) =>
					(syncretic as readonly string[]).includes(feature) ||
					(coreOf(cell.lemma)[feature] ?? null) === value,
			);
		if (group.filter(settled).length !== part.length) continue;
		const label = labelOf(syncretism, syncretic);
		// The units in the Syncretism's order, which is identity order.
		const units = syncretism.syncretized.map((unit) => {
			const cell = cells.get(lemmaIdentityKey(unit));
			if (!cell) throw Error(`${label}: a unit is no cell`);
			return cell;
		});
		const [emojiDescription, ...more] = shared(
			label,
			"Emoji Descriptions",
			units.map(({ members }) =>
				members.map(({ reading }) => reading.emojiDescription),
			),
		);
		if (emojiDescription === undefined || more.length > 0)
			throw Error(
				`${label}: each unit needs exactly one Reading, the one they share (ADR 0046)`,
			);
		const lemma = parsed(label, "Lemma", syncretism);
		const knowledge = units.map(
			({ members }) => members[0]?.knowledge ?? {},
		);
		generated.push({
			label,
			member: {
				lemma,
				reading: parsed(label, "Reading", {
					unitKind: "Reading",
					lemma,
					emojiDescription,
				}),
				knowledge: joinedKnowledge(
					label,
					knowledge,
					syncretismDefinitions[label],
				),
				coverage: shared(
					label,
					"coverage",
					units.map(({ members }) => members[0]?.coverage),
				) as AuthoredMember["coverage"],
			},
		});
	}
generated.sort((left, right) =>
	left.label < right.label ? -1 : left.label > right.label ? 1 : 0,
);

const failures: string[] = [];
const labels = new Set<string>();
const identities = new Map<string, string>();
for (const { label, member } of generated) {
	const key = lemmaIdentityKey(member.lemma);
	const other = identities.get(key);
	if (other !== undefined)
		failures.push(`${label} and ${other} share an identity`);
	if (labels.has(label)) failures.push(`Two Syncretisms are ${label}`);
	identities.set(key, label);
	labels.add(label);
}
for (const label of Object.keys(syncretismDefinitions))
	if (!generated.some((entry) => entry.label === label))
		failures.push(`The definition override ${label} names no Syncretism`);
if (failures.length > 0) throw Error(failures.join("\n"));

/** A variable name for a Syncretism's Lemma: `sieAccPrsGenderNumber`. */
const nameOf = (label: string) =>
	label
		.split(/[^\p{L}\p{N}]+/u)
		.slice(1)
		.filter(Boolean)
		.map((word, index) =>
			index === 0 ? word : word[0]?.toUpperCase() + word.slice(1),
		)
		.join("");
const names = generated.map(({ label }) => nameOf(label));
if (new Set(names).size !== names.length)
	throw Error(`Two Syncretisms share a variable name: ${names.join(", ")}`);

// Each Lemma is one constant that its member and Reading share, as in the
// member files authored by hand.
const source = [
	"// Generated from the German Authored Inventory by",
	"// codegen/generate-syncretisms.ts. Run bun run generate.",
	'import type * as Dumling from "dumling/types";',
	'import type { AuthoredMember } from "../../member.js";',
	"",
	...generated.map(
		({ label, member }, index) =>
			`// ${label}\nconst ${names[index]} = ${json(member.lemma)} satisfies Dumling.Lemma<"de">;`,
	),
	"",
	"/**",
	" * The German pronoun Syncretisms (system ADR 0046), one per closed group of",
	" * PRON cells that only the referent tells apart, each with its Reading and",
	" * the Knowledge its units share.",
	" */",
	"export const germanSyncretisms: readonly AuthoredMember[] = [",
	...generated.map(
		({ member: { reading, knowledge, coverage } }, index) =>
			`{lemma: ${names[index]}, reading: {unitKind: "Reading", lemma: ${names[index]}, emojiDescription: ${json(reading.emojiDescription)}}, knowledge: ${json(knowledge)}, coverage: ${json(coverage)}},`,
	),
	"];",
	"",
].join("\n");

const recipe = defineCodegen({
	inputs: {},
	outputs: { generated: { root: fileURLToPath(generatedDirectory) } },
	build: async () => [
		{
			id: "syncretisms",
			to: { target: "generated", path: "syncretisms.ts" },
			content: await formatTypeScript(
				source,
				new URL("syncretisms.ts", generatedDirectory),
			),
			provenance: [],
			meta: null,
		},
	],
});
await runCodegenCommand(recipe, {
	label: `Dumcorpus German Syncretisms (${generated.length})`,
});
