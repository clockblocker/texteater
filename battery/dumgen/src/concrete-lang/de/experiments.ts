import { corpusSource as p1 } from "./grammatical-resolution/lexeme/adjective/corpus.js";
import { evaluationCaseIds as e1 } from "./grammatical-resolution/lexeme/adjective/evaluation-ids.js";
import { corpusSource as p2 } from "./grammatical-resolution/lexeme/adposition/corpus.js";
import { evaluationCaseIds as e2 } from "./grammatical-resolution/lexeme/adposition/evaluation-ids.js";
import { corpusSource as p3 } from "./grammatical-resolution/lexeme/adverb/corpus.js";
import { evaluationCaseIds as e3 } from "./grammatical-resolution/lexeme/adverb/evaluation-ids.js";
import { corpusSource as p4 } from "./grammatical-resolution/lexeme/auxiliary/corpus.js";
import { evaluationCaseIds as e4 } from "./grammatical-resolution/lexeme/auxiliary/evaluation-ids.js";
import { corpusSource as p5 } from "./grammatical-resolution/lexeme/coordinating-conjunction/corpus.js";
import { evaluationCaseIds as e5 } from "./grammatical-resolution/lexeme/coordinating-conjunction/evaluation-ids.js";
import { corpusSource as p6 } from "./grammatical-resolution/lexeme/determiner/corpus.js";
import { evaluationCaseIds as e6 } from "./grammatical-resolution/lexeme/determiner/evaluation-ids.js";
import { corpusSource as p7 } from "./grammatical-resolution/lexeme/interjection/corpus.js";
import { evaluationCaseIds as e7 } from "./grammatical-resolution/lexeme/interjection/evaluation-ids.js";
import { corpusSource as p8 } from "./grammatical-resolution/lexeme/noun/corpus.js";
import { evaluationCaseIds as e8 } from "./grammatical-resolution/lexeme/noun/evaluation-ids.js";
import { corpusSource as p9 } from "./grammatical-resolution/lexeme/numeral/corpus.js";
import { evaluationCaseIds as e9 } from "./grammatical-resolution/lexeme/numeral/evaluation-ids.js";
import { corpusSource as p10 } from "./grammatical-resolution/lexeme/other/corpus.js";
import { evaluationCaseIds as e10 } from "./grammatical-resolution/lexeme/other/evaluation-ids.js";
import { corpusSource as p11 } from "./grammatical-resolution/lexeme/particle/corpus.js";
import { evaluationCaseIds as e11 } from "./grammatical-resolution/lexeme/particle/evaluation-ids.js";
import { corpusSource as p12 } from "./grammatical-resolution/lexeme/pronoun/corpus.js";
import { evaluationCaseIds as e12 } from "./grammatical-resolution/lexeme/pronoun/evaluation-ids.js";
import { corpusSource as p13 } from "./grammatical-resolution/lexeme/proper-noun/corpus.js";
import { evaluationCaseIds as e13 } from "./grammatical-resolution/lexeme/proper-noun/evaluation-ids.js";
import { corpusSource as p14 } from "./grammatical-resolution/lexeme/subordinating-conjunction/corpus.js";
import { evaluationCaseIds as e14 } from "./grammatical-resolution/lexeme/subordinating-conjunction/evaluation-ids.js";
import { corpusSource as p15 } from "./grammatical-resolution/lexeme/symbol/corpus.js";
import { evaluationCaseIds as e15 } from "./grammatical-resolution/lexeme/symbol/evaluation-ids.js";
import { corpusSource as p16 } from "./grammatical-resolution/lexeme/verb/corpus.js";
import { evaluationCaseIds as e16 } from "./grammatical-resolution/lexeme/verb/evaluation-ids.js";
import { corpusSource as p17 } from "./grammatical-resolution/phraseme/aphorism/corpus.js";
import { evaluationCaseIds as e17 } from "./grammatical-resolution/phraseme/aphorism/evaluation-ids.js";
import { corpusSource as p18 } from "./grammatical-resolution/phraseme/collocation/corpus.js";
import { evaluationCaseIds as e18 } from "./grammatical-resolution/phraseme/collocation/evaluation-ids.js";
import { corpusSource as p19 } from "./grammatical-resolution/phraseme/discourse-formula/corpus.js";
import { evaluationCaseIds as e19 } from "./grammatical-resolution/phraseme/discourse-formula/evaluation-ids.js";
import { corpusSource as p20 } from "./grammatical-resolution/phraseme/idiom/corpus.js";
import { evaluationCaseIds as e20 } from "./grammatical-resolution/phraseme/idiom/evaluation-ids.js";
import { corpusSource as p21 } from "./grammatical-resolution/phraseme/proverb/corpus.js";
import { evaluationCaseIds as e21 } from "./grammatical-resolution/phraseme/proverb/evaluation-ids.js";
import { corpusSource as p36 } from "./knowledge-production/governed-prepositions/corpus.js";
import { evaluationCaseIds as e36 } from "./knowledge-production/governed-prepositions/evaluation-ids.js";
import { corpusSource as p23 } from "./knowledge-production/lexeme/corpus.js";
import { evaluationCaseIds as e23 } from "./knowledge-production/lexeme/evaluation-ids.js";
import { evaluationCaseIds as e30 } from "./knowledge-production/lexical-breakdown/resolution/evaluation-ids.js";
import { promptSource as p30 } from "./knowledge-production/lexical-breakdown/resolution/prompt.js";
import { evaluationCaseIds as e31 } from "./knowledge-production/lexical-breakdown/segmentation/evaluation-ids.js";
import { promptSource as p31 } from "./knowledge-production/lexical-breakdown/segmentation/prompt.js";
import { corpusSource as p24 } from "./knowledge-production/morpheme/corpus.js";
import { evaluationCaseIds as e24 } from "./knowledge-production/morpheme/evaluation-ids.js";
import { evaluationCaseIds as e32 } from "./knowledge-production/morphological-tree/resolution/evaluation-ids.js";
import { promptSource as p32 } from "./knowledge-production/morphological-tree/resolution/prompt.js";
import { evaluationCaseIds as e33 } from "./knowledge-production/morphological-tree/segmentation/evaluation-ids.js";
import { promptSource as p33 } from "./knowledge-production/morphological-tree/segmentation/prompt.js";
import { corpusSource as p25 } from "./knowledge-production/phraseme/corpus.js";
import { evaluationCaseIds as e25 } from "./knowledge-production/phraseme/evaluation-ids.js";
import { corpusSource as p34 } from "./knowledge-production/translation/corpus.js";
import { evaluationCaseIds as e34 } from "./knowledge-production/translation/evaluation-ids.js";
import { evaluationCaseIds as e26 } from "./reading-emoji-description/generate/evaluation-ids.js";
import { promptSource as p26 } from "./reading-emoji-description/generate/prompt.js";
import { corpusSource as p27 } from "./reading-emoji-description/resolve/corpus.js";
import { evaluationCaseIds as e27 } from "./reading-emoji-description/resolve/evaluation-ids.js";
import { corpusSource as p28 } from "./segmentation/corpus.js";
import { evaluationCaseIds as e28 } from "./segmentation/evaluation-ids.js";
import { corpusSource as p35 } from "./sentence-analysis/corpus.js";
import { evaluationCaseIds as e35 } from "./sentence-analysis/evaluation-ids.js";
import { corpusSource as p29 } from "./target-classification/corpus.js";
import { evaluationCaseIds as e29 } from "./target-classification/evaluation-ids.js";
export const corpusRegistrations = [
	{ source: p1, evaluationCaseIds: e1 },
	{ source: p2, evaluationCaseIds: e2 },
	{ source: p3, evaluationCaseIds: e3 },
	{ source: p4, evaluationCaseIds: e4 },
	{ source: p5, evaluationCaseIds: e5 },
	{ source: p6, evaluationCaseIds: e6 },
	{ source: p7, evaluationCaseIds: e7 },
	{ source: p8, evaluationCaseIds: e8 },
	{ source: p9, evaluationCaseIds: e9 },
	{ source: p10, evaluationCaseIds: e10 },
	{ source: p11, evaluationCaseIds: e11 },
	{ source: p12, evaluationCaseIds: e12 },
	{ source: p13, evaluationCaseIds: e13 },
	{ source: p14, evaluationCaseIds: e14 },
	{ source: p15, evaluationCaseIds: e15 },
	{ source: p16, evaluationCaseIds: e16 },
	{ source: p17, evaluationCaseIds: e17 },
	{ source: p18, evaluationCaseIds: e18 },
	{ source: p19, evaluationCaseIds: e19 },
	{ source: p20, evaluationCaseIds: e20 },
	{ source: p21, evaluationCaseIds: e21 },
	{ source: p23, evaluationCaseIds: e23 },
	{ source: p24, evaluationCaseIds: e24 },
	{ source: p25, evaluationCaseIds: e25 },
	{ source: p26, evaluationCaseIds: e26 },
	{ source: p27, evaluationCaseIds: e27 },
	{ source: p28, evaluationCaseIds: e28 },
	{ source: p29, evaluationCaseIds: e29 },
	{ source: p35, evaluationCaseIds: e35 },
	{ source: p30, evaluationCaseIds: e30 },
	{ source: p31, evaluationCaseIds: e31 },
	{ source: p32, evaluationCaseIds: e32 },
	{ source: p33, evaluationCaseIds: e33 },
	{ source: p34, evaluationCaseIds: e34 },
	{ source: p36, evaluationCaseIds: e36 },
] as const;
