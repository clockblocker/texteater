export function requireNonEmptyFeatureBag<T extends object>(
	features: T | undefined,
	bagName: string,
): T | undefined {
	if (features === undefined) {
		return undefined;
	}

	if (!Object.values(features).some((value) => value !== undefined)) {
		throw new Error(`${bagName} must contain at least one marked value`);
	}

	return features;
}
