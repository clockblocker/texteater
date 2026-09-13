import type * as Dumling from "dumling/types";

export class DumdictLanguageMismatchError extends Error {
	readonly expectedLanguage: Dumling.Language;
	readonly actualLanguage: Dumling.Language | undefined;

	constructor(input: {
		expectedLanguage: Dumling.Language;
		actualLanguage: Dumling.Language | undefined;
		message?: string;
	}) {
		super(
			input.message ??
				`Expected dumdict language ${input.expectedLanguage}, got ${input.actualLanguage ?? "unknown"}`,
		);
		this.name = "DumdictLanguageMismatchError";
		this.expectedLanguage = input.expectedLanguage;
		this.actualLanguage = input.actualLanguage;
	}
}

export class DumdictNotImplementedError extends Error {
	constructor(feature: string) {
		super(`${feature} is not implemented yet`);
		this.name = "DumdictNotImplementedError";
	}
}
