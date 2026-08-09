export const IDS = {
	wordClasses: "https://grammis.ids-mannheim.de/sgt/2195",
	phraseolexeme: "https://grammis.ids-mannheim.de/terminologie/1175",
	functionVerbGroup: "https://grammis.ids-mannheim.de/vggf/2202",
	prepositionalGroup: "https://grammis.ids-mannheim.de/sgt/2262",
	reflexivePronoun: "https://grammis.ids-mannheim.de/progr%40mm/5205",
	separableVerb: "https://grammis.ids-mannheim.de/progr%40mm/6922",
	verbalPeriphrasis: "https://grammis.ids-mannheim.de/progr%40mm/1695",
	modalVerb: "https://grammis.ids-mannheim.de/terminologie/155",
	copula: "https://grammis.ids-mannheim.de/terminologie/146",
	pairedFrame: "https://grammis.ids-mannheim.de/systematische-grammatik/2118",
	proverbMorgenstund:
		"https://ids-pub.bsz-bw.de/frontdoor/deliver/index/docId/13187/file/Hein_Zugang_zur_Sprichwortbedeutung_2012.pdf",
	idiomIce:
		"https://ids-pub.bsz-bw.de/frontdoor/deliver/index/docId/7790/file/Harras_Idiome_1997.pdf",
	wolvesExpression:
		"https://ids-pub.bsz-bw.de/frontdoor/deliver/index/docId/13241/file/Matulina_Die_Verwendung_von_Sprichwoertern_2012.pdf",
	walkingVerb: "https://grammis.ids-mannheim.de/verbvalenz/400901",
	fusionZu: "https://grammis.ids-mannheim.de/praepositionen/299700",
	questionSupportVerb:
		"https://grammis.ids-mannheim.de/systematische-grammatik/514",
} as const;

export function evidence(source: string, claim: string): string {
	return `${claim} Source: ${source}`;
}
