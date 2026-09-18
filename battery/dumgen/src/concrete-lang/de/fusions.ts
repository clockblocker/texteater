type Fusion = {
	adposition: string;
	articleForm: string;
	articleLemma: string;
	articleCase: "Dat" | "Acc";
};

/** Reviewed lexical decomposition shared by grammatical attachment and breakdown Knowledge. */
const fusions: Readonly<Record<string, Fusion>> = {
	im: {
		articleCase: "Dat",
		adposition: "in",
		articleForm: "dem",
		articleLemma: "der",
	},
	zum: {
		articleCase: "Dat",
		adposition: "zu",
		articleForm: "dem",
		articleLemma: "der",
	},
	ins: {
		articleCase: "Acc",
		adposition: "in",
		articleForm: "das",
		articleLemma: "das",
	},
	ans: {
		articleCase: "Acc",
		adposition: "an",
		articleForm: "das",
		articleLemma: "das",
	},
	am: {
		articleCase: "Dat",
		adposition: "an",
		articleForm: "dem",
		articleLemma: "der",
	},
	beim: {
		articleCase: "Dat",
		adposition: "bei",
		articleForm: "dem",
		articleLemma: "der",
	},
	vom: {
		articleCase: "Dat",
		adposition: "von",
		articleForm: "dem",
		articleLemma: "der",
	},
	zur: {
		articleCase: "Dat",
		adposition: "zu",
		articleForm: "der",
		articleLemma: "die",
	},
};

export function germanFusion(form: string): Fusion | undefined {
	const normalized = form.normalize("NFC").toLocaleLowerCase("de");
	return Object.hasOwn(fusions, normalized) ? fusions[normalized] : undefined;
}
