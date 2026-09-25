import { germanFusions } from "./fusion-entries.js";

type Fusion = {
	adposition: string;
	articleForm: string;
	articleCase: "Dat" | "Acc";
};

/**
 * The standard preposition-article fusions as grammatical attachment and
 * breakdown Knowledge consume them, derived from the reviewed Entry table.
 * Colloquial fusions stay out of production attachment until the Segment
 * split of ADR 0004 lands.
 */
export function germanFusion(form: string): Fusion | undefined {
	const normalized = form.normalize("NFC").toLocaleLowerCase("de");
	const entry = germanFusions.find(
		(candidate) =>
			candidate.register === "Standard" && candidate.form === normalized,
	);
	if (!entry) return undefined;
	const [adposition, article] = entry.components;
	return {
		adposition: adposition.surface as string,
		articleForm: article.surface as string,
		articleCase: entry.article.case,
	};
}
