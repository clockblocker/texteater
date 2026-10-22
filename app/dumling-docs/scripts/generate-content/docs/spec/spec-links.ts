import type * as Dumling from "dumling/types";
import { publicHrefForRouteId } from "../../../../src/lib/navigation.ts";
import type { EvidenceField } from "./schema-routes";
import { evidenceFieldDefinitions } from "./universal-definitions";

export const languageNames: Readonly<Record<Dumling.Language, string>> = {
	de: "German",
	en: "English",
	he: "Hebrew",
};

function kebab(name: string): string {
	return name
		.replace(/\[(\w+)\]/gu, "-$1")
		.replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
		.toLowerCase();
}

export function routePageId(
	language: string,
	family: Dumling.Family,
	kind: Dumling.Kind,
): string {
	return `${language}/entity/lemma/${family.toLowerCase()}/${kebab(kind)}`;
}

export function featurePageId(language: string, feature: string): string {
	return `${language}/feature/${kebab(feature)}`;
}

export function evidencePageId(language: string, field: EvidenceField): string {
	return `${language}/feature/${evidenceFieldDefinitions[field].path}`;
}

export function rulesPageId(language: string): string {
	return `${language}/rules`;
}

/** `gender[psor]` is titled `Gender[psor]`, as UD writes it. */
export function featureTitle(feature: string): string {
	return `${feature.charAt(0).toUpperCase()}${feature.slice(1)}`;
}

export function link(text: string, routeId: string): string {
	return `[${text}](${publicHrefForRouteId(routeId)})`;
}

/**
 * The universal feature overview. Its table gives each feature without a
 * hand-written universal page a row, which stands in for that page.
 */
export const universalFeatureRouteId = "u/feature";

/** The anchor of a feature's row in the universal feature table. */
export function featureRowAnchor(feature: string): string {
	return kebab(feature);
}

/** A feature's universal definition: its own page, or its table row. */
export function universalFeatureLink(
	feature: string,
	handWrittenRouteIds: ReadonlySet<string>,
): string {
	const routeId = featurePageId("u", feature);
	return handWrittenRouteIds.has(routeId)
		? link(featureTitle(feature), routeId)
		: `[${featureTitle(feature)}](${publicHrefForRouteId(universalFeatureRouteId)}#${featureRowAnchor(feature)})`;
}
