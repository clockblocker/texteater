/**
 * Authored definitions of the German pronoun Syncretisms (system ADR 0046),
 * keyed by `<Kind> <Canonical Form> <case> <pronType>: <syncretic>`. A
 * definition here replaces the one generation joins from the units'
 * definitions, which reads badly when they differ. Generation fails when a
 * key names no Syncretism.
 */
export const syncretismDefinitions: Readonly<Record<string, string>> = {
	"PRON deren Gen Dem: gender number":
		"Das Demonstrativpronomen „deren“ verweist betont auf eine im Kontext bestimmte Person oder Sache im Femininum Singular oder auf mehrere im Plural; der Text lässt offen, welches gemeint ist. Vor einem Nomen ordnet es dieses ihr oder ihnen zu: meine Schwester und deren Mann, die Gäste und deren Kinder.",
	"PRON deren Gen Rel: gender number":
		"Das Relativpronomen „deren“ leitet einen Relativsatz ein und verweist auf dessen Bezugswort im Femininum Singular oder im Plural; der Text lässt offen, welches gemeint ist. Vor einem Nomen ordnet es dieses dem Bezugswort zu: die Tochter der Nachbarn, deren Haus leer steht.",
	"PRON ihnen Dat Prs: polite":
		"Die Personalpronomenform „ihnen“ verweist auf die dritte Person Mehrzahl oder, groß geschrieben, auf eine oder mehrere höflich angesprochene Personen; am Satzanfang lässt der Text offen, welches gemeint ist.",
	"PRON ihrer Gen Prs: gender number":
		"Die Personalpronomenform „ihrer“ verweist auf die weibliche dritte Person Einzahl oder auf die dritte Person Mehrzahl; der Text lässt offen, welche gemeint ist.",
	"PRON ihrer Gen Prs: gender number polite":
		"Die Personalpronomenform „ihrer“ verweist auf die weibliche dritte Person Einzahl, auf die dritte Person Mehrzahl oder, groß geschrieben, auf eine oder mehrere höflich angesprochene Personen; am Satzanfang lässt der Text offen, welches gemeint ist.",
	"PRON ihrer Gen Prs: polite":
		"Die Personalpronomenform „ihrer“ verweist auf die dritte Person Mehrzahl oder, groß geschrieben, auf eine oder mehrere höflich angesprochene Personen; am Satzanfang lässt der Text offen, welches gemeint ist.",
	"PRON sie Acc Prs: gender number":
		"Die Personalpronomenform „sie“ verweist auf die weibliche dritte Person Einzahl oder auf die dritte Person Mehrzahl; der Text lässt offen, welche gemeint ist.",
	"PRON sie Acc Prs: gender number polite":
		"Die Personalpronomenform „sie“ verweist auf die weibliche dritte Person Einzahl, auf die dritte Person Mehrzahl oder, groß geschrieben, auf eine oder mehrere höflich angesprochene Personen; am Satzanfang lässt der Text offen, welches gemeint ist.",
	"PRON sie Acc Prs: polite":
		"Die Personalpronomenform „sie“ verweist auf die dritte Person Mehrzahl oder, groß geschrieben, auf eine oder mehrere höflich angesprochene Personen; am Satzanfang lässt der Text offen, welches gemeint ist.",
	"PRON sie Nom Prs: gender number":
		"Die Personalpronomenform „sie“ verweist auf die weibliche dritte Person Einzahl oder auf die dritte Person Mehrzahl; der Text lässt offen, welche gemeint ist.",
	"PRON sie Nom Prs: gender number polite":
		"Die Personalpronomenform „sie“ verweist auf die weibliche dritte Person Einzahl, auf die dritte Person Mehrzahl oder, groß geschrieben, auf eine oder mehrere höflich angesprochene Personen; am Satzanfang lässt der Text offen, welches gemeint ist.",
	"PRON sie Nom Prs: polite":
		"Die Personalpronomenform „sie“ verweist auf die dritte Person Mehrzahl oder, groß geschrieben, auf eine oder mehrere höflich angesprochene Personen; am Satzanfang lässt der Text offen, welches gemeint ist.",
};
