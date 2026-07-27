import type { SupportedLanguage } from "../dumling";

export class DumdictLanguageMismatchError extends Error {
	readonly expectedLanguage: SupportedLanguage;
	readonly actualLanguage: SupportedLanguage | undefined;

	constructor(input: {
		expectedLanguage: SupportedLanguage;
		actualLanguage: SupportedLanguage | undefined;
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

