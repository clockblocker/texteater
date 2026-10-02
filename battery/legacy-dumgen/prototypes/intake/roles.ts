/**
 * Role axis: one Choice per occurrence naming its role inside its unit.
 *
 * Roles are not features. The lexical shape a grammar route wants
 * (hasSepPrefix, hasGovPrep, lexicallyReflexive, expletive, the noun's
 * article) is projected in code from the roles of the members the membership
 * matrix grouped together. A role that names a unit the matrix did not build
 * (a "separable particle" whose unit is a singleton, a "free" word inside a
 * multi-member group) is a role-versus-membership inconsistency.
 */
import { choice, type Questions } from "promptsmith/typesafe";
import { isResolved, type Sentence, type Unit } from "./corpus.js";
import type { GoldSentence, ShapeFeatures, ShapeProbe } from "./gold.js";

type Answers = Record<string, unknown>;
type ChoiceAnswer = { type: "choice"; choice: string };

export const roles = {
	Head: "The member that names a unit with other fixed members: the noun of a noun phrase unit, the lexical verb (finite, infinitive or participle) of a verbal unit, the verb of an idiom",
	SeparableParticle:
		"The separated prefix of a separable verb standing apart from its verb (steht ... auf, wirken ... nach)",
	GovernedPreposition:
		"A preposition the verb lexically selects for its complement (wartet auf, erinnert sich an, geht um), not a free adjunct preposition (wartet im Keller)",
	Reflexive:
		"An inherently required reflexive pronoun of a reflexive verb (schämt sich, erinnert sich), not an optional reflexive object",
	Expletive:
		"A lexically selected nonreferential subject es of its verb (es gibt, es regnet, es geht um), not referential, positional, anticipatory or object es",
	Article:
		"The definite or indefinite article a common noun absorbs (der in der Aufstieg, ein in ein Haus); mein, dieser, kein are not articles",
	Auxiliary:
		"sein, haben, werden, or recipient-passive bekommen, marking perfect, future or passive for the lexical verb of its unit; a modal or a copula is not an auxiliary",
	Free: "Not a fixed member of any multi-word unit: the word stands alone as its own single-member unit",
	Unresolved: "Its role cannot be defensibly decided",
} as const;

export type Role = keyof typeof roles;

export function roleQuestions(sentence: Sentence): Questions {
	const questions: Questions = {};
	for (const index of sentence.resolvable) {
		const text = sentence.segments[index]?.text ?? "";
		questions[`role_${index}`] = choice(
			`What is the role of occurrence <s${index}> "${text}" inside the complete fixed unit that contains it in \`sentence\`? Choose Free when that unit is this single occurrence.`,
			roles,
		);
	}
	return questions;
}

export function solveRoles(
	sentence: Sentence,
	answers: Answers,
): Map<number, Role> {
	const result = new Map<number, Role>();
	for (const index of sentence.resolvable) {
		const answer = answers[`role_${index}`] as ChoiceAnswer | undefined;
		const role =
			answer?.type === "choice" && answer.choice in roles
				? (answer.choice as Role)
				: "Unresolved";
		result.set(index, role);
	}
	return result;
}

const multiMemberRoles = new Set<Role>([
	"Head",
	"SeparableParticle",
	"GovernedPreposition",
	"Reflexive",
	"Expletive",
	"Article",
	"Auxiliary",
]);

/** The shape a unit projects from its members' roles. */
export function projectShape(
	sentence: Sentence,
	unit: Unit | undefined,
	roleOf: ReadonlyMap<number, Role>,
): ShapeFeatures | null {
	if (!isResolved(unit)) return null;
	const text = (index: number) =>
		sentence.segments[index]?.text.normalize("NFC") ?? "";
	const find = (role: Role) =>
		unit.memberSegmentIndices.find((index) => roleOf.get(index) === role);
	const particle = find("SeparableParticle");
	const preposition = find("GovernedPreposition");
	const article = find("Article");
	return {
		hasSepPrefix:
			particle === undefined ? null : text(particle).toLowerCase(),
		hasGovPrep:
			preposition === undefined ? null : text(preposition).toLowerCase(),
		lexicallyReflexive: find("Reflexive") === undefined ? null : "Yes",
		expletive: find("Expletive") === undefined ? null : "Subject",
		article: article === undefined ? null : text(article),
	};
}

const featureNames = [
	"hasSepPrefix",
	"hasGovPrep",
	"lexicallyReflexive",
	"expletive",
	"article",
] as const satisfies readonly (keyof ShapeFeatures)[];

export type ShapeScore = {
	readonly id: string;
	readonly kind: ShapeProbe["kind"];
	readonly unitFound: boolean;
	readonly allCorrect: boolean;
	readonly wrong: string[];
	readonly expected: ShapeFeatures;
	readonly actual: ShapeFeatures | null;
};

/**
 * Feature accuracy of the projected shape against verb and noun gold, the
 * role-versus-membership inconsistencies, and the role inventory produced.
 */
