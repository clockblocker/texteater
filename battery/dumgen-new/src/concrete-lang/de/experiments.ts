import { evaluationCaseIds as e0 } from "./grammatical-resolution/construction/fusion/evaluation-ids.js";
import { promptSource as p0 } from "./grammatical-resolution/construction/fusion/prompt.js";
import { evaluationCaseIds as e1 } from "./grammatical-resolution/lexeme/adjective/evaluation-ids.js";
import { promptSource as p1 } from "./grammatical-resolution/lexeme/adjective/prompt.js";
import { evaluationCaseIds as e2 } from "./grammatical-resolution/lexeme/adposition/evaluation-ids.js";
import { promptSource as p2 } from "./grammatical-resolution/lexeme/adposition/prompt.js";
import { evaluationCaseIds as e3 } from "./grammatical-resolution/lexeme/adverb/evaluation-ids.js";
import { promptSource as p3 } from "./grammatical-resolution/lexeme/adverb/prompt.js";
import { evaluationCaseIds as e4 } from "./grammatical-resolution/lexeme/auxiliary/evaluation-ids.js";
import { promptSource as p4 } from "./grammatical-resolution/lexeme/auxiliary/prompt.js";
import { evaluationCaseIds as e5 } from "./grammatical-resolution/lexeme/coordinating-conjunction/evaluation-ids.js";
import { promptSource as p5 } from "./grammatical-resolution/lexeme/coordinating-conjunction/prompt.js";
import { evaluationCaseIds as e6 } from "./grammatical-resolution/lexeme/determiner/evaluation-ids.js";
import { promptSource as p6 } from "./grammatical-resolution/lexeme/determiner/prompt.js";
import { evaluationCaseIds as e7 } from "./grammatical-resolution/lexeme/interjection/evaluation-ids.js";
import { promptSource as p7 } from "./grammatical-resolution/lexeme/interjection/prompt.js";
import { evaluationCaseIds as e8 } from "./grammatical-resolution/lexeme/noun/evaluation-ids.js";
import { promptSource as p8 } from "./grammatical-resolution/lexeme/noun/prompt.js";
import { evaluationCaseIds as e9 } from "./grammatical-resolution/lexeme/numeral/evaluation-ids.js";
import { promptSource as p9 } from "./grammatical-resolution/lexeme/numeral/prompt.js";
import { evaluationCaseIds as e10 } from "./grammatical-resolution/lexeme/other/evaluation-ids.js";
import { promptSource as p10 } from "./grammatical-resolution/lexeme/other/prompt.js";
import { evaluationCaseIds as e11 } from "./grammatical-resolution/lexeme/particle/evaluation-ids.js";
import { promptSource as p11 } from "./grammatical-resolution/lexeme/particle/prompt.js";
import { evaluationCaseIds as e12 } from "./grammatical-resolution/lexeme/pronoun/evaluation-ids.js";
import { promptSource as p12 } from "./grammatical-resolution/lexeme/pronoun/prompt.js";
import { evaluationCaseIds as e13 } from "./grammatical-resolution/lexeme/proper-noun/evaluation-ids.js";
import { promptSource as p13 } from "./grammatical-resolution/lexeme/proper-noun/prompt.js";
import { evaluationCaseIds as e14 } from "./grammatical-resolution/lexeme/subordinating-conjunction/evaluation-ids.js";
import { promptSource as p14 } from "./grammatical-resolution/lexeme/subordinating-conjunction/prompt.js";
import { evaluationCaseIds as e15 } from "./grammatical-resolution/lexeme/symbol/evaluation-ids.js";
import { promptSource as p15 } from "./grammatical-resolution/lexeme/symbol/prompt.js";
import { evaluationCaseIds as e16 } from "./grammatical-resolution/lexeme/verb/evaluation-ids.js";
import { promptSource as p16 } from "./grammatical-resolution/lexeme/verb/prompt.js";
import { evaluationCaseIds as e17 } from "./grammatical-resolution/phraseme/aphorism/evaluation-ids.js";
import { promptSource as p17 } from "./grammatical-resolution/phraseme/aphorism/prompt.js";
import { evaluationCaseIds as e18 } from "./grammatical-resolution/phraseme/collocation/evaluation-ids.js";
import { promptSource as p18 } from "./grammatical-resolution/phraseme/collocation/prompt.js";
import { evaluationCaseIds as e19 } from "./grammatical-resolution/phraseme/discourse-formula/evaluation-ids.js";
import { promptSource as p19 } from "./grammatical-resolution/phraseme/discourse-formula/prompt.js";
import { evaluationCaseIds as e20 } from "./grammatical-resolution/phraseme/idiom/evaluation-ids.js";
import { promptSource as p20 } from "./grammatical-resolution/phraseme/idiom/prompt.js";
import { evaluationCaseIds as e21 } from "./grammatical-resolution/phraseme/proverb/evaluation-ids.js";
import { promptSource as p21 } from "./grammatical-resolution/phraseme/proverb/prompt.js";
import { evaluationCaseIds as e22 } from "./knowledge-production/construction/evaluation-ids.js";
import { promptSource as p22 } from "./knowledge-production/construction/prompt.js";
import { evaluationCaseIds as e23 } from "./knowledge-production/lexeme/evaluation-ids.js";
import { promptSource as p23 } from "./knowledge-production/lexeme/prompt.js";
import { evaluationCaseIds as e30 } from "./knowledge-production/lexical-breakdown/resolution/evaluation-ids.js";
import { promptSource as p30 } from "./knowledge-production/lexical-breakdown/resolution/prompt.js";
import { evaluationCaseIds as e31 } from "./knowledge-production/lexical-breakdown/segmentation/evaluation-ids.js";
import { promptSource as p31 } from "./knowledge-production/lexical-breakdown/segmentation/prompt.js";
import { evaluationCaseIds as e24 } from "./knowledge-production/morpheme/evaluation-ids.js";
import { promptSource as p24 } from "./knowledge-production/morpheme/prompt.js";
import { evaluationCaseIds as e32 } from "./knowledge-production/morphological-tree/resolution/evaluation-ids.js";
import { promptSource as p32 } from "./knowledge-production/morphological-tree/resolution/prompt.js";
import { evaluationCaseIds as e33 } from "./knowledge-production/morphological-tree/segmentation/evaluation-ids.js";
import { promptSource as p33 } from "./knowledge-production/morphological-tree/segmentation/prompt.js";
import { evaluationCaseIds as e25 } from "./knowledge-production/phraseme/evaluation-ids.js";
import { promptSource as p25 } from "./knowledge-production/phraseme/prompt.js";
import { evaluationCaseIds as e34 } from "./knowledge-production/translation/evaluation-ids.js";
import { promptSource as p34 } from "./knowledge-production/translation/prompt.js";
import { evaluationCaseIds as e26 } from "./reading-emoji-description/generate/evaluation-ids.js";
import { promptSource as p26 } from "./reading-emoji-description/generate/prompt.js";
import { evaluationCaseIds as e27 } from "./reading-emoji-description/resolve/evaluation-ids.js";
import { promptSource as p27 } from "./reading-emoji-description/resolve/prompt.js";
import { evaluationCaseIds as e28 } from "./segmentation/evaluation-ids.js";
import { promptSource as p28 } from "./segmentation/prompt.js";
import { evaluationCaseIds as e29 } from "./target-classification/evaluation-ids.js";
import { promptSource as p29 } from "./target-classification/prompt.js";
export const promptRegistrations = [
	{ promptSource: p0, evaluationCaseIds: e0 },
	{ promptSource: p1, evaluationCaseIds: e1 },
	{ promptSource: p2, evaluationCaseIds: e2 },
	{ promptSource: p3, evaluationCaseIds: e3 },
	{ promptSource: p4, evaluationCaseIds: e4 },
	{ promptSource: p5, evaluationCaseIds: e5 },
	{ promptSource: p6, evaluationCaseIds: e6 },
	{ promptSource: p7, evaluationCaseIds: e7 },
	{ promptSource: p8, evaluationCaseIds: e8 },
	{ promptSource: p9, evaluationCaseIds: e9 },
	{ promptSource: p10, evaluationCaseIds: e10 },
	{ promptSource: p11, evaluationCaseIds: e11 },
	{ promptSource: p12, evaluationCaseIds: e12 },
	{ promptSource: p13, evaluationCaseIds: e13 },
	{ promptSource: p14, evaluationCaseIds: e14 },
	{ promptSource: p15, evaluationCaseIds: e15 },
	{ promptSource: p16, evaluationCaseIds: e16 },
	{ promptSource: p17, evaluationCaseIds: e17 },
	{ promptSource: p18, evaluationCaseIds: e18 },
	{ promptSource: p19, evaluationCaseIds: e19 },
	{ promptSource: p20, evaluationCaseIds: e20 },
	{ promptSource: p21, evaluationCaseIds: e21 },
	{ promptSource: p22, evaluationCaseIds: e22 },
	{ promptSource: p23, evaluationCaseIds: e23 },
	{ promptSource: p24, evaluationCaseIds: e24 },
	{ promptSource: p25, evaluationCaseIds: e25 },
	{ promptSource: p26, evaluationCaseIds: e26 },
	{ promptSource: p27, evaluationCaseIds: e27 },
	{ promptSource: p28, evaluationCaseIds: e28 },
	{ promptSource: p29, evaluationCaseIds: e29 },
	{ promptSource: p30, evaluationCaseIds: e30 },
	{ promptSource: p31, evaluationCaseIds: e31 },
	{ promptSource: p32, evaluationCaseIds: e32 },
	{ promptSource: p33, evaluationCaseIds: e33 },
	{ promptSource: p34, evaluationCaseIds: e34 },
] as const;
