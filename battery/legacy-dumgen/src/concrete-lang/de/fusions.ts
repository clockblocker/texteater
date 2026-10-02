import { germanFusions } from "./fusion-entries.js";

type Fusion = {
	adposition: string;
	articleForm: string;
	articleCase: "Dat" | "Acc";
};

/**
 * A preposition-article fusion as grammatical attachment consumes it, derived
 * from the reviewed Entry table. Colloquial fusions (aufs, übers) count too:
 * intake splits every one into its pieces (ADR 0004, ADR 0035).
 */
export function germanFusion(form: string): Fusion | undefined {
	const normalized = form.normalize("NFC").toLocaleLowerCase("de");
	const entry = germanFusions.find(
		(candidate) => candidate.form === normalized,
	);
	if (!entry) return undefined;
	const [adposition, article] = entry.components;
	return {
		adposition: adposition.surface as string,
		articleForm: article.surface as string,
		articleCase: entry.article.case,
	};
}
