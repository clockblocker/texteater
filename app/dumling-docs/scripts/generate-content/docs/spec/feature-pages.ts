import type * as Dumling from "dumling/types";
import { spellingTagLabels } from "../../../../src/lib/unit-presentation";
import {
	inPageOrder,
	type RecordTarget,
	renderRecordCounts,
	renderTargetLine,
} from "./record-targets";
import type {
	AcceptedValues,
	EvidenceField,
	RouteFeature,
	SchemaRoute,
} from "./schema-routes";
import {
	evidencePageId,
	featurePageId,
	featureRowAnchor,
	featureTitle,
	languageNames,
	link,
	routePageId,
	universalFeatureLink,
	universalFeatureRouteId,
} from "./spec-links";
import type { SpecPage, SpecPagesInput } from "./spec-pages";
import {
	dumlingOwnFeatures,
	evidenceFieldDefinitions,
} from "./universal-definitions";

/** Record targets a feature page shows for each value. */
const samplesPerValue = 5;

export function renderValues(accepted: AcceptedValues): string {
	return [
		...accepted.values.map((value) => `\`${value}\``),
		...(accepted.sets ? ["a set of these"] : []),
		...(accepted.freeText ? ["any text"] : []),
		...(accepted.nullable ? ["`null`"] : []),
	].join(", ");
}

/**
 * A stored feature value: one value, a set of values, or a `mixed` set for
 * free variation within one sense (system ADR 0032).
 */
type FeatureValue =
	| string
	| readonly string[]
	| { readonly mixed: readonly string[] };

/** A Lemma's Core or a Surface's Inflectional features, by name. */
type FeatureBag = Record<string, FeatureValue | null>;

/** A value set comma-joined, and a `mixed` set as the language pages write it. */
function renderFeatureValue(value: FeatureValue): string {
	if (typeof value === "string") return value;
	if ("mixed" in value)
		return `{ mixed: [${value.mixed.map((member) => `"${member}"`).join(", ")}] }`;
	return value.join(",");
}

function targetFeatureValue(
	entry: RecordTarget,
	feature: string,
): string | undefined {
	const surface = entry.target.attestation.surface as {
		inflectionalFeatures?: FeatureBag | null;
		lemma: { coreFeatures?: FeatureBag | null };
	};
	const value =
		surface.lemma.coreFeatures?.[feature] ??
		surface.inflectionalFeatures?.[feature];
	if (value === null || value === undefined) return undefined;
	return renderFeatureValue(value);
}

function targetEvidenceValues(
	entry: RecordTarget,
	field: EvidenceField,
): string[] {
	const attestation = entry.target.attestation;
	switch (field) {
		case "spelling":
			return spellingTagLabels(attestation.surface.spelling);
		case "historicalStatus": {
			const features = attestation.surface.surfaceFeatures as {
				historicalStatus?: string | null;
			} | null;
			return features?.historicalStatus
				? [features.historicalStatus]
				: [];
		}
		case "memberOrthography":
			return [
				...new Set(
					attestation.members.map((member) => member.orthography),
				),
			];
		case "realizationCoverage":
			return [attestation.realizationCoverage];
	}
}

function renderValueGroups(
	values: readonly string[],
	freeText: boolean,
	entries: readonly RecordTarget[],
	valuesOf: (entry: RecordTarget) => readonly string[],
): string {
	const ordered = inPageOrder(entries);
	const byValue = new Map<string, RecordTarget[]>();
	for (const entry of ordered) {
		for (const value of valuesOf(entry)) {
			byValue.set(value, [...(byValue.get(value) ?? []), entry]);
		}
	}
	const attesting = ordered.filter((entry) => valuesOf(entry).length > 0);
	const header = [
		"## Values in the records",
		attesting.length === 0
			? "No records yet."
			: `${renderRecordCounts(attesting)} Each value lists up to ${samplesPerValue} targets, Reviewed first and archaic Surfaces last; the route pages list them all.`,
	];
	if (attesting.length === 0) return header.join("\n\n");

	const shown = [
		...values,
		...[...byValue.keys()]
			.filter((value) => !values.includes(value))
			.toSorted((left, right) => left.localeCompare(right)),
	];
	const groups = shown.map((value) => {
		const withValue = byValue.get(value) ?? [];
		const heading = `### \`${value}\``;
		if (withValue.length === 0) return `${heading}\n\nNo records yet.`;
		return [
			heading,
			`${withValue.length} target${withValue.length === 1 ? "" : "s"}.`,
			withValue
				.slice(0, samplesPerValue)
				.map((entry) => renderTargetLine(entry, { notes: false }))
				.join("\n"),
		].join("\n\n");
	});
	if (freeText && byValue.size > values.length) {
		header.push(
			`This feature accepts any text; ${byValue.size} distinct values occur.`,
		);
	}
	return [...header, ...groups].join("\n\n");
}

