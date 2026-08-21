export function createLazyLanguageApiRecord<
	const Languages extends readonly string[],
	ApiByLanguage extends Record<Languages[number], unknown>,
>(
	languages: Languages,
	builders: {
		[Language in Languages[number]]: () => ApiByLanguage[Language];
	},
): Readonly<{
	get: <Language extends Languages[number]>(
		language: Language,
	) => ApiByLanguage[Language];
	record: Readonly<ApiByLanguage>;
}> {
	type Language = Languages[number];
	const cache = new Map<Language, ApiByLanguage[Language]>();
	const get = <SelectedLanguage extends Language>(
		language: SelectedLanguage,
	): ApiByLanguage[SelectedLanguage] => {
		const cached = cache.get(language);
		if (cached !== undefined) {
			return cached as ApiByLanguage[SelectedLanguage];
		}
		const created = builders[language]();
		cache.set(language, created);
		return created;
	};
	const record = Object.defineProperties(
		{},
		Object.fromEntries(
			languages.map((language) => [
				language,
				{ enumerable: true, get: () => get(language) },
			]),
		),
	) as Readonly<ApiByLanguage>;
	return { get, record };
}
