import type { SchemaRoute } from "./schema-routes";
import { featurePageId, routePageId } from "./spec-pages";

const routePagePattern =
	/^(?<language>[^/]+)\/entity\/lemma\/(?:lexeme|morpheme|phraseme)\/[^/]+$/u;
const featurePagePattern = /^(?<language>[^/]+)\/feature\/[^/]+$/u;
/** Feature pages that group other pages rather than name a feature. */
const featureGroupPages = new Set(["attestation", "surface"]);

/**
 * Compares the docs pages with the Dumling schema routes (ADR 0037). Every
 * language × Family × Kind route needs a page, and so does every universal
 * Kind, and every feature a language's routes allow; every Kind or language
 * feature page needs a route. Returns one message per mismatch.
 */
export function checkRoutePages(
	pageRouteIds: Iterable<string>,
	routes: readonly SchemaRoute[],
): string[] {
	const pages = new Set(pageRouteIds);
	const routePages = new Set([
		...routes.map((route) =>
			routePageId(route.language, route.family, route.kind),
		),
		...routes.map((route) => routePageId("u", route.family, route.kind)),
	]);
	const featurePages = new Set(
		routes.flatMap((route) =>
			route.features.map((feature) =>
				featurePageId(route.language, feature.name),
			),
		),
	);
	const languages = new Set<string>(routes.map((route) => route.language));

	const problems = [
		...[...routePages]
			.filter((routeId) => !pages.has(routeId))
			.map((routeId) => `The schema route ${routeId} has no page.`),
		...[...featurePages]
			.filter((routeId) => !pages.has(routeId))
			.map((routeId) => `The schema feature ${routeId} has no page.`),
	];
	for (const routeId of pages) {
		if (routePagePattern.test(routeId) && !routePages.has(routeId)) {
			problems.push(`The page ${routeId} has no schema route.`);
		}
		const feature = featurePagePattern.exec(routeId);
		const language = feature?.groups?.language;
		if (
			language !== undefined &&
			languages.has(language) &&
			!featureGroupPages.has(
				routeId.slice(`${language}/feature/`.length),
			) &&
			!featurePages.has(routeId)
		) {
			problems.push(
				`The page ${routeId} names a feature no ${language} route allows.`,
			);
		}
	}
	return problems.toSorted();
}