export function featurePage(
	language: Dumling.Language,
	name: string,
	uses: readonly { feature: RouteFeature; route: SchemaRoute }[],
	entries: readonly RecordTarget[],
	input: SpecPagesInput,
): SpecPage {
	const values = [...new Set(uses.flatMap(({ feature }) => feature.values))];
	const freeText = uses.some(({ feature }) => feature.freeText);
	return {
		description: `${languageNames[language]} ${featureTitle(name)}: the routes that allow it and its values in the records.`,
		order: 8010,
		routeId: featurePageId(language, name),
		lead: `The ${languageNames[language]} feature \`${name}\`. Universal definition: ${universalFeatureLink(name, input.handWrittenRouteIds)}.`,
		sections: [
			[
				"## Routes\n",
				"| Route | Layer | Allowed values |",
				"| --- | --- | --- |",
				...uses.map(
					({ feature, route }) =>
						`| ${link(route.kind, routePageId(language, route.family, route.kind))} | ${feature.layer} | ${renderValues(feature)} |`,
				),
			].join("\n"),
			renderValueGroups(values, freeText, entries, (entry) => {
				const value = targetFeatureValue(entry, name);
				return value === undefined ? [] : [value];
			}),
		],
		title: featureTitle(name),
	};
}

export function evidencePage(
	language: Dumling.Language,
	field: EvidenceField,
	routes: readonly SchemaRoute[],
	entries: readonly RecordTarget[],
): SpecPage {
	const definition = evidenceFieldDefinitions[field];
	const values = [
		...new Set(routes.flatMap((route) => route.evidence[field].values)),
	];
	const nullable = routes.some((route) => route.evidence[field].nullable);
	return {
		description: `${languageNames[language]} ${definition.title}: its values in the records.`,
		order: 8010,
		routeId: evidencePageId(language, field),
		lead: `${definition.definition} Every ${languageNames[language]} route allows ${renderValues({ freeText: false, nullable, sets: false, values })}.`,
		sections: [
			renderValueGroups(values, false, entries, (entry) =>
				targetEvidenceValues(entry, field),
			),
		],
		title: definition.title,
	};
}

export function universalEvidencePage(
	field: EvidenceField,
	languages: readonly Dumling.Language[],
): SpecPage {
	const definition = evidenceFieldDefinitions[field];
	return {
		description: `${definition.title}: its definition and the language pages.`,
		order: 18000,
		routeId: evidencePageId("u", field),
		lead: definition.definition,
		sections: [
			[
				"## Language pages\n",
				...languages.map(
					(language) =>
						`- ${link(`${languageNames[language]} ${definition.title}`, evidencePageId(language, field))}`,
				),
			].join("\n"),
		],
		title: definition.title,
	};
}

/** `gender[psor]` is UD's `Gender-psor`. */
function udFeatureLink(feature: string): string {
	if (dumlingOwnFeatures.has(feature)) return "Dumling's own";
	const name = featureTitle(feature).replace(/\[(\w+)\]/u, "-$1");
	return `[${featureTitle(feature)}](https://universaldependencies.org/u/feat/${name}.html)`;
}

/**
 * The universal feature overview, with a table row for every feature a
 * route allows that has no hand-written universal page.
 */
export function universalFeaturePage(
	featureLanguages: ReadonlyMap<string, readonly Dumling.Language[]>,
	handWrittenRouteIds: ReadonlySet<string>,
): SpecPage {
	const rows = [...featureLanguages]
		.filter(([name]) => !handWrittenRouteIds.has(featurePageId("u", name)))
		.toSorted(([left], [right]) => left.localeCompare(right));
	return {
		description:
			"The universal features: a page for each defined feature and a table of the rest.",
		lead: "A feature with a written universal definition has a page of its own, listed under Subpages. The table lists the other features the routes allow, with the UD definition and the language pages that show their values.",
		order: 18000,
		routeId: universalFeatureRouteId,
		sections: [
			rows.length === 0
				? "## Features without a page\n\nEvery feature has a page."
				: [
						"## Features without a page\n",
						"| Feature | UD definition | Language pages |",
						"| --- | --- | --- |",
						...rows.map(
							([name, languages]) =>
								`| <a id="${featureRowAnchor(name)}"></a>\`${featureTitle(name)}\` | ${udFeatureLink(name)} | ${languages
									.map((language) =>
										link(
											languageNames[language],
											featurePageId(language, name),
										),
									)
									.join(", ")} |`,
						),
					].join("\n"),
		],
		title: "Feature",
	};
}