export function reportRoles(
	pairs: readonly {
		sentence: Sentence | GoldSentence;
		units: ReadonlyMap<number, Unit> | null;
		roles: ReadonlyMap<number, Role> | null;
	}[],
) {
	const scores: ShapeScore[] = [];
	const perFeature: Record<
		string,
		{
			cases: number;
			correct: number;
			goldPresent: number;
			presentCorrect: number;
		}
	> = {};
	const inventory: Record<string, number> = {};
	let inconsistent = 0;
	const inconsistencies: Record<string, number> = {};
	let headless = 0;
	let multiHeaded = 0;
	let occurrences = 0;
	/** A gold prefix that is not a separate member cannot be projected. */
	let boundPrefixGold = 0;
	const articleBySource: Record<string, { cases: number; correct: number }> =
		{};

	for (const { sentence, units, roles: roleOf } of pairs) {
		if (!units || !roleOf) continue;
		const seen = new Set<string>();
		for (const index of sentence.resolvable) {
			occurrences += 1;
			const role = roleOf.get(index) ?? "Unresolved";
			inventory[role] = (inventory[role] ?? 0) + 1;
			const unit = units.get(index);
			if (!isResolved(unit)) continue;
			const singleton = unit.memberSegmentIndices.length === 1;
			const bad =
				(singleton && multiMemberRoles.has(role)) ||
				(!singleton && role === "Free");
			if (bad) {
				inconsistent += 1;
				const label = `${role} in ${singleton ? "singleton" : "group"}`;
				inconsistencies[label] = (inconsistencies[label] ?? 0) + 1;
			}
			const unitKey = unit.memberSegmentIndices.join(",");
			if (!singleton && !seen.has(unitKey)) {
				seen.add(unitKey);
				const heads = unit.memberSegmentIndices.filter(
					(member) => roleOf.get(member) === "Head",
				).length;
				if (heads === 0) headless += 1;
				if (heads > 1) multiHeaded += 1;
			}
		}
		if (!("shape" in sentence)) continue;
		for (const probe of sentence.shape) {
			const unit = units.get(probe.head);
			const actual = projectShape(sentence, unit, roleOf);
			const wrong: string[] = [];
			for (const name of featureNames) {
				if (name === "article" && probe.kind !== "NOUN") continue;
				if (name !== "article" && probe.kind !== "VERB") continue;
				const bucket = perFeature[name] ?? {
					cases: 0,
					correct: 0,
					goldPresent: 0,
					presentCorrect: 0,
				};
				perFeature[name] = bucket;
				bucket.cases += 1;
				const expected = probe.expected[name];
				const got = actual ? actual[name] : null;
				const ok = (got ?? null) === (expected ?? null);
				if (ok) bucket.correct += 1;
				else
					wrong.push(
						`${name}: ${String(got)} != ${String(expected)}`,
					);
				if (expected !== null) {
					bucket.goldPresent += 1;
					if (ok) bucket.presentCorrect += 1;
				}
				if (name === "hasSepPrefix" && expected !== null) {
					const separate = probe.members.some(
						(member) =>
							sentence.segments[member]?.text
								.normalize("NFC")
								.toLowerCase() === expected.toLowerCase(),
					);
					if (!separate) boundPrefixGold += 1;
				}
				if (name === "article") {
					const source = articleBySource[probe.articleSource] ?? {
						cases: 0,
						correct: 0,
					};
					articleBySource[probe.articleSource] = source;
					source.cases += 1;
					if (ok) source.correct += 1;
				}
			}
			scores.push({
				id: probe.id,
				kind: probe.kind,
				unitFound: !!actual,
				allCorrect: !!actual && wrong.length === 0,
				wrong,
				expected: probe.expected,
				actual,
			});
		}
	}
	return {
		scores,
		summary: {
			shapeCases: scores.length,
			shapeUnitFound: scores.filter((score) => score.unitFound).length,
			shapeAllCorrect: scores.filter((score) => score.allCorrect).length,
			featureAccuracy: Object.fromEntries(
				Object.entries(perFeature).map(([name, bucket]) => [
					name,
					{
						cases: bucket.cases,
						correct: bucket.correct,
						accuracy: +(
							bucket.correct / (bucket.cases || 1)
						).toFixed(3),
						goldPresent: bucket.goldPresent,
						presentCorrect: bucket.presentCorrect,
						recall: +(
							bucket.presentCorrect / (bucket.goldPresent || 1)
						).toFixed(3),
					},
				]),
			),
			boundPrefixGold,
			articleBySource,
			occurrences,
			roleInventory: Object.fromEntries(
				Object.entries(inventory).sort((a, b) => b[1] - a[1]),
			),
			roleVersusMembership: inconsistent,
			roleVersusMembershipKinds: inconsistencies,
			multiMemberUnitsWithoutHead: headless,
			multiMemberUnitsWithSeveralHeads: multiHeaded,
		},
	};
}
