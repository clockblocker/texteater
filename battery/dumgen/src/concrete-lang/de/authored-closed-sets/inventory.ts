import { reviewedDeterminers } from "./determiner-paradigms.js";
import { member as aux6 } from "./members/lexeme/auxiliary/bekommen-rezipientenpassiv.js";
import { member as aux8 } from "./members/lexeme/auxiliary/haben-obligation.js";
import { member as aux2 } from "./members/lexeme/auxiliary/haben-perfekt.js";
import { member as aux7 } from "./members/lexeme/auxiliary/sein-modalpassiv.js";
import { member as aux0 } from "./members/lexeme/auxiliary/sein-perfekt.js";
import { member as aux9 } from "./members/lexeme/auxiliary/sein-verlaufsform.js";
import { member as aux1 } from "./members/lexeme/auxiliary/sein-zustandspassiv.js";
import { member as aux3 } from "./members/lexeme/auxiliary/werden-futur.js";
import { member as aux4 } from "./members/lexeme/auxiliary/werden-vorgangspassiv.js";
import { member as aux5 } from "./members/lexeme/auxiliary/werden-wuerde-konjunktiv.js";
import { member as article_das_neuter_singular_accusative } from "./members/lexeme/determiner/article/das-neuter-singular-accusative.js";
import { member as article_das_neuter_singular_nominative } from "./members/lexeme/determiner/article/das-neuter-singular-nominative.js";
import { member as article_dem_masculine_singular_dative } from "./members/lexeme/determiner/article/dem-masculine-singular-dative.js";
import { member as article_dem_neuter_singular_dative } from "./members/lexeme/determiner/article/dem-neuter-singular-dative.js";
import { member as article_den_masculine_singular_accusative } from "./members/lexeme/determiner/article/den-masculine-singular-accusative.js";
import { member as article_den_plural_dative } from "./members/lexeme/determiner/article/den-plural-dative.js";
import { member as article_der_feminine_singular_dative } from "./members/lexeme/determiner/article/der-feminine-singular-dative.js";
import { member as article_der_feminine_singular_genitive } from "./members/lexeme/determiner/article/der-feminine-singular-genitive.js";
import { member as article_der_masculine_singular_nominative } from "./members/lexeme/determiner/article/der-masculine-singular-nominative.js";
import { member as article_der_plural_genitive } from "./members/lexeme/determiner/article/der-plural-genitive.js";
import { member as article_des_masculine_singular_genitive } from "./members/lexeme/determiner/article/des-masculine-singular-genitive.js";
import { member as article_des_neuter_singular_genitive } from "./members/lexeme/determiner/article/des-neuter-singular-genitive.js";
import { member as article_die_feminine_singular_accusative } from "./members/lexeme/determiner/article/die-feminine-singular-accusative.js";
import { member as article_die_feminine_singular_nominative } from "./members/lexeme/determiner/article/die-feminine-singular-nominative.js";
import { member as article_die_plural_accusative } from "./members/lexeme/determiner/article/die-plural-accusative.js";
import { member as article_die_plural_nominative } from "./members/lexeme/determiner/article/die-plural-nominative.js";
import { member as article_ein_masculine_singular_nominative } from "./members/lexeme/determiner/article/ein-masculine-singular-nominative.js";
import { member as article_ein_neuter_singular_accusative } from "./members/lexeme/determiner/article/ein-neuter-singular-accusative.js";
import { member as article_ein_neuter_singular_nominative } from "./members/lexeme/determiner/article/ein-neuter-singular-nominative.js";
import { member as article_eine_feminine_singular_accusative } from "./members/lexeme/determiner/article/eine-feminine-singular-accusative.js";
import { member as article_eine_feminine_singular_nominative } from "./members/lexeme/determiner/article/eine-feminine-singular-nominative.js";
import { member as article_einem_masculine_singular_dative } from "./members/lexeme/determiner/article/einem-masculine-singular-dative.js";
import { member as article_einem_neuter_singular_dative } from "./members/lexeme/determiner/article/einem-neuter-singular-dative.js";
import { member as article_einen_masculine_singular_accusative } from "./members/lexeme/determiner/article/einen-masculine-singular-accusative.js";
import { member as article_einer_feminine_singular_dative } from "./members/lexeme/determiner/article/einer-feminine-singular-dative.js";
import { member as article_einer_feminine_singular_genitive } from "./members/lexeme/determiner/article/einer-feminine-singular-genitive.js";
import { member as article_eines_masculine_singular_genitive } from "./members/lexeme/determiner/article/eines-masculine-singular-genitive.js";
import { member as article_eines_neuter_singular_genitive } from "./members/lexeme/determiner/article/eines-neuter-singular-genitive.js";
import { member as m16 } from "./members/lexeme/determiner/demonstrative/derlei.js";
import { member as m17 } from "./members/lexeme/determiner/emphatic/selber.js";
import { member as m20 } from "./members/lexeme/determiner/exclamative/welch.js";
import { member as m30 } from "./members/lexeme/determiner/quantifying/lauter.js";
import { member as m31 } from "./members/lexeme/determiner/quantifying/manch.js";
import { member as m35 } from "./members/lexeme/determiner/quantifying/mehr.js";
import { member as m143 } from "./members/lexeme/pronoun/demonstrative/das-neuter-singular-accusative.js";
import { member as m142 } from "./members/lexeme/pronoun/demonstrative/das-neuter-singular-nominative.js";
import { member as m145 } from "./members/lexeme/pronoun/demonstrative/dem-masculine-singular-dative.js";
import { member as m146 } from "./members/lexeme/pronoun/demonstrative/dem-neuter-singular-dative.js";
import { member as m144 } from "./members/lexeme/pronoun/demonstrative/den-masculine-singular-accusative.js";
import { member as m151 } from "./members/lexeme/pronoun/demonstrative/denen-plural-dative.js";
import { member as m135 } from "./members/lexeme/pronoun/demonstrative/der-feminine-singular-dative.js";
import { member as m134 } from "./members/lexeme/pronoun/demonstrative/der-masculine-singular-nominative.js";
import { member as m149 } from "./members/lexeme/pronoun/demonstrative/deren-feminine-singular-genitive.js";
import { member as m150 } from "./members/lexeme/pronoun/demonstrative/deren-plural-genitive.js";
import { member as m147 } from "./members/lexeme/pronoun/demonstrative/dessen-masculine-singular-genitive.js";
import { member as m148 } from "./members/lexeme/pronoun/demonstrative/dessen-neuter-singular-genitive.js";
import { member as m139 } from "./members/lexeme/pronoun/demonstrative/die-feminine-singular-accusative.js";
import { member as m138 } from "./members/lexeme/pronoun/demonstrative/die-feminine-singular-nominative.js";
import { member as m141 } from "./members/lexeme/pronoun/demonstrative/die-plural-accusative.js";
import { member as m140 } from "./members/lexeme/pronoun/demonstrative/die-plural-nominative.js";
import { member as m120 } from "./members/lexeme/pronoun/indefinite/jemand-singular-nominative.js";
import { member as m122 } from "./members/lexeme/pronoun/indefinite/jemandem-singular-dative.js";
import { member as m121 } from "./members/lexeme/pronoun/indefinite/jemanden-singular-accusative.js";
import { member as m118 } from "./members/lexeme/pronoun/interrogative/wem-dative.js";
import { member as m117 } from "./members/lexeme/pronoun/interrogative/wen-accusative.js";
import { member as m116 } from "./members/lexeme/pronoun/interrogative/wer-nominative.js";
import { member as m119 } from "./members/lexeme/pronoun/interrogative/wessen-genitive.js";
import { member as m126 } from "./members/lexeme/pronoun/negative/nichts.js";
import { member as m123 } from "./members/lexeme/pronoun/negative/niemand-singular-nominative.js";
import { member as m125 } from "./members/lexeme/pronoun/negative/niemandem-singular-dative.js";
import { member as m124 } from "./members/lexeme/pronoun/negative/niemanden-singular-accusative.js";
import { member as m64 } from "./members/lexeme/pronoun/personal/deiner-second-person-informal-singular-genitive.js";
import { member as m62 } from "./members/lexeme/pronoun/personal/dich-second-person-informal-singular-accusative.js";
import { member as m63 } from "./members/lexeme/pronoun/personal/dir-second-person-informal-singular-dative.js";
import { member as m61 } from "./members/lexeme/pronoun/personal/du-second-person-informal-singular-nominative.js";
import { member as m65 } from "./members/lexeme/pronoun/personal/er-third-person-masculine-singular-nominative.js";
import { member as subjectEs } from "./members/lexeme/pronoun/personal/es-subject-expletive.js";
import { member as m75 } from "./members/lexeme/pronoun/personal/es-third-person-neuter-singular-accusative.js";
import { member as m74 } from "./members/lexeme/pronoun/personal/es-third-person-neuter-singular-nominative.js";
import { member as m84 } from "./members/lexeme/pronoun/personal/euch-second-person-informal-plural-accusative.js";
import { member as m85 } from "./members/lexeme/pronoun/personal/euch-second-person-informal-plural-dative.js";
import { member as m86 } from "./members/lexeme/pronoun/personal/euer-second-person-informal-plural-genitive.js";
import { member as m57 } from "./members/lexeme/pronoun/personal/ich-first-person-singular-nominative.js";
import { member as m67 } from "./members/lexeme/pronoun/personal/ihm-third-person-masculine-neuter-singular-dative.js";
import { member as m66 } from "./members/lexeme/pronoun/personal/ihn-third-person-masculine-singular-accusative.js";
import { member as m93 } from "./members/lexeme/pronoun/personal/ihnen-second-person-formal-plural-dative.js";
import { member as m89 } from "./members/lexeme/pronoun/personal/ihnen-third-person-plural-dative.js";
import { member as m82 } from "./members/lexeme/pronoun/personal/ihr-second-person-informal-plural-nominative.js";
import { member as m72 } from "./members/lexeme/pronoun/personal/ihr-third-person-feminine-singular-dative.js";
import { member as m94 } from "./members/lexeme/pronoun/personal/ihrer-second-person-formal-plural-genitive.js";
import { member as m73 } from "./members/lexeme/pronoun/personal/ihrer-third-person-feminine-singular-genitive.js";
import { member as m90 } from "./members/lexeme/pronoun/personal/ihrer-third-person-plural-genitive.js";
import { member as m60 } from "./members/lexeme/pronoun/personal/meiner-first-person-singular-genitive.js";
import { member as m58 } from "./members/lexeme/pronoun/personal/mich-first-person-singular-accusative.js";
import { member as m59 } from "./members/lexeme/pronoun/personal/mir-first-person-singular-dative.js";
import { member as m68 } from "./members/lexeme/pronoun/personal/seiner-third-person-masculine-neuter-singular-genitive.js";
import { member as m92 } from "./members/lexeme/pronoun/personal/sie-second-person-formal-plural-accusative.js";
import { member as m91 } from "./members/lexeme/pronoun/personal/sie-second-person-formal-plural-nominative.js";
import { member as m70 } from "./members/lexeme/pronoun/personal/sie-third-person-feminine-singular-accusative.js";
import { member as m69 } from "./members/lexeme/pronoun/personal/sie-third-person-feminine-singular-nominative.js";
import { member as m88 } from "./members/lexeme/pronoun/personal/sie-third-person-plural-accusative.js";
import { member as m87 } from "./members/lexeme/pronoun/personal/sie-third-person-plural-nominative.js";
import { member as m79 } from "./members/lexeme/pronoun/personal/uns-first-person-plural-accusative.js";
import { member as m80 } from "./members/lexeme/pronoun/personal/uns-first-person-plural-dative.js";
import { member as m81 } from "./members/lexeme/pronoun/personal/unser-first-person-plural-genitive.js";
import { member as m78 } from "./members/lexeme/pronoun/personal/wir-first-person-plural-nominative.js";
import { member as m99 } from "./members/lexeme/pronoun/reflexive/sich-third-person-accusative.js";
import { member as m100 } from "./members/lexeme/pronoun/reflexive/sich-third-person-dative.js";
import { member as m161 } from "./members/lexeme/pronoun/relative/das-neuter-singular-accusative.js";
import { member as m160 } from "./members/lexeme/pronoun/relative/das-neuter-singular-nominative.js";
import { member as m163 } from "./members/lexeme/pronoun/relative/dem-masculine-singular-dative.js";
import { member as m164 } from "./members/lexeme/pronoun/relative/dem-neuter-singular-dative.js";
import { member as m162 } from "./members/lexeme/pronoun/relative/den-masculine-singular-accusative.js";
import { member as m169 } from "./members/lexeme/pronoun/relative/denen-plural-dative.js";
import { member as m153 } from "./members/lexeme/pronoun/relative/der-feminine-singular-dative.js";
import { member as m152 } from "./members/lexeme/pronoun/relative/der-masculine-singular-nominative.js";
import { member as m167 } from "./members/lexeme/pronoun/relative/deren-feminine-singular-genitive.js";
import { member as m168 } from "./members/lexeme/pronoun/relative/deren-plural-genitive.js";
import { member as m165 } from "./members/lexeme/pronoun/relative/dessen-masculine-singular-genitive.js";
import { member as m166 } from "./members/lexeme/pronoun/relative/dessen-neuter-singular-genitive.js";
import { member as m157 } from "./members/lexeme/pronoun/relative/die-feminine-singular-accusative.js";
import { member as m156 } from "./members/lexeme/pronoun/relative/die-feminine-singular-nominative.js";
import { member as m159 } from "./members/lexeme/pronoun/relative/die-plural-accusative.js";
import { member as m158 } from "./members/lexeme/pronoun/relative/die-plural-nominative.js";
import { pronominalAdverbs } from "./pronominal-adverbs.js";
import { reviewedPronouns } from "./pronoun-paradigms.js";
export const authoredMembers = [
	article_das_neuter_singular_accusative,
	article_das_neuter_singular_nominative,
	article_dem_masculine_singular_dative,
	article_dem_neuter_singular_dative,
	article_den_masculine_singular_accusative,
	article_den_plural_dative,
	article_der_feminine_singular_dative,
	article_der_feminine_singular_genitive,
	article_der_masculine_singular_nominative,
	article_der_plural_genitive,
	article_des_masculine_singular_genitive,
	article_des_neuter_singular_genitive,
	article_die_feminine_singular_accusative,
	article_die_feminine_singular_nominative,
	article_die_plural_accusative,
	article_die_plural_nominative,
	article_ein_masculine_singular_nominative,
	article_ein_neuter_singular_accusative,
	article_ein_neuter_singular_nominative,
	article_eine_feminine_singular_accusative,
	article_eine_feminine_singular_nominative,
	article_einem_masculine_singular_dative,
	article_einem_neuter_singular_dative,
	article_einen_masculine_singular_accusative,
	article_einer_feminine_singular_dative,
	article_einer_feminine_singular_genitive,
	article_eines_masculine_singular_genitive,
	article_eines_neuter_singular_genitive,
	m16,
	m17,
	m20,
	m30,
	m31,
	m35,
	aux0,
	aux1,
	aux2,
	aux3,
	aux4,
	aux5,
	aux6,
	aux7,
	aux8,
	aux9,
	m57,
	m58,
	m59,
	m60,
	m61,
	m62,
	m63,
	m64,
	m65,
	m66,
	m67,
	m68,
	m69,
	m70,
	m72,
	m73,
	m74,
	m75,
	m78,
	m79,
	m80,
	m81,
	m82,
	m84,
	m85,
	m86,
	m87,
	m88,
	m89,
	m90,
	m91,
	m92,
	m93,
	m94,
	m99,
	m100,
	m116,
	m117,
	m118,
	m119,
	m120,
	m121,
	m122,
	m123,
	m124,
	m125,
	m126,
	m134,
	m135,
	m138,
	m139,
	m140,
	m141,
	m142,
	m143,
	m144,
	m145,
	m146,
	m147,
	m148,
	m149,
	m150,
	m151,
	m152,
	m153,
	m156,
	m157,
	m158,
	m159,
	m160,
	m161,
	m162,
	m163,
	m164,
	m165,
	m166,
	m167,
	m168,
	m169,
	subjectEs,
	...reviewedDeterminers.map(({ member }) => member),
	...reviewedPronouns.map(({ member }) => member),
	...pronominalAdverbs,
];
