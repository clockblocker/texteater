export function requireNonEmptyFeatureBag<T extends object>(
	features: T | null | undefined,
	bagName: string,
): T | null {
	if (features == null) {
		return null;
	}

	if (!Object.values(features).some((value) => value !== null)) {
		throw new Error(`${bagName} must contain at least one marked value`);
	}

	return features;
}
