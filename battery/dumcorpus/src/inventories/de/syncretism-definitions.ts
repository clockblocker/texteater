/**
 * Authored definitions of the German pronoun Syncretisms (system ADR 0046),
 * keyed by `<Kind> <Canonical Form> <case> <pronType>: <syncretic>`. A
 * definition here replaces the one generation joins from the units'
 * definitions, which reads badly when they differ. Generation fails when a
 * key names no Syncretism.
 */
export const syncretismDefinitions: Readonly<Record<string, string>> = {
	"PRON dem Dat Dem: gender":
		"Das Demonstrativpronomen „dem“ verweist betont auf eine im Kontext bestimmte Person oder Sache im Maskulinum oder im Neutrum Singular; der Text lässt offen, welches gemeint ist.",
	"PRON dem Dat Rel: gender":
		"Das Relativpronomen „dem“ leitet einen Relativsatz ein und verweist auf dessen Bezugswort im Maskulinum oder im Neutrum Singular; der Text lässt offen, welches gemeint ist.",
	"PRON deren Gen Dem: gender number":
		"Das Demonstrativpronomen „deren“ verweist betont auf eine im Kontext bestimmte Person oder Sache im Femininum Singular oder auf mehrere im Plural; der Text lässt offen, welches gemeint ist. Vor einem Nomen ordnet es dieses ihr oder ihnen zu: meine Schwester und deren Mann, die Gäste und deren Kinder.",
	"PRON deren Gen Rel: gender number":
		"Das Relativpronomen „deren“ leitet einen Relativsatz ein und verweist auf dessen Bezugswort im Femininum Singular oder im Plural; der Text lässt offen, welches gemeint ist. Vor einem Nomen ordnet es dieses dem Bezugswort zu: die Tochter der Nachbarn, deren Haus leer steht.",
	"PRON dessen Gen Dem: gender":
		"Das Demonstrativpronomen „dessen“ verweist betont auf eine im Kontext bestimmte Person oder Sache im Maskulinum oder im Neutrum Singular; der Text lässt offen, welches gemeint ist. Vor einem Nomen ordnet es dieses ihr zu: mein Freund und dessen Hund, das Haus und dessen Dach.",
	"PRON dessen Gen Rel: gender":
		"Das Relativpronomen „dessen“ leitet einen Relativsatz ein und verweist auf dessen Bezugswort im Maskulinum oder im Neutrum Singular; der Text lässt offen, welches gemeint ist. Vor einem Nomen ordnet es dieses dem Bezugswort zu: der Autor, dessen Buch fehlt; das Haus, dessen Tür offen steht.",
	"PRON einem Dat Ind: gender":
		"Bezeichnet eine unbestimmte einzelne Person oder Sache im Maskulinum oder im Neutrum; der Text lässt offen, welches gemeint ist. Form: Dativ, Singular.",
	"PRON eines Gen Ind: gender":
		"Bezeichnet eine unbestimmte einzelne Person oder Sache im Maskulinum oder im Neutrum; der Text lässt offen, welches gemeint ist. Form: Genitiv, Singular.",
	"PRON ihm Dat Prs: gender":
		"Die Personalpronomenform „ihm“ ist der Dativ von „er“ oder von „es“ und verweist auf die männliche oder die sächliche dritte Person Einzahl; der Text lässt offen, welche gemeint ist.",
	"PRON ihnen Dat Prs: polite":
		"Die Personalpronomenform „ihnen“ verweist auf die dritte Person Mehrzahl oder, groß geschrieben, auf eine oder mehrere höflich angesprochene Personen; am Satzanfang lässt der Text offen, welches gemeint ist.",
	"PRON ihrer Gen Prs: gender number":
		"Die Personalpronomenform „ihrer“ verweist auf die weibliche dritte Person Einzahl oder auf die dritte Person Mehrzahl; der Text lässt offen, welche gemeint ist.",
	"PRON ihrer Gen Prs: gender number polite":
		"Die Personalpronomenform „ihrer“ verweist auf die weibliche dritte Person Einzahl, auf die dritte Person Mehrzahl oder, groß geschrieben, auf eine oder mehrere höflich angesprochene Personen; am Satzanfang lässt der Text offen, welches gemeint ist.",
	"PRON ihrer Gen Prs: polite":
		"Die Personalpronomenform „ihrer“ verweist auf die dritte Person Mehrzahl oder, groß geschrieben, auf eine oder mehrere höflich angesprochene Personen; am Satzanfang lässt der Text offen, welches gemeint ist.",
	"PRON seiner Gen Prs: gender":
		"Die Personalpronomenform „seiner“ ist der Genitiv von „er“ oder von „es“ und verweist auf die männliche oder die sächliche dritte Person Einzahl; der Text lässt offen, welche gemeint ist.",
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
