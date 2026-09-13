// Generated from canonical Dumrel Zod schemas. Run bun run generate.
type _Output2 = boolean;
type _Output1 = _Output2 | undefined;
type _Output4 = { en?: _Output1; ru?: _Output1 };
type _Output3 = _Output4 | undefined;
type _Output6 = {
	synonym?: _Output1;
	nearSynonym?: _Output1;
	antonym?: _Output1;
	nearAntonym?: _Output1;
	hypernym?: _Output1;
	hyponym?: _Output1;
	meronym?: _Output1;
	holonym?: _Output1;
};
type _Output5 = _Output6 | undefined;
type _Output0 = {
	transcription?: _Output1;
	definition?: _Output1;
	morphologicalTree?: _Output1;
	lexicalBreakdown?: _Output1;
	translations?: _Output3;
	semanticRelations?: _Output5;
};
type _Output9 = null;
type _Output8 = _Output9 | undefined;
type _Output11 = { en?: _Output8; ru?: _Output8 };
type _Output10 = _Output11 | undefined;
type _Output13 = {
	synonym?: _Output8;
	nearSynonym?: _Output8;
	antonym?: _Output8;
	nearAntonym?: _Output8;
	hypernym?: _Output8;
	hyponym?: _Output8;
	meronym?: _Output8;
	holonym?: _Output8;
};
type _Output12 = _Output13 | undefined;
type _Output7 = {
	transcription?: _Output8;
	definition?: _Output8;
	morphologicalTree?: _Output8;
	lexicalBreakdown?: _Output8;
	translations?: _Output10;
	semanticRelations?: _Output12;
};
type _Output17 = "de";
type _Output18 = "Construction";
type _Output19 = "Fusion";
type _Output16 = { language: _Output17; family: _Output18; kind: _Output19 };
type _Output21 = "de";
type _Output22 = "Lexeme";
type _Output23 = "ADJ";
type _Output20 = { language: _Output21; family: _Output22; kind: _Output23 };
type _Output25 = "de";
type _Output26 = "Lexeme";
type _Output27 = "ADP";
type _Output24 = { language: _Output25; family: _Output26; kind: _Output27 };
type _Output29 = "de";
type _Output30 = "Lexeme";
type _Output31 = "ADV";
type _Output28 = { language: _Output29; family: _Output30; kind: _Output31 };
type _Output33 = "de";
type _Output34 = "Lexeme";
type _Output35 = "AUX";
type _Output32 = { language: _Output33; family: _Output34; kind: _Output35 };
type _Output37 = "de";
type _Output38 = "Lexeme";
type _Output39 = "CCONJ";
type _Output36 = { language: _Output37; family: _Output38; kind: _Output39 };
type _Output41 = "de";
type _Output42 = "Lexeme";
type _Output43 = "DET";
type _Output40 = { language: _Output41; family: _Output42; kind: _Output43 };
type _Output45 = "de";
type _Output46 = "Lexeme";
type _Output47 = "INTJ";
type _Output44 = { language: _Output45; family: _Output46; kind: _Output47 };
type _Output49 = "de";
type _Output50 = "Lexeme";
type _Output51 = "NOUN";
type _Output48 = { language: _Output49; family: _Output50; kind: _Output51 };
type _Output53 = "de";
type _Output54 = "Lexeme";
type _Output55 = "NUM";
type _Output52 = { language: _Output53; family: _Output54; kind: _Output55 };
type _Output57 = "de";
type _Output58 = "Lexeme";
type _Output59 = "X";
type _Output56 = { language: _Output57; family: _Output58; kind: _Output59 };
type _Output61 = "de";
type _Output62 = "Lexeme";
type _Output63 = "PART";
type _Output60 = { language: _Output61; family: _Output62; kind: _Output63 };
type _Output65 = "de";
type _Output66 = "Lexeme";
type _Output67 = "PRON";
type _Output64 = { language: _Output65; family: _Output66; kind: _Output67 };
type _Output69 = "de";
type _Output70 = "Lexeme";
type _Output71 = "PROPN";
type _Output68 = { language: _Output69; family: _Output70; kind: _Output71 };
type _Output73 = "de";
type _Output74 = "Lexeme";
type _Output75 = "PUNCT";
type _Output72 = { language: _Output73; family: _Output74; kind: _Output75 };
type _Output77 = "de";
type _Output78 = "Lexeme";
type _Output79 = "SCONJ";
type _Output76 = { language: _Output77; family: _Output78; kind: _Output79 };
type _Output81 = "de";
type _Output82 = "Lexeme";
type _Output83 = "SYM";
type _Output80 = { language: _Output81; family: _Output82; kind: _Output83 };
type _Output85 = "de";
type _Output86 = "Lexeme";
type _Output87 = "VERB";
type _Output84 = { language: _Output85; family: _Output86; kind: _Output87 };
type _Output89 = "de";
type _Output90 = "Morpheme";
type _Output91 = "Circumfix";
type _Output88 = { language: _Output89; family: _Output90; kind: _Output91 };
type _Output93 = "de";
type _Output94 = "Morpheme";
type _Output95 = "Clitic";
type _Output92 = { language: _Output93; family: _Output94; kind: _Output95 };
type _Output97 = "de";
type _Output98 = "Morpheme";
type _Output99 = "Duplifix";
type _Output96 = { language: _Output97; family: _Output98; kind: _Output99 };
type _Output101 = "de";
type _Output102 = "Morpheme";
type _Output103 = "Infix";
type _Output100 = {
	language: _Output101;
	family: _Output102;
	kind: _Output103;
};
type _Output105 = "de";
type _Output106 = "Morpheme";
type _Output107 = "Interfix";
type _Output104 = {
	language: _Output105;
	family: _Output106;
	kind: _Output107;
};
type _Output109 = "de";
type _Output110 = "Morpheme";
type _Output111 = "Prefix";
type _Output108 = {
	language: _Output109;
	family: _Output110;
	kind: _Output111;
};
type _Output113 = "de";
type _Output114 = "Morpheme";
type _Output115 = "Root";
type _Output112 = {
	language: _Output113;
	family: _Output114;
	kind: _Output115;
};
type _Output117 = "de";
type _Output118 = "Morpheme";
type _Output119 = "Suffix";
type _Output116 = {
	language: _Output117;
	family: _Output118;
	kind: _Output119;
};
type _Output121 = "de";
type _Output122 = "Morpheme";
type _Output123 = "Suffixoid";
type _Output120 = {
	language: _Output121;
	family: _Output122;
	kind: _Output123;
};
type _Output125 = "de";
type _Output126 = "Morpheme";
type _Output127 = "Transfix";
type _Output124 = {
	language: _Output125;
	family: _Output126;
	kind: _Output127;
};
type _Output129 = "de";
type _Output130 = "Phraseme";
type _Output131 = "Aphorism";
type _Output128 = {
	language: _Output129;
	family: _Output130;
	kind: _Output131;
};
type _Output133 = "de";
type _Output134 = "Phraseme";
type _Output135 = "Collocation";
type _Output132 = {
	language: _Output133;
	family: _Output134;
	kind: _Output135;
};
type _Output137 = "de";
type _Output138 = "Phraseme";
type _Output139 = "DiscourseFormula";
type _Output136 = {
	language: _Output137;
	family: _Output138;
	kind: _Output139;
};
type _Output141 = "de";
type _Output142 = "Phraseme";
type _Output143 = "Idiom";
type _Output140 = {
	language: _Output141;
	family: _Output142;
	kind: _Output143;
};
type _Output145 = "de";
type _Output146 = "Phraseme";
type _Output147 = "Proverb";
type _Output144 = {
	language: _Output145;
	family: _Output146;
	kind: _Output147;
};
type _Output149 = "en";
type _Output150 = "Construction";
type _Output151 = "Fusion";
type _Output148 = {
	language: _Output149;
	family: _Output150;
	kind: _Output151;
};
type _Output153 = "en";
type _Output154 = "Lexeme";
type _Output155 = "ADJ";
type _Output152 = {
	language: _Output153;
	family: _Output154;
	kind: _Output155;
};
type _Output157 = "en";
type _Output158 = "Lexeme";
type _Output159 = "ADP";
type _Output156 = {
	language: _Output157;
	family: _Output158;
	kind: _Output159;
};
type _Output161 = "en";
type _Output162 = "Lexeme";
type _Output163 = "ADV";
type _Output160 = {
	language: _Output161;
	family: _Output162;
	kind: _Output163;
};
type _Output165 = "en";
type _Output166 = "Lexeme";
type _Output167 = "AUX";
type _Output164 = {
	language: _Output165;
	family: _Output166;
	kind: _Output167;
};
type _Output169 = "en";
type _Output170 = "Lexeme";
type _Output171 = "CCONJ";
type _Output168 = {
	language: _Output169;
	family: _Output170;
	kind: _Output171;
};
type _Output173 = "en";
type _Output174 = "Lexeme";
type _Output175 = "DET";
type _Output172 = {
	language: _Output173;
	family: _Output174;
	kind: _Output175;
};
type _Output177 = "en";
type _Output178 = "Lexeme";
type _Output179 = "INTJ";
type _Output176 = {
	language: _Output177;
	family: _Output178;
	kind: _Output179;
};
type _Output181 = "en";
type _Output182 = "Lexeme";
type _Output183 = "NOUN";
type _Output180 = {
	language: _Output181;
	family: _Output182;
	kind: _Output183;
};
type _Output185 = "en";
type _Output186 = "Lexeme";
type _Output187 = "NUM";
type _Output184 = {
	language: _Output185;
	family: _Output186;
	kind: _Output187;
};
type _Output189 = "en";
type _Output190 = "Lexeme";
type _Output191 = "X";
type _Output188 = {
	language: _Output189;
	family: _Output190;
	kind: _Output191;
};
type _Output193 = "en";
type _Output194 = "Lexeme";
type _Output195 = "PART";
type _Output192 = {
	language: _Output193;
	family: _Output194;
	kind: _Output195;
};
type _Output197 = "en";
type _Output198 = "Lexeme";
type _Output199 = "PRON";
type _Output196 = {
	language: _Output197;
	family: _Output198;
	kind: _Output199;
};
type _Output201 = "en";
type _Output202 = "Lexeme";
type _Output203 = "PROPN";
type _Output200 = {
	language: _Output201;
	family: _Output202;
	kind: _Output203;
};
type _Output205 = "en";
type _Output206 = "Lexeme";
type _Output207 = "PUNCT";
type _Output204 = {
	language: _Output205;
	family: _Output206;
	kind: _Output207;
};
type _Output209 = "en";
type _Output210 = "Lexeme";
type _Output211 = "SCONJ";
type _Output208 = {
	language: _Output209;
	family: _Output210;
	kind: _Output211;
};
type _Output213 = "en";
type _Output214 = "Lexeme";
type _Output215 = "SYM";
type _Output212 = {
	language: _Output213;
	family: _Output214;
	kind: _Output215;
};
type _Output217 = "en";
type _Output218 = "Lexeme";
type _Output219 = "VERB";
type _Output216 = {
	language: _Output217;
	family: _Output218;
	kind: _Output219;
};
type _Output221 = "en";
type _Output222 = "Morpheme";
type _Output223 = "Circumfix";
type _Output220 = {
	language: _Output221;
	family: _Output222;
	kind: _Output223;
};
type _Output225 = "en";
type _Output226 = "Morpheme";
type _Output227 = "Clitic";
type _Output224 = {
	language: _Output225;
	family: _Output226;
	kind: _Output227;
};
type _Output229 = "en";
type _Output230 = "Morpheme";
type _Output231 = "Duplifix";
type _Output228 = {
	language: _Output229;
	family: _Output230;
	kind: _Output231;
};
type _Output233 = "en";
type _Output234 = "Morpheme";
type _Output235 = "Infix";
type _Output232 = {
	language: _Output233;
	family: _Output234;
	kind: _Output235;
};
type _Output237 = "en";
type _Output238 = "Morpheme";
type _Output239 = "Interfix";
type _Output236 = {
	language: _Output237;
	family: _Output238;
	kind: _Output239;
};
type _Output241 = "en";
type _Output242 = "Morpheme";
type _Output243 = "Prefix";
type _Output240 = {
	language: _Output241;
	family: _Output242;
	kind: _Output243;
};
type _Output245 = "en";
type _Output246 = "Morpheme";
type _Output247 = "Root";
type _Output244 = {
	language: _Output245;
	family: _Output246;
	kind: _Output247;
};
type _Output249 = "en";
type _Output250 = "Morpheme";
type _Output251 = "Suffix";
type _Output248 = {
	language: _Output249;
	family: _Output250;
	kind: _Output251;
};
type _Output253 = "en";
type _Output254 = "Morpheme";
type _Output255 = "Suffixoid";
type _Output252 = {
	language: _Output253;
	family: _Output254;
	kind: _Output255;
};
type _Output257 = "en";
type _Output258 = "Morpheme";
type _Output259 = "ToneMarking";
type _Output256 = {
	language: _Output257;
	family: _Output258;
	kind: _Output259;
};
type _Output261 = "en";
type _Output262 = "Morpheme";
type _Output263 = "Transfix";
type _Output260 = {
	language: _Output261;
	family: _Output262;
	kind: _Output263;
};
type _Output265 = "en";
type _Output266 = "Phraseme";
type _Output267 = "Aphorism";
type _Output264 = {
	language: _Output265;
	family: _Output266;
	kind: _Output267;
};
type _Output269 = "en";
type _Output270 = "Phraseme";
type _Output271 = "DiscourseFormula";
type _Output268 = {
	language: _Output269;
	family: _Output270;
	kind: _Output271;
};
type _Output273 = "en";
type _Output274 = "Phraseme";
type _Output275 = "Idiom";
type _Output272 = {
	language: _Output273;
	family: _Output274;
	kind: _Output275;
};
type _Output277 = "en";
type _Output278 = "Phraseme";
type _Output279 = "Proverb";
type _Output276 = {
	language: _Output277;
	family: _Output278;
	kind: _Output279;
};
type _Output281 = "he";
type _Output282 = "Construction";
type _Output283 = "Fusion";
type _Output280 = {
	language: _Output281;
	family: _Output282;
	kind: _Output283;
};
type _Output285 = "he";
type _Output286 = "Lexeme";
type _Output287 = "ADJ";
type _Output284 = {
	language: _Output285;
	family: _Output286;
	kind: _Output287;
};
type _Output289 = "he";
type _Output290 = "Lexeme";
type _Output291 = "ADP";
type _Output288 = {
	language: _Output289;
	family: _Output290;
	kind: _Output291;
};
type _Output293 = "he";
type _Output294 = "Lexeme";
type _Output295 = "ADV";
type _Output292 = {
	language: _Output293;
	family: _Output294;
	kind: _Output295;
};
type _Output297 = "he";
type _Output298 = "Lexeme";
type _Output299 = "AUX";
type _Output296 = {
	language: _Output297;
	family: _Output298;
	kind: _Output299;
};
type _Output301 = "he";
type _Output302 = "Lexeme";
type _Output303 = "CCONJ";
type _Output300 = {
	language: _Output301;
	family: _Output302;
	kind: _Output303;
};
type _Output305 = "he";
type _Output306 = "Lexeme";
type _Output307 = "DET";
type _Output304 = {
	language: _Output305;
	family: _Output306;
	kind: _Output307;
};
type _Output309 = "he";
type _Output310 = "Lexeme";
type _Output311 = "INTJ";
type _Output308 = {
	language: _Output309;
	family: _Output310;
	kind: _Output311;
};
type _Output313 = "he";
type _Output314 = "Lexeme";
type _Output315 = "NOUN";
type _Output312 = {
	language: _Output313;
	family: _Output314;
	kind: _Output315;
};
type _Output317 = "he";
type _Output318 = "Lexeme";
type _Output319 = "NUM";
type _Output316 = {
	language: _Output317;
	family: _Output318;
	kind: _Output319;
};
type _Output321 = "he";
type _Output322 = "Lexeme";
type _Output323 = "X";
type _Output320 = {
	language: _Output321;
	family: _Output322;
	kind: _Output323;
};
type _Output325 = "he";
type _Output326 = "Lexeme";
type _Output327 = "PART";
type _Output324 = {
	language: _Output325;
	family: _Output326;
	kind: _Output327;
};
type _Output329 = "he";
type _Output330 = "Lexeme";
type _Output331 = "PRON";
type _Output328 = {
	language: _Output329;
	family: _Output330;
	kind: _Output331;
};
type _Output333 = "he";
type _Output334 = "Lexeme";
type _Output335 = "PROPN";
type _Output332 = {
	language: _Output333;
	family: _Output334;
	kind: _Output335;
};
type _Output337 = "he";
type _Output338 = "Lexeme";
type _Output339 = "PUNCT";
type _Output336 = {
	language: _Output337;
	family: _Output338;
	kind: _Output339;
};
type _Output341 = "he";
type _Output342 = "Lexeme";
type _Output343 = "SCONJ";
type _Output340 = {
	language: _Output341;
	family: _Output342;
	kind: _Output343;
};
type _Output345 = "he";
type _Output346 = "Lexeme";
type _Output347 = "SYM";
type _Output344 = {
	language: _Output345;
	family: _Output346;
	kind: _Output347;
};
type _Output349 = "he";
type _Output350 = "Lexeme";
type _Output351 = "VERB";
type _Output348 = {
	language: _Output349;
	family: _Output350;
	kind: _Output351;
};
type _Output353 = "he";
type _Output354 = "Morpheme";
type _Output355 = "Circumfix";
type _Output352 = {
	language: _Output353;
	family: _Output354;
	kind: _Output355;
};
type _Output357 = "he";
type _Output358 = "Morpheme";
type _Output359 = "Clitic";
type _Output356 = {
	language: _Output357;
	family: _Output358;
	kind: _Output359;
};
type _Output361 = "he";
type _Output362 = "Morpheme";
type _Output363 = "Duplifix";
type _Output360 = {
	language: _Output361;
	family: _Output362;
	kind: _Output363;
};
type _Output365 = "he";
type _Output366 = "Morpheme";
type _Output367 = "Infix";
type _Output364 = {
	language: _Output365;
	family: _Output366;
	kind: _Output367;
};
type _Output369 = "he";
type _Output370 = "Morpheme";
type _Output371 = "Interfix";
type _Output368 = {
	language: _Output369;
	family: _Output370;
	kind: _Output371;
};
type _Output373 = "he";
type _Output374 = "Morpheme";
type _Output375 = "Prefix";
type _Output372 = {
	language: _Output373;
	family: _Output374;
	kind: _Output375;
};
type _Output377 = "he";
type _Output378 = "Morpheme";
type _Output379 = "Root";
type _Output376 = {
	language: _Output377;
	family: _Output378;
	kind: _Output379;
};
type _Output381 = "he";
type _Output382 = "Morpheme";
type _Output383 = "Suffix";
type _Output380 = {
	language: _Output381;
	family: _Output382;
	kind: _Output383;
};
type _Output385 = "he";
type _Output386 = "Morpheme";
type _Output387 = "Suffixoid";
type _Output384 = {
	language: _Output385;
	family: _Output386;
	kind: _Output387;
};
type _Output389 = "he";
type _Output390 = "Morpheme";
type _Output391 = "ToneMarking";
type _Output388 = {
	language: _Output389;
	family: _Output390;
	kind: _Output391;
};
type _Output393 = "he";
type _Output394 = "Morpheme";
type _Output395 = "Transfix";
type _Output392 = {
	language: _Output393;
	family: _Output394;
	kind: _Output395;
};
type _Output397 = "he";
type _Output398 = "Phraseme";
type _Output399 = "Aphorism";
type _Output396 = {
	language: _Output397;
	family: _Output398;
	kind: _Output399;
};
type _Output401 = "he";
type _Output402 = "Phraseme";
type _Output403 = "DiscourseFormula";
type _Output400 = {
	language: _Output401;
	family: _Output402;
	kind: _Output403;
};
type _Output405 = "he";
type _Output406 = "Phraseme";
type _Output407 = "Idiom";
type _Output404 = {
	language: _Output405;
	family: _Output406;
	kind: _Output407;
};
type _Output409 = "he";
type _Output410 = "Phraseme";
type _Output411 = "Proverb";
type _Output408 = {
	language: _Output409;
	family: _Output410;
	kind: _Output411;
};
type _Output15 =
	| _Output16
	| _Output20
	| _Output24
	| _Output28
	| _Output32
	| _Output36
	| _Output40
	| _Output44
	| _Output48
	| _Output52
	| _Output56
	| _Output60
	| _Output64
	| _Output68
	| _Output72
	| _Output76
	| _Output80
	| _Output84
	| _Output88
	| _Output92
	| _Output96
	| _Output100
	| _Output104
	| _Output108
	| _Output112
	| _Output116
	| _Output120
	| _Output124
	| _Output128
	| _Output132
	| _Output136
	| _Output140
	| _Output144
	| _Output148
	| _Output152
	| _Output156
	| _Output160
	| _Output164
	| _Output168
	| _Output172
	| _Output176
	| _Output180
	| _Output184
	| _Output188
	| _Output192
	| _Output196
	| _Output200
	| _Output204
	| _Output208
	| _Output212
	| _Output216
	| _Output220
	| _Output224
	| _Output228
	| _Output232
	| _Output236
	| _Output240
	| _Output244
	| _Output248
	| _Output252
	| _Output256
	| _Output260
	| _Output264
	| _Output268
	| _Output272
	| _Output276
	| _Output280
	| _Output284
	| _Output288
	| _Output292
	| _Output296
	| _Output300
	| _Output304
	| _Output308
	| _Output312
	| _Output316
	| _Output320
	| _Output324
	| _Output328
	| _Output332
	| _Output336
	| _Output340
	| _Output344
	| _Output348
	| _Output352
	| _Output356
	| _Output360
	| _Output364
	| _Output368
	| _Output372
	| _Output376
	| _Output380
	| _Output384
	| _Output388
	| _Output392
	| _Output396
	| _Output400
	| _Output404
	| _Output408;
type _Output412 = _Output0 | undefined;
type _Output14 = { route: _Output15; settings?: _Output412 };
type _Output413 =
	| "synonym"
	| "nearSynonym"
	| "antonym"
	| "nearAntonym"
	| "hypernym"
	| "holonym";
type _Output414 = "en" | "ru";
type _Output417 = string;
type _Output416 = {
	language: _Output17;
	canonicalForm: _Output417;
	family: _Output18;
	kind: _Output19;
};
type _Output418 = {
	language: _Output21;
	canonicalForm: _Output417;
	family: _Output22;
	kind: _Output23;
};
type _Output419 = {
	language: _Output25;
	canonicalForm: _Output417;
	family: _Output26;
	kind: _Output27;
};
type _Output420 = {
	language: _Output29;
	canonicalForm: _Output417;
	family: _Output30;
	kind: _Output31;
};
type _Output421 = {
	language: _Output33;
	canonicalForm: _Output417;
	family: _Output34;
	kind: _Output35;
};
type _Output422 = {
	language: _Output37;
	canonicalForm: _Output417;
	family: _Output38;
	kind: _Output39;
};
type _Output423 = {
	language: _Output41;
	canonicalForm: _Output417;
	family: _Output42;
	kind: _Output43;
};
type _Output424 = {
	language: _Output45;
	canonicalForm: _Output417;
	family: _Output46;
	kind: _Output47;
};
type _Output425 = {
	language: _Output49;
	canonicalForm: _Output417;
	family: _Output50;
	kind: _Output51;
};
type _Output426 = {
	language: _Output53;
	canonicalForm: _Output417;
	family: _Output54;
	kind: _Output55;
};
type _Output427 = {
	language: _Output57;
	canonicalForm: _Output417;
	family: _Output58;
	kind: _Output59;
};
type _Output428 = {
	language: _Output61;
	canonicalForm: _Output417;
	family: _Output62;
	kind: _Output63;
};
type _Output429 = {
	language: _Output65;
	canonicalForm: _Output417;
	family: _Output66;
	kind: _Output67;
};
type _Output430 = {
	language: _Output69;
	canonicalForm: _Output417;
	family: _Output70;
	kind: _Output71;
};
type _Output431 = {
	language: _Output73;
	canonicalForm: _Output417;
	family: _Output74;
	kind: _Output75;
};
type _Output432 = {
	language: _Output77;
	canonicalForm: _Output417;
	family: _Output78;
	kind: _Output79;
};
type _Output433 = {
	language: _Output81;
	canonicalForm: _Output417;
	family: _Output82;
	kind: _Output83;
};
type _Output434 = {
	language: _Output85;
	canonicalForm: _Output417;
	family: _Output86;
	kind: _Output87;
};
type _Output435 = {
	language: _Output89;
	canonicalForm: _Output417;
	family: _Output90;
	kind: _Output91;
};
type _Output436 = {
	language: _Output93;
	canonicalForm: _Output417;
	family: _Output94;
	kind: _Output95;
};
type _Output437 = {
	language: _Output97;
	canonicalForm: _Output417;
	family: _Output98;
	kind: _Output99;
};
type _Output438 = {
	language: _Output101;
	canonicalForm: _Output417;
	family: _Output102;
	kind: _Output103;
};
type _Output439 = {
	language: _Output105;
	canonicalForm: _Output417;
	family: _Output106;
	kind: _Output107;
};
type _Output440 = {
	language: _Output109;
	canonicalForm: _Output417;
	family: _Output110;
	kind: _Output111;
};
type _Output441 = {
	language: _Output113;
	canonicalForm: _Output417;
	family: _Output114;
	kind: _Output115;
};
type _Output442 = {
	language: _Output117;
	canonicalForm: _Output417;
	family: _Output118;
	kind: _Output119;
};
type _Output443 = {
	language: _Output121;
	canonicalForm: _Output417;
	family: _Output122;
	kind: _Output123;
};
type _Output444 = {
	language: _Output125;
	canonicalForm: _Output417;
	family: _Output126;
	kind: _Output127;
};
type _Output445 = {
	language: _Output129;
	canonicalForm: _Output417;
	family: _Output130;
	kind: _Output131;
};
type _Output446 = {
	language: _Output133;
	canonicalForm: _Output417;
	family: _Output134;
	kind: _Output135;
};
type _Output447 = {
	language: _Output137;
	canonicalForm: _Output417;
	family: _Output138;
	kind: _Output139;
};
type _Output448 = {
	language: _Output141;
	canonicalForm: _Output417;
	family: _Output142;
	kind: _Output143;
};
type _Output449 = {
	language: _Output145;
	canonicalForm: _Output417;
	family: _Output146;
	kind: _Output147;
};
type _Output450 = {
	language: _Output149;
	canonicalForm: _Output417;
	family: _Output150;
	kind: _Output151;
};
type _Output451 = {
	language: _Output153;
	canonicalForm: _Output417;
	family: _Output154;
	kind: _Output155;
};
type _Output452 = {
	language: _Output157;
	canonicalForm: _Output417;
	family: _Output158;
	kind: _Output159;
};
type _Output453 = {
	language: _Output161;
	canonicalForm: _Output417;
	family: _Output162;
	kind: _Output163;
};
type _Output454 = {
	language: _Output165;
	canonicalForm: _Output417;
	family: _Output166;
	kind: _Output167;
};
type _Output455 = {
	language: _Output169;
	canonicalForm: _Output417;
	family: _Output170;
	kind: _Output171;
};
type _Output456 = {
	language: _Output173;
	canonicalForm: _Output417;
	family: _Output174;
	kind: _Output175;
};
type _Output457 = {
	language: _Output177;
	canonicalForm: _Output417;
	family: _Output178;
	kind: _Output179;
};
type _Output458 = {
	language: _Output181;
	canonicalForm: _Output417;
	family: _Output182;
	kind: _Output183;
};
type _Output459 = {
	language: _Output185;
	canonicalForm: _Output417;
	family: _Output186;
	kind: _Output187;
};
type _Output460 = {
	language: _Output189;
	canonicalForm: _Output417;
	family: _Output190;
	kind: _Output191;
};
type _Output461 = {
	language: _Output193;
	canonicalForm: _Output417;
	family: _Output194;
	kind: _Output195;
};
type _Output462 = {
	language: _Output197;
	canonicalForm: _Output417;
	family: _Output198;
	kind: _Output199;
};
type _Output463 = {
	language: _Output201;
	canonicalForm: _Output417;
	family: _Output202;
	kind: _Output203;
};
type _Output464 = {
	language: _Output205;
	canonicalForm: _Output417;
	family: _Output206;
	kind: _Output207;
};
type _Output465 = {
	language: _Output209;
	canonicalForm: _Output417;
	family: _Output210;
	kind: _Output211;
};
type _Output466 = {
	language: _Output213;
	canonicalForm: _Output417;
	family: _Output214;
	kind: _Output215;
};
type _Output467 = {
	language: _Output217;
	canonicalForm: _Output417;
	family: _Output218;
	kind: _Output219;
};
type _Output468 = {
	language: _Output221;
	canonicalForm: _Output417;
	family: _Output222;
	kind: _Output223;
};
type _Output469 = {
	language: _Output225;
	canonicalForm: _Output417;
	family: _Output226;
	kind: _Output227;
};
type _Output470 = {
	language: _Output229;
	canonicalForm: _Output417;
	family: _Output230;
	kind: _Output231;
};
type _Output471 = {
	language: _Output233;
	canonicalForm: _Output417;
	family: _Output234;
	kind: _Output235;
};
type _Output472 = {
	language: _Output237;
	canonicalForm: _Output417;
	family: _Output238;
	kind: _Output239;
};
type _Output473 = {
	language: _Output241;
	canonicalForm: _Output417;
	family: _Output242;
	kind: _Output243;
};
type _Output474 = {
	language: _Output245;
	canonicalForm: _Output417;
	family: _Output246;
	kind: _Output247;
};
type _Output475 = {
	language: _Output249;
	canonicalForm: _Output417;
	family: _Output250;
	kind: _Output251;
};
type _Output476 = {
	language: _Output253;
	canonicalForm: _Output417;
	family: _Output254;
	kind: _Output255;
};
type _Output477 = {
	language: _Output257;
	canonicalForm: _Output417;
	family: _Output258;
	kind: _Output259;
};
type _Output478 = {
	language: _Output261;
	canonicalForm: _Output417;
	family: _Output262;
	kind: _Output263;
};
type _Output479 = {
	language: _Output265;
	canonicalForm: _Output417;
	family: _Output266;
	kind: _Output267;
};
type _Output480 = {
	language: _Output269;
	canonicalForm: _Output417;
	family: _Output270;
	kind: _Output271;
};
type _Output481 = {
	language: _Output273;
	canonicalForm: _Output417;
	family: _Output274;
	kind: _Output275;
};
type _Output482 = {
	language: _Output277;
	canonicalForm: _Output417;
	family: _Output278;
	kind: _Output279;
};
type _Output483 = {
	language: _Output281;
	canonicalForm: _Output417;
	family: _Output282;
	kind: _Output283;
};
type _Output484 = {
	language: _Output285;
	canonicalForm: _Output417;
	family: _Output286;
	kind: _Output287;
};
type _Output485 = {
	language: _Output289;
	canonicalForm: _Output417;
	family: _Output290;
	kind: _Output291;
};
type _Output486 = {
	language: _Output293;
	canonicalForm: _Output417;
	family: _Output294;
	kind: _Output295;
};
type _Output487 = {
	language: _Output297;
	canonicalForm: _Output417;
	family: _Output298;
	kind: _Output299;
};
type _Output488 = {
	language: _Output301;
	canonicalForm: _Output417;
	family: _Output302;
	kind: _Output303;
};
type _Output489 = {
	language: _Output305;
	canonicalForm: _Output417;
	family: _Output306;
	kind: _Output307;
};
type _Output490 = {
	language: _Output309;
	canonicalForm: _Output417;
	family: _Output310;
	kind: _Output311;
};
type _Output491 = {
	language: _Output313;
	canonicalForm: _Output417;
	family: _Output314;
	kind: _Output315;
};
type _Output492 = {
	language: _Output317;
	canonicalForm: _Output417;
	family: _Output318;
	kind: _Output319;
};
type _Output493 = {
	language: _Output321;
	canonicalForm: _Output417;
	family: _Output322;
	kind: _Output323;
};
type _Output494 = {
	language: _Output325;
	canonicalForm: _Output417;
	family: _Output326;
	kind: _Output327;
};
type _Output495 = {
	language: _Output329;
	canonicalForm: _Output417;
	family: _Output330;
	kind: _Output331;
};
type _Output496 = {
	language: _Output333;
	canonicalForm: _Output417;
	family: _Output334;
	kind: _Output335;
};
type _Output497 = {
	language: _Output337;
	canonicalForm: _Output417;
	family: _Output338;
	kind: _Output339;
};
type _Output498 = {
	language: _Output341;
	canonicalForm: _Output417;
	family: _Output342;
	kind: _Output343;
};
type _Output499 = {
	language: _Output345;
	canonicalForm: _Output417;
	family: _Output346;
	kind: _Output347;
};
type _Output500 = {
	language: _Output349;
	canonicalForm: _Output417;
	family: _Output350;
	kind: _Output351;
};
type _Output501 = {
	language: _Output353;
	canonicalForm: _Output417;
	family: _Output354;
	kind: _Output355;
};
type _Output502 = {
	language: _Output357;
	canonicalForm: _Output417;
	family: _Output358;
	kind: _Output359;
};
type _Output503 = {
	language: _Output361;
	canonicalForm: _Output417;
	family: _Output362;
	kind: _Output363;
};
type _Output504 = {
	language: _Output365;
	canonicalForm: _Output417;
	family: _Output366;
	kind: _Output367;
};
type _Output505 = {
	language: _Output369;
	canonicalForm: _Output417;
	family: _Output370;
	kind: _Output371;
};
type _Output506 = {
	language: _Output373;
	canonicalForm: _Output417;
	family: _Output374;
	kind: _Output375;
};
type _Output507 = {
	language: _Output377;
	canonicalForm: _Output417;
	family: _Output378;
	kind: _Output379;
};
type _Output508 = {
	language: _Output381;
	canonicalForm: _Output417;
	family: _Output382;
	kind: _Output383;
};
type _Output509 = {
	language: _Output385;
	canonicalForm: _Output417;
	family: _Output386;
	kind: _Output387;
};
type _Output510 = {
	language: _Output389;
	canonicalForm: _Output417;
	family: _Output390;
	kind: _Output391;
};
type _Output511 = {
	language: _Output393;
	canonicalForm: _Output417;
	family: _Output394;
	kind: _Output395;
};
type _Output512 = {
	language: _Output397;
	canonicalForm: _Output417;
	family: _Output398;
	kind: _Output399;
};
type _Output513 = {
	language: _Output401;
	canonicalForm: _Output417;
	family: _Output402;
	kind: _Output403;
};
type _Output514 = {
	language: _Output405;
	canonicalForm: _Output417;
	family: _Output406;
	kind: _Output407;
};
type _Output515 = {
	language: _Output409;
	canonicalForm: _Output417;
	family: _Output410;
	kind: _Output411;
};
type _Output415 =
	| _Output416
	| _Output418
	| _Output419
	| _Output420
	| _Output421
	| _Output422
	| _Output423
	| _Output424
	| _Output425
	| _Output426
	| _Output427
	| _Output428
	| _Output429
	| _Output430
	| _Output431
	| _Output432
	| _Output433
	| _Output434
	| _Output435
	| _Output436
	| _Output437
	| _Output438
	| _Output439
	| _Output440
	| _Output441
	| _Output442
	| _Output443
	| _Output444
	| _Output445
	| _Output446
	| _Output447
	| _Output448
	| _Output449
	| _Output450
	| _Output451
	| _Output452
	| _Output453
	| _Output454
	| _Output455
	| _Output456
	| _Output457
	| _Output458
	| _Output459
	| _Output460
	| _Output461
	| _Output462
	| _Output463
	| _Output464
	| _Output465
	| _Output466
	| _Output467
	| _Output468
	| _Output469
	| _Output470
	| _Output471
	| _Output472
	| _Output473
	| _Output474
	| _Output475
	| _Output476
	| _Output477
	| _Output478
	| _Output479
	| _Output480
	| _Output481
	| _Output482
	| _Output483
	| _Output484
	| _Output485
	| _Output486
	| _Output487
	| _Output488
	| _Output489
	| _Output490
	| _Output491
	| _Output492
	| _Output493
	| _Output494
	| _Output495
	| _Output496
	| _Output497
	| _Output498
	| _Output499
	| _Output500
	| _Output501
	| _Output502
	| _Output503
	| _Output504
	| _Output505
	| _Output506
	| _Output507
	| _Output508
	| _Output509
	| _Output510
	| _Output511
	| _Output512
	| _Output513
	| _Output514
	| _Output515;
type _Output518 = {
	language: _Output21;
	canonicalForm: _Output417;
	family: _Output22;
	kind: _Output23;
};
type _Output519 = {
	language: _Output25;
	canonicalForm: _Output417;
	family: _Output26;
	kind: _Output27;
};
type _Output520 = {
	language: _Output29;
	canonicalForm: _Output417;
	family: _Output30;
	kind: _Output31;
};
type _Output521 = {
	language: _Output33;
	canonicalForm: _Output417;
	family: _Output34;
	kind: _Output35;
};
type _Output522 = {
	language: _Output37;
	canonicalForm: _Output417;
	family: _Output38;
	kind: _Output39;
};
type _Output523 = {
	language: _Output41;
	canonicalForm: _Output417;
	family: _Output42;
	kind: _Output43;
};
type _Output524 = {
	language: _Output45;
	canonicalForm: _Output417;
	family: _Output46;
	kind: _Output47;
};
type _Output525 = {
	language: _Output49;
	canonicalForm: _Output417;
	family: _Output50;
	kind: _Output51;
};
type _Output526 = {
	language: _Output53;
	canonicalForm: _Output417;
	family: _Output54;
	kind: _Output55;
};
type _Output527 = {
	language: _Output57;
	canonicalForm: _Output417;
	family: _Output58;
	kind: _Output59;
};
type _Output528 = {
	language: _Output61;
	canonicalForm: _Output417;
	family: _Output62;
	kind: _Output63;
};
type _Output529 = {
	language: _Output65;
	canonicalForm: _Output417;
	family: _Output66;
	kind: _Output67;
};
type _Output530 = {
	language: _Output69;
	canonicalForm: _Output417;
	family: _Output70;
	kind: _Output71;
};
type _Output531 = {
	language: _Output73;
	canonicalForm: _Output417;
	family: _Output74;
	kind: _Output75;
};
type _Output532 = {
	language: _Output77;
	canonicalForm: _Output417;
	family: _Output78;
	kind: _Output79;
};
type _Output533 = {
	language: _Output81;
	canonicalForm: _Output417;
	family: _Output82;
	kind: _Output83;
};
type _Output534 = {
	language: _Output85;
	canonicalForm: _Output417;
	family: _Output86;
	kind: _Output87;
};
type _Output535 = {
	language: _Output153;
	canonicalForm: _Output417;
	family: _Output154;
	kind: _Output155;
};
type _Output536 = {
	language: _Output157;
	canonicalForm: _Output417;
	family: _Output158;
	kind: _Output159;
};
type _Output537 = {
	language: _Output161;
	canonicalForm: _Output417;
	family: _Output162;
	kind: _Output163;
};
type _Output538 = {
	language: _Output165;
	canonicalForm: _Output417;
	family: _Output166;
	kind: _Output167;
};
type _Output539 = {
	language: _Output169;
	canonicalForm: _Output417;
	family: _Output170;
	kind: _Output171;
};
type _Output540 = {
	language: _Output173;
	canonicalForm: _Output417;
	family: _Output174;
	kind: _Output175;
};
type _Output541 = {
	language: _Output177;
	canonicalForm: _Output417;
	family: _Output178;
	kind: _Output179;
};
type _Output542 = {
	language: _Output181;
	canonicalForm: _Output417;
	family: _Output182;
	kind: _Output183;
};
type _Output543 = {
	language: _Output185;
	canonicalForm: _Output417;
	family: _Output186;
	kind: _Output187;
};
type _Output544 = {
	language: _Output189;
	canonicalForm: _Output417;
	family: _Output190;
	kind: _Output191;
};
type _Output545 = {
	language: _Output193;
	canonicalForm: _Output417;
	family: _Output194;
	kind: _Output195;
};
type _Output546 = {
	language: _Output197;
	canonicalForm: _Output417;
	family: _Output198;
	kind: _Output199;
};
type _Output547 = {
	language: _Output201;
	canonicalForm: _Output417;
	family: _Output202;
	kind: _Output203;
};
type _Output548 = {
	language: _Output205;
	canonicalForm: _Output417;
	family: _Output206;
	kind: _Output207;
};
type _Output549 = {
	language: _Output209;
	canonicalForm: _Output417;
	family: _Output210;
	kind: _Output211;
};
type _Output550 = {
	language: _Output213;
	canonicalForm: _Output417;
	family: _Output214;
	kind: _Output215;
};
type _Output551 = {
	language: _Output217;
	canonicalForm: _Output417;
	family: _Output218;
	kind: _Output219;
};
type _Output552 = {
	language: _Output285;
	canonicalForm: _Output417;
	family: _Output286;
	kind: _Output287;
};
type _Output553 = {
	language: _Output289;
	canonicalForm: _Output417;
	family: _Output290;
	kind: _Output291;
};
type _Output554 = {
	language: _Output293;
	canonicalForm: _Output417;
	family: _Output294;
	kind: _Output295;
};
type _Output555 = {
	language: _Output297;
	canonicalForm: _Output417;
	family: _Output298;
	kind: _Output299;
};
type _Output556 = {
	language: _Output301;
	canonicalForm: _Output417;
	family: _Output302;
	kind: _Output303;
};
type _Output557 = {
	language: _Output305;
	canonicalForm: _Output417;
	family: _Output306;
	kind: _Output307;
};
type _Output558 = {
	language: _Output309;
	canonicalForm: _Output417;
	family: _Output310;
	kind: _Output311;
};
type _Output559 = {
	language: _Output313;
	canonicalForm: _Output417;
	family: _Output314;
	kind: _Output315;
};
type _Output560 = {
	language: _Output317;
	canonicalForm: _Output417;
	family: _Output318;
	kind: _Output319;
};
type _Output561 = {
	language: _Output321;
	canonicalForm: _Output417;
	family: _Output322;
	kind: _Output323;
};
type _Output562 = {
	language: _Output325;
	canonicalForm: _Output417;
	family: _Output326;
	kind: _Output327;
};
type _Output563 = {
	language: _Output329;
	canonicalForm: _Output417;
	family: _Output330;
	kind: _Output331;
};
type _Output564 = {
	language: _Output333;
	canonicalForm: _Output417;
	family: _Output334;
	kind: _Output335;
};
type _Output565 = {
	language: _Output337;
	canonicalForm: _Output417;
	family: _Output338;
	kind: _Output339;
};
type _Output566 = {
	language: _Output341;
	canonicalForm: _Output417;
	family: _Output342;
	kind: _Output343;
};
type _Output567 = {
	language: _Output345;
	canonicalForm: _Output417;
	family: _Output346;
	kind: _Output347;
};
type _Output568 = {
	language: _Output349;
	canonicalForm: _Output417;
	family: _Output350;
	kind: _Output351;
};
type _Output517 =
	| _Output518
	| _Output519
	| _Output520
	| _Output521
	| _Output522
	| _Output523
	| _Output524
	| _Output525
	| _Output526
	| _Output527
	| _Output528
	| _Output529
	| _Output530
	| _Output531
	| _Output532
	| _Output533
	| _Output534
	| _Output535
	| _Output536
	| _Output537
	| _Output538
	| _Output539
	| _Output540
	| _Output541
	| _Output542
	| _Output543
	| _Output544
	| _Output545
	| _Output546
	| _Output547
	| _Output548
	| _Output549
	| _Output550
	| _Output551
	| _Output552
	| _Output553
	| _Output554
	| _Output555
	| _Output556
	| _Output557
	| _Output558
	| _Output559
	| _Output560
	| _Output561
	| _Output562
	| _Output563
	| _Output564
	| _Output565
	| _Output566
	| _Output567
	| _Output568;
type _Output516 = [_Output517, _Output517, ...Array<_Output517>];
type _Output571 = "structure";
type _Output576 = "morphemeReading";
type _Output579 = "Reading";
type _Output581 = "Lemma";
type _Output582 = string;
type _Output583 = Record<string, never>;
type _Output580 = {
	unitKind: _Output581;
	language: _Output89;
	family: _Output90;
	kind: _Output91;
	canonicalForm: _Output582;
	coreFeatures: _Output583;
};
type _Output584 = string;
type _Output578 = {
	unitKind: _Output579;
	lemma: _Output580;
	emojiDescription: _Output584;
};
type _Output586 = "Reading";
type _Output588 = "Lemma";
type _Output589 = Record<string, never>;
type _Output587 = {
	unitKind: _Output588;
	language: _Output93;
	family: _Output94;
	kind: _Output95;
	canonicalForm: _Output582;
	coreFeatures: _Output589;
};
type _Output585 = {
	unitKind: _Output586;
	lemma: _Output587;
	emojiDescription: _Output584;
};
type _Output591 = "Reading";
type _Output593 = "Lemma";
type _Output594 = Record<string, never>;
type _Output592 = {
	unitKind: _Output593;
	language: _Output97;
	family: _Output98;
	kind: _Output99;
	canonicalForm: _Output582;
	coreFeatures: _Output594;
};
type _Output590 = {
	unitKind: _Output591;
	lemma: _Output592;
	emojiDescription: _Output584;
};
type _Output596 = "Reading";
type _Output598 = "Lemma";
type _Output599 = Record<string, never>;
type _Output597 = {
	unitKind: _Output598;
	language: _Output101;
	family: _Output102;
	kind: _Output103;
	canonicalForm: _Output582;
	coreFeatures: _Output599;
};
type _Output595 = {
	unitKind: _Output596;
	lemma: _Output597;
	emojiDescription: _Output584;
};
type _Output601 = "Reading";
type _Output603 = "Lemma";
type _Output604 = Record<string, never>;
type _Output602 = {
	unitKind: _Output603;
	language: _Output105;
	family: _Output106;
	kind: _Output107;
	canonicalForm: _Output582;
	coreFeatures: _Output604;
};
type _Output600 = {
	unitKind: _Output601;
	lemma: _Output602;
	emojiDescription: _Output584;
};
type _Output606 = "Reading";
type _Output608 = "Lemma";
type _Output611 = string;
type _Output610 = _Output611 | null;
type _Output609 = { hasSepPrefix: _Output610 };
type _Output607 = {
	unitKind: _Output608;
	language: _Output109;
	family: _Output110;
	kind: _Output111;
	canonicalForm: _Output582;
	coreFeatures: _Output609;
};
type _Output605 = {
	unitKind: _Output606;
	lemma: _Output607;
	emojiDescription: _Output584;
};
type _Output613 = "Reading";
type _Output615 = "Lemma";
type _Output616 = Record<string, never>;
type _Output614 = {
	unitKind: _Output615;
	language: _Output113;
	family: _Output114;
	kind: _Output115;
	canonicalForm: _Output582;
	coreFeatures: _Output616;
};
type _Output612 = {
	unitKind: _Output613;
	lemma: _Output614;
	emojiDescription: _Output584;
};
type _Output618 = "Reading";
type _Output620 = "Lemma";
type _Output621 = Record<string, never>;
type _Output619 = {
	unitKind: _Output620;
	language: _Output117;
	family: _Output118;
	kind: _Output119;
	canonicalForm: _Output582;
	coreFeatures: _Output621;
};
type _Output617 = {
	unitKind: _Output618;
	lemma: _Output619;
	emojiDescription: _Output584;
};
type _Output623 = "Reading";
type _Output625 = "Lemma";
type _Output626 = Record<string, never>;
type _Output624 = {
	unitKind: _Output625;
	language: _Output121;
	family: _Output122;
	kind: _Output123;
	canonicalForm: _Output582;
	coreFeatures: _Output626;
};
type _Output622 = {
	unitKind: _Output623;
	lemma: _Output624;
	emojiDescription: _Output584;
};
type _Output628 = "Reading";
type _Output630 = "Lemma";
type _Output631 = Record<string, never>;
type _Output629 = {
	unitKind: _Output630;
	language: _Output125;
	family: _Output126;
	kind: _Output127;
	canonicalForm: _Output582;
	coreFeatures: _Output631;
};
type _Output627 = {
	unitKind: _Output628;
	lemma: _Output629;
	emojiDescription: _Output584;
};
type _Output633 = "Reading";
type _Output635 = "Lemma";
type _Output636 = Record<string, never>;
type _Output634 = {
	unitKind: _Output635;
	language: _Output221;
	family: _Output222;
	kind: _Output223;
	canonicalForm: _Output582;
	coreFeatures: _Output636;
};
type _Output632 = {
	unitKind: _Output633;
	lemma: _Output634;
	emojiDescription: _Output584;
};
type _Output638 = "Reading";
type _Output640 = "Lemma";
type _Output641 = Record<string, never>;
type _Output639 = {
	unitKind: _Output640;
	language: _Output225;
	family: _Output226;
	kind: _Output227;
	canonicalForm: _Output582;
	coreFeatures: _Output641;
};
type _Output637 = {
	unitKind: _Output638;
	lemma: _Output639;
	emojiDescription: _Output584;
};
type _Output643 = "Reading";
type _Output645 = "Lemma";
type _Output646 = Record<string, never>;
type _Output644 = {
	unitKind: _Output645;
	language: _Output229;
	family: _Output230;
	kind: _Output231;
	canonicalForm: _Output582;
	coreFeatures: _Output646;
};
type _Output642 = {
	unitKind: _Output643;
	lemma: _Output644;
	emojiDescription: _Output584;
};
type _Output648 = "Reading";
type _Output650 = "Lemma";
type _Output651 = Record<string, never>;
type _Output649 = {
	unitKind: _Output650;
	language: _Output233;
	family: _Output234;
	kind: _Output235;
	canonicalForm: _Output582;
	coreFeatures: _Output651;
};
type _Output647 = {
	unitKind: _Output648;
	lemma: _Output649;
	emojiDescription: _Output584;
};
type _Output653 = "Reading";
type _Output655 = "Lemma";
type _Output656 = Record<string, never>;
type _Output654 = {
	unitKind: _Output655;
	language: _Output237;
	family: _Output238;
	kind: _Output239;
	canonicalForm: _Output582;
	coreFeatures: _Output656;
};
type _Output652 = {
	unitKind: _Output653;
	lemma: _Output654;
	emojiDescription: _Output584;
};
type _Output658 = "Reading";
type _Output660 = "Lemma";
type _Output661 = Record<string, never>;
type _Output659 = {
	unitKind: _Output660;
	language: _Output241;
	family: _Output242;
	kind: _Output243;
	canonicalForm: _Output582;
	coreFeatures: _Output661;
};
type _Output657 = {
	unitKind: _Output658;
	lemma: _Output659;
	emojiDescription: _Output584;
};
type _Output663 = "Reading";
type _Output665 = "Lemma";
type _Output666 = Record<string, never>;
type _Output664 = {
	unitKind: _Output665;
	language: _Output245;
	family: _Output246;
	kind: _Output247;
	canonicalForm: _Output582;
	coreFeatures: _Output666;
};
type _Output662 = {
	unitKind: _Output663;
	lemma: _Output664;
	emojiDescription: _Output584;
};
type _Output668 = "Reading";
type _Output670 = "Lemma";
type _Output671 = Record<string, never>;
type _Output669 = {
	unitKind: _Output670;
	language: _Output249;
	family: _Output250;
	kind: _Output251;
	canonicalForm: _Output582;
	coreFeatures: _Output671;
};
type _Output667 = {
	unitKind: _Output668;
	lemma: _Output669;
	emojiDescription: _Output584;
};
type _Output673 = "Reading";
type _Output675 = "Lemma";
type _Output676 = Record<string, never>;
type _Output674 = {
	unitKind: _Output675;
	language: _Output253;
	family: _Output254;
	kind: _Output255;
	canonicalForm: _Output582;
	coreFeatures: _Output676;
};
type _Output672 = {
	unitKind: _Output673;
	lemma: _Output674;
	emojiDescription: _Output584;
};
type _Output678 = "Reading";
type _Output680 = "Lemma";
type _Output681 = Record<string, never>;
type _Output679 = {
	unitKind: _Output680;
	language: _Output257;
	family: _Output258;
	kind: _Output259;
	canonicalForm: _Output582;
	coreFeatures: _Output681;
};
type _Output677 = {
	unitKind: _Output678;
	lemma: _Output679;
	emojiDescription: _Output584;
};
type _Output683 = "Reading";
type _Output685 = "Lemma";
type _Output686 = Record<string, never>;
type _Output684 = {
	unitKind: _Output685;
	language: _Output261;
	family: _Output262;
	kind: _Output263;
	canonicalForm: _Output582;
	coreFeatures: _Output686;
};
type _Output682 = {
	unitKind: _Output683;
	lemma: _Output684;
	emojiDescription: _Output584;
};
type _Output688 = "Reading";
type _Output690 = "Lemma";
type _Output691 = Record<string, never>;
type _Output689 = {
	unitKind: _Output690;
	language: _Output353;
	family: _Output354;
	kind: _Output355;
	canonicalForm: _Output582;
	coreFeatures: _Output691;
};
type _Output687 = {
	unitKind: _Output688;
	lemma: _Output689;
	emojiDescription: _Output584;
};
type _Output693 = "Reading";
type _Output695 = "Lemma";
type _Output696 = Record<string, never>;
type _Output694 = {
	unitKind: _Output695;
	language: _Output357;
	family: _Output358;
	kind: _Output359;
	canonicalForm: _Output582;
	coreFeatures: _Output696;
};
type _Output692 = {
	unitKind: _Output693;
	lemma: _Output694;
	emojiDescription: _Output584;
};
type _Output698 = "Reading";
type _Output700 = "Lemma";
type _Output701 = Record<string, never>;
type _Output699 = {
	unitKind: _Output700;
	language: _Output361;
	family: _Output362;
	kind: _Output363;
	canonicalForm: _Output582;
	coreFeatures: _Output701;
};
type _Output697 = {
	unitKind: _Output698;
	lemma: _Output699;
	emojiDescription: _Output584;
};
type _Output703 = "Reading";
type _Output705 = "Lemma";
type _Output706 = Record<string, never>;
type _Output704 = {
	unitKind: _Output705;
	language: _Output365;
	family: _Output366;
	kind: _Output367;
	canonicalForm: _Output582;
	coreFeatures: _Output706;
};
type _Output702 = {
	unitKind: _Output703;
	lemma: _Output704;
	emojiDescription: _Output584;
};
type _Output708 = "Reading";
type _Output710 = "Lemma";
type _Output711 = Record<string, never>;
type _Output709 = {
	unitKind: _Output710;
	language: _Output369;
	family: _Output370;
	kind: _Output371;
	canonicalForm: _Output582;
	coreFeatures: _Output711;
};
type _Output707 = {
	unitKind: _Output708;
	lemma: _Output709;
	emojiDescription: _Output584;
};
type _Output713 = "Reading";
type _Output715 = "Lemma";
type _Output716 = Record<string, never>;
type _Output714 = {
	unitKind: _Output715;
	language: _Output373;
	family: _Output374;
	kind: _Output375;
	canonicalForm: _Output582;
	coreFeatures: _Output716;
};
type _Output712 = {
	unitKind: _Output713;
	lemma: _Output714;
	emojiDescription: _Output584;
};
type _Output718 = "Reading";
type _Output720 = "Lemma";
type _Output721 = Record<string, never>;
type _Output719 = {
	unitKind: _Output720;
	language: _Output377;
	family: _Output378;
	kind: _Output379;
	canonicalForm: _Output582;
	coreFeatures: _Output721;
};
type _Output717 = {
	unitKind: _Output718;
	lemma: _Output719;
	emojiDescription: _Output584;
};
type _Output723 = "Reading";
type _Output725 = "Lemma";
type _Output726 = Record<string, never>;
type _Output724 = {
	unitKind: _Output725;
	language: _Output381;
	family: _Output382;
	kind: _Output383;
	canonicalForm: _Output582;
	coreFeatures: _Output726;
};
type _Output722 = {
	unitKind: _Output723;
	lemma: _Output724;
	emojiDescription: _Output584;
};
type _Output728 = "Reading";
type _Output730 = "Lemma";
type _Output731 = Record<string, never>;
type _Output729 = {
	unitKind: _Output730;
	language: _Output385;
	family: _Output386;
	kind: _Output387;
	canonicalForm: _Output582;
	coreFeatures: _Output731;
};
type _Output727 = {
	unitKind: _Output728;
	lemma: _Output729;
	emojiDescription: _Output584;
};
type _Output733 = "Reading";
type _Output735 = "Lemma";
type _Output736 = Record<string, never>;
type _Output734 = {
	unitKind: _Output735;
	language: _Output389;
	family: _Output390;
	kind: _Output391;
	canonicalForm: _Output582;
	coreFeatures: _Output736;
};
type _Output732 = {
	unitKind: _Output733;
	lemma: _Output734;
	emojiDescription: _Output584;
};
type _Output738 = "Reading";
type _Output740 = "Lemma";
type _Output741 = Record<string, never>;
type _Output739 = {
	unitKind: _Output740;
	language: _Output393;
	family: _Output394;
	kind: _Output395;
	canonicalForm: _Output582;
	coreFeatures: _Output741;
};
type _Output737 = {
	unitKind: _Output738;
	lemma: _Output739;
	emojiDescription: _Output584;
};
type _Output577 =
	| _Output578
	| _Output585
	| _Output590
	| _Output595
	| _Output600
	| _Output605
	| _Output612
	| _Output617
	| _Output622
	| _Output627
	| _Output632
	| _Output637
	| _Output642
	| _Output647
	| _Output652
	| _Output657
	| _Output662
	| _Output667
	| _Output672
	| _Output677
	| _Output682
	| _Output687
	| _Output692
	| _Output697
	| _Output702
	| _Output707
	| _Output712
	| _Output717
	| _Output722
	| _Output727
	| _Output732
	| _Output737;
type _Output575 = { nodeKind: _Output576; reading: _Output577 };
type _Output743 = "unitShadow";
type _Output745 = {
	language: _Output21;
	canonicalForm: _Output417;
	family: _Output22;
	kind: _Output23;
};
type _Output746 = {
	language: _Output25;
	canonicalForm: _Output417;
	family: _Output26;
	kind: _Output27;
};
type _Output747 = {
	language: _Output29;
	canonicalForm: _Output417;
	family: _Output30;
	kind: _Output31;
};
type _Output748 = {
	language: _Output33;
	canonicalForm: _Output417;
	family: _Output34;
	kind: _Output35;
};
type _Output749 = {
	language: _Output37;
	canonicalForm: _Output417;
	family: _Output38;
	kind: _Output39;
};
type _Output750 = {
	language: _Output41;
	canonicalForm: _Output417;
	family: _Output42;
	kind: _Output43;
};
type _Output751 = {
	language: _Output45;
	canonicalForm: _Output417;
	family: _Output46;
	kind: _Output47;
};
type _Output752 = {
	language: _Output49;
	canonicalForm: _Output417;
	family: _Output50;
	kind: _Output51;
};
type _Output753 = {
	language: _Output53;
	canonicalForm: _Output417;
	family: _Output54;
	kind: _Output55;
};
type _Output754 = {
	language: _Output57;
	canonicalForm: _Output417;
	family: _Output58;
	kind: _Output59;
};
type _Output755 = {
	language: _Output61;
	canonicalForm: _Output417;
	family: _Output62;
	kind: _Output63;
};
type _Output756 = {
	language: _Output65;
	canonicalForm: _Output417;
	family: _Output66;
	kind: _Output67;
};
type _Output757 = {
	language: _Output69;
	canonicalForm: _Output417;
	family: _Output70;
	kind: _Output71;
};
type _Output758 = {
	language: _Output73;
	canonicalForm: _Output417;
	family: _Output74;
	kind: _Output75;
};
type _Output759 = {
	language: _Output77;
	canonicalForm: _Output417;
	family: _Output78;
	kind: _Output79;
};
type _Output760 = {
	language: _Output81;
	canonicalForm: _Output417;
	family: _Output82;
	kind: _Output83;
};
type _Output761 = {
	language: _Output85;
	canonicalForm: _Output417;
	family: _Output86;
	kind: _Output87;
};
type _Output762 = {
	language: _Output129;
	canonicalForm: _Output417;
	family: _Output130;
	kind: _Output131;
};
type _Output763 = {
	language: _Output133;
	canonicalForm: _Output417;
	family: _Output134;
	kind: _Output135;
};
type _Output764 = {
	language: _Output137;
	canonicalForm: _Output417;
	family: _Output138;
	kind: _Output139;
};
type _Output765 = {
	language: _Output141;
	canonicalForm: _Output417;
	family: _Output142;
	kind: _Output143;
};
type _Output766 = {
	language: _Output145;
	canonicalForm: _Output417;
	family: _Output146;
	kind: _Output147;
};
type _Output767 = {
	language: _Output153;
	canonicalForm: _Output417;
	family: _Output154;
	kind: _Output155;
};
type _Output768 = {
	language: _Output157;
	canonicalForm: _Output417;
	family: _Output158;
	kind: _Output159;
};
type _Output769 = {
	language: _Output161;
	canonicalForm: _Output417;
	family: _Output162;
	kind: _Output163;
};
type _Output770 = {
	language: _Output165;
	canonicalForm: _Output417;
	family: _Output166;
	kind: _Output167;
};
type _Output771 = {
	language: _Output169;
	canonicalForm: _Output417;
	family: _Output170;
	kind: _Output171;
};
type _Output772 = {
	language: _Output173;
	canonicalForm: _Output417;
	family: _Output174;
	kind: _Output175;
};
type _Output773 = {
	language: _Output177;
	canonicalForm: _Output417;
	family: _Output178;
	kind: _Output179;
};
type _Output774 = {
	language: _Output181;
	canonicalForm: _Output417;
	family: _Output182;
	kind: _Output183;
};
type _Output775 = {
	language: _Output185;
	canonicalForm: _Output417;
	family: _Output186;
	kind: _Output187;
};
type _Output776 = {
	language: _Output189;
	canonicalForm: _Output417;
	family: _Output190;
	kind: _Output191;
};
type _Output777 = {
	language: _Output193;
	canonicalForm: _Output417;
	family: _Output194;
	kind: _Output195;
};
type _Output778 = {
	language: _Output197;
	canonicalForm: _Output417;
	family: _Output198;
	kind: _Output199;
};
type _Output779 = {
	language: _Output201;
	canonicalForm: _Output417;
	family: _Output202;
	kind: _Output203;
};
type _Output780 = {
	language: _Output205;
	canonicalForm: _Output417;
	family: _Output206;
	kind: _Output207;
};
type _Output781 = {
	language: _Output209;
	canonicalForm: _Output417;
	family: _Output210;
	kind: _Output211;
};
type _Output782 = {
	language: _Output213;
	canonicalForm: _Output417;
	family: _Output214;
	kind: _Output215;
};
type _Output783 = {
	language: _Output217;
	canonicalForm: _Output417;
	family: _Output218;
	kind: _Output219;
};
type _Output784 = {
	language: _Output265;
	canonicalForm: _Output417;
	family: _Output266;
	kind: _Output267;
};
type _Output785 = {
	language: _Output269;
	canonicalForm: _Output417;
	family: _Output270;
	kind: _Output271;
};
type _Output786 = {
	language: _Output273;
	canonicalForm: _Output417;
	family: _Output274;
	kind: _Output275;
};
type _Output787 = {
	language: _Output277;
	canonicalForm: _Output417;
	family: _Output278;
	kind: _Output279;
};
type _Output788 = {
	language: _Output285;
	canonicalForm: _Output417;
	family: _Output286;
	kind: _Output287;
};
type _Output789 = {
	language: _Output289;
	canonicalForm: _Output417;
	family: _Output290;
	kind: _Output291;
};
type _Output790 = {
	language: _Output293;
	canonicalForm: _Output417;
	family: _Output294;
	kind: _Output295;
};
type _Output791 = {
	language: _Output297;
	canonicalForm: _Output417;
	family: _Output298;
	kind: _Output299;
};
type _Output792 = {
	language: _Output301;
	canonicalForm: _Output417;
	family: _Output302;
	kind: _Output303;
};
type _Output793 = {
	language: _Output305;
	canonicalForm: _Output417;
	family: _Output306;
	kind: _Output307;
};
type _Output794 = {
	language: _Output309;
	canonicalForm: _Output417;
	family: _Output310;
	kind: _Output311;
};
type _Output795 = {
	language: _Output313;
	canonicalForm: _Output417;
	family: _Output314;
	kind: _Output315;
};
type _Output796 = {
	language: _Output317;
	canonicalForm: _Output417;
	family: _Output318;
	kind: _Output319;
};
type _Output797 = {
	language: _Output321;
	canonicalForm: _Output417;
	family: _Output322;
	kind: _Output323;
};
type _Output798 = {
	language: _Output325;
	canonicalForm: _Output417;
	family: _Output326;
	kind: _Output327;
};
type _Output799 = {
	language: _Output329;
	canonicalForm: _Output417;
	family: _Output330;
	kind: _Output331;
};
type _Output800 = {
	language: _Output333;
	canonicalForm: _Output417;
	family: _Output334;
	kind: _Output335;
};
type _Output801 = {
	language: _Output337;
	canonicalForm: _Output417;
	family: _Output338;
	kind: _Output339;
};
type _Output802 = {
	language: _Output341;
	canonicalForm: _Output417;
	family: _Output342;
	kind: _Output343;
};
type _Output803 = {
	language: _Output345;
	canonicalForm: _Output417;
	family: _Output346;
	kind: _Output347;
};
type _Output804 = {
	language: _Output349;
	canonicalForm: _Output417;
	family: _Output350;
	kind: _Output351;
};
type _Output805 = {
	language: _Output397;
	canonicalForm: _Output417;
	family: _Output398;
	kind: _Output399;
};
type _Output806 = {
	language: _Output401;
	canonicalForm: _Output417;
	family: _Output402;
	kind: _Output403;
};
type _Output807 = {
	language: _Output405;
	canonicalForm: _Output417;
	family: _Output406;
	kind: _Output407;
};
type _Output808 = {
	language: _Output409;
	canonicalForm: _Output417;
	family: _Output410;
	kind: _Output411;
};
type _Output744 =
	| _Output745
	| _Output746
	| _Output747
	| _Output748
	| _Output749
	| _Output750
	| _Output751
	| _Output752
	| _Output753
	| _Output754
	| _Output755
	| _Output756
	| _Output757
	| _Output758
	| _Output759
	| _Output760
	| _Output761
	| _Output762
	| _Output763
	| _Output764
	| _Output765
	| _Output766
	| _Output767
	| _Output768
	| _Output769
	| _Output770
	| _Output771
	| _Output772
	| _Output773
	| _Output774
	| _Output775
	| _Output776
	| _Output777
	| _Output778
	| _Output779
	| _Output780
	| _Output781
	| _Output782
	| _Output783
	| _Output784
	| _Output785
	| _Output786
	| _Output787
	| _Output788
	| _Output789
	| _Output790
	| _Output791
	| _Output792
	| _Output793
	| _Output794
	| _Output795
	| _Output796
	| _Output797
	| _Output798
	| _Output799
	| _Output800
	| _Output801
	| _Output802
	| _Output803
	| _Output804
	| _Output805
	| _Output806
	| _Output807
	| _Output808;
type _Output742 = { nodeKind: _Output743; unitShadow: _Output744 };
type _Output810 = "structure";
type _Output811 = Array<_Output573>;
type _Output809 = { nodeKind: _Output810; children: _Output811 };
type _Output574 = _Output575 | _Output742 | _Output809;
type _Output573 = _Output574;
type _Output572 = Array<_Output573>;
type _Output570 = { nodeKind: _Output571; children: _Output572 };
type _Output569 = { root: _Output570 };
type _Output812 = { relation: _Output413; target: _Output415 };
type _Output815 = "reading";
type _Output820 = "Reading";
type _Output822 = "Lemma";
type _Output823 = Record<string, never>;
type _Output821 = {
	unitKind: _Output822;
	language: _Output17;
	family: _Output18;
	kind: _Output19;
	canonicalForm: _Output582;
	coreFeatures: _Output823;
};
type _Output819 = {
	unitKind: _Output820;
	lemma: _Output821;
	emojiDescription: _Output584;
};
type _Output825 = "Reading";
type _Output827 = "Lemma";
type _Output830 = "Yes";
type _Output829 = _Output830 | null;
type _Output832 = "Yes";
type _Output831 = _Output832 | null;
type _Output834 = "Card" | "Ord";
type _Output833 = _Output834 | null;
type _Output836 = "Short";
type _Output835 = _Output836 | null;
type _Output828 = {
	abbr: _Output829;
	foreign: _Output831;
	numType: _Output833;
	variant: _Output835;
};
type _Output826 = {
	unitKind: _Output827;
	language: _Output21;
	family: _Output22;
	kind: _Output23;
	canonicalForm: _Output582;
	coreFeatures: _Output828;
};
type _Output824 = {
	unitKind: _Output825;
	lemma: _Output826;
	emojiDescription: _Output584;
};
type _Output838 = "Reading";
type _Output840 = "Lemma";
type _Output842 = _Output830 | null;
type _Output844 = "Circ" | "Post" | "Prep";
type _Output843 = _Output844 | null;
type _Output846 = "ADV" | "SCONJ";
type _Output845 = _Output846 | null;
type _Output847 = _Output832 | null;
type _Output849 =
	| "Acc"
	| "Abe"
	| "Ben"
	| "Cau"
	| "Cmp"
	| "Cns"
	| "Com"
	| "Dat"
	| "Dis"
	| "Equ"
	| "Gen"
	| "Ins"
	| "Par"
	| "Tem"
	| "Abl"
	| "Add"
	| "Ade"
	| "All"
	| "Del"
	| "Ela"
	| "Ess"
	| "Ill"
	| "Ine"
	| "Lat"
	| "Loc"
	| "Nom"
	| "Per"
	| "Sbe"
	| "Sbl"
	| "Spl"
	| "Sub"
	| "Sup"
	| "Ter";
type _Output848 = _Output849 | null;
type _Output851 = "Vbp";
type _Output850 = _Output851 | null;
type _Output841 = {
	abbr: _Output842;
	adpType: _Output843;
	extPos: _Output845;
	foreign: _Output847;
	governedCase: _Output848;
	partType: _Output850;
};
type _Output839 = {
	unitKind: _Output840;
	language: _Output25;
	family: _Output26;
	kind: _Output27;
	canonicalForm: _Output582;
	coreFeatures: _Output841;
};
type _Output837 = {
	unitKind: _Output838;
	lemma: _Output839;
	emojiDescription: _Output584;
};
type _Output853 = "Reading";
type _Output855 = "Lemma";
type _Output857 = _Output832 | null;
type _Output859 = "Card" | "Mult";
type _Output858 = _Output859 | null;
type _Output861 = "Dem" | "Ind" | "Int" | "Neg" | "Rel";
type _Output860 = _Output861 | null;
type _Output856 = {
	foreign: _Output857;
	numType: _Output858;
	pronType: _Output860;
};
type _Output854 = {
	unitKind: _Output855;
	language: _Output29;
	family: _Output30;
	kind: _Output31;
	canonicalForm: _Output582;
	coreFeatures: _Output856;
};
type _Output852 = {
	unitKind: _Output853;
	lemma: _Output854;
	emojiDescription: _Output584;
};
type _Output863 = "Reading";
type _Output865 = "Lemma";
type _Output868 = "Mod";
type _Output867 = _Output868 | null;
type _Output866 = { verbType: _Output867 };
type _Output864 = {
	unitKind: _Output865;
	language: _Output33;
	family: _Output34;
	kind: _Output35;
	canonicalForm: _Output582;
	coreFeatures: _Output866;
};
type _Output862 = {
	unitKind: _Output863;
	lemma: _Output864;
	emojiDescription: _Output584;
};
type _Output870 = "Reading";
type _Output872 = "Lemma";
type _Output875 = "Comp";
type _Output874 = _Output875 | null;
type _Output873 = { conjType: _Output874 };
type _Output871 = {
	unitKind: _Output872;
	language: _Output37;
	family: _Output38;
	kind: _Output39;
	canonicalForm: _Output582;
	coreFeatures: _Output873;
};
type _Output869 = {
	unitKind: _Output870;
	lemma: _Output871;
	emojiDescription: _Output584;
};
type _Output877 = "Reading";
type _Output879 = "Lemma";
type _Output882 = "Def" | "Ind";
type _Output881 = _Output882 | null;
type _Output884 = "ADV" | "DET";
type _Output883 = _Output884 | null;
type _Output885 = _Output832 | null;
type _Output887 = "Card" | "Ord";
type _Output886 = _Output887 | null;
type _Output889 = "1" | "2" | "3";
type _Output888 = _Output889 | null;
type _Output891 = "Form" | "Infm";
type _Output890 = _Output891 | null;
type _Output893 = "Yes";
type _Output892 = _Output893 | null;
type _Output895 =
	| "Art"
	| "Dem"
	| "Emp"
	| "Exc"
	| "Ind"
	| "Int"
	| "Neg"
	| "Prs"
	| "Rel"
	| "Tot";
type _Output894 = _Output895 | null;
type _Output880 = {
	definite: _Output881;
	extPos: _Output883;
	foreign: _Output885;
	numType: _Output886;
	person: _Output888;
	polite: _Output890;
	poss: _Output892;
	pronType: _Output894;
};
type _Output878 = {
	unitKind: _Output879;
	language: _Output41;
	family: _Output42;
	kind: _Output43;
	canonicalForm: _Output582;
	coreFeatures: _Output880;
};
type _Output876 = {
	unitKind: _Output877;
	lemma: _Output878;
	emojiDescription: _Output584;
};
type _Output897 = "Reading";
type _Output899 = "Lemma";
type _Output902 = "Res";
type _Output901 = _Output902 | null;
type _Output900 = { partType: _Output901 };
type _Output898 = {
	unitKind: _Output899;
	language: _Output45;
	family: _Output46;
	kind: _Output47;
	canonicalForm: _Output582;
	coreFeatures: _Output900;
};
type _Output896 = {
	unitKind: _Output897;
	lemma: _Output898;
	emojiDescription: _Output584;
};
type _Output904 = "Reading";
type _Output906 = "Lemma";
type _Output909 = "Fem" | "Masc" | "Neut";
type _Output908 = _Output909 | null;
type _Output911 = "Yes";
type _Output910 = _Output911 | null;
type _Output907 = { gender: _Output908; hyph: _Output910 };
type _Output905 = {
	unitKind: _Output906;
	language: _Output49;
	family: _Output50;
	kind: _Output51;
	canonicalForm: _Output582;
	coreFeatures: _Output907;
};
type _Output903 = {
	unitKind: _Output904;
	lemma: _Output905;
	emojiDescription: _Output584;
};
type _Output913 = "Reading";
type _Output915 = "Lemma";
type _Output917 = _Output830 | null;
type _Output918 = _Output832 | null;
type _Output920 = "Card" | "Frac" | "Mult" | "Range";
type _Output919 = _Output920 | null;
type _Output916 = {
	abbr: _Output917;
	foreign: _Output918;
	numType: _Output919;
};
type _Output914 = {
	unitKind: _Output915;
	language: _Output53;
	family: _Output54;
	kind: _Output55;
	canonicalForm: _Output582;
	coreFeatures: _Output916;
};
type _Output912 = {
	unitKind: _Output913;
	lemma: _Output914;
	emojiDescription: _Output584;
};
type _Output922 = "Reading";
type _Output924 = "Lemma";
type _Output926 = _Output830 | null;
type _Output927 = _Output832 | null;
type _Output928 = _Output911 | null;
type _Output930 = "Card" | "Mult" | "Range";
type _Output929 = _Output930 | null;
type _Output925 = {
	abbr: _Output926;
	foreign: _Output927;
	hyph: _Output928;
	numType: _Output929;
};
type _Output923 = {
	unitKind: _Output924;
	language: _Output57;
	family: _Output58;
	kind: _Output59;
	canonicalForm: _Output582;
	coreFeatures: _Output925;
};
type _Output921 = {
	unitKind: _Output922;
	lemma: _Output923;
	emojiDescription: _Output584;
};
type _Output932 = "Reading";
type _Output934 = "Lemma";
type _Output936 = _Output830 | null;
type _Output937 = _Output832 | null;
type _Output939 = "Inf";
type _Output938 = _Output939 | null;
type _Output941 = "Neg" | "Pos";
type _Output940 = _Output941 | null;
type _Output935 = {
	abbr: _Output936;
	foreign: _Output937;
	partType: _Output938;
	polarity: _Output940;
};
type _Output933 = {
	unitKind: _Output934;
	language: _Output61;
	family: _Output62;
	kind: _Output63;
	canonicalForm: _Output582;
	coreFeatures: _Output935;
};
type _Output931 = {
	unitKind: _Output932;
	lemma: _Output933;
	emojiDescription: _Output584;
};
type _Output943 = "Reading";
type _Output945 = "Lemma";
type _Output948 = "Acc" | "Dat" | "Gen" | "Nom";
type _Output947 = _Output948 | null;
type _Output950 = "Plur" | "Sing";
type _Output949 = _Output950 | null;
type _Output952 = "Fem" | "Masc" | "Neut";
type _Output951 = _Output952 | null;
type _Output954 = "DET";
type _Output953 = _Output954 | null;
type _Output955 = _Output832 | null;
type _Output957 = "1" | "2" | "3";
type _Output956 = _Output957 | null;
type _Output959 = "Form" | "Infm";
type _Output958 = _Output959 | null;
type _Output960 = _Output893 | null;
type _Output962 = "Dem" | "Ind" | "Int" | "Neg" | "Prs" | "Rcp" | "Rel" | "Tot";
type _Output961 = _Output962 | null;
type _Output964 = "Fem" | "Masc" | "Neut";
type _Output963 = _Output964 | null;
type _Output966 = "Plur" | "Sing";
type _Output965 = _Output966 | null;
type _Output946 = {
	case: _Output947;
	number: _Output949;
	"gender[psor]": _Output951;
	extPos: _Output953;
	foreign: _Output955;
	person: _Output956;
	polite: _Output958;
	poss: _Output960;
	pronType: _Output961;
	gender: _Output963;
	referenceNumber: _Output965;
};
type _Output944 = {
	unitKind: _Output945;
	language: _Output65;
	family: _Output66;
	kind: _Output67;
	canonicalForm: _Output582;
	coreFeatures: _Output946;
};
type _Output942 = {
	unitKind: _Output943;
	lemma: _Output944;
	emojiDescription: _Output584;
};
type _Output968 = "Reading";
type _Output970 = "Lemma";
type _Output972 = _Output830 | null;
type _Output973 = _Output832 | null;
type _Output975 = "Fem" | "Masc" | "Neut";
type _Output974 = _Output975 | null;
type _Output971 = { abbr: _Output972; foreign: _Output973; gender: _Output974 };
type _Output969 = {
	unitKind: _Output970;
	language: _Output69;
	family: _Output70;
	kind: _Output71;
	canonicalForm: _Output582;
	coreFeatures: _Output971;
};
type _Output967 = {
	unitKind: _Output968;
	lemma: _Output969;
	emojiDescription: _Output584;
};
type _Output977 = "Reading";
type _Output979 = "Lemma";
type _Output982 =
	| "Brck"
	| "Colo"
	| "Comm"
	| "Dash"
	| "Elip"
	| "Excl"
	| "Peri"
	| "Qest"
	| "Quot";
type _Output981 = _Output982 | null;
type _Output980 = { punctType: _Output981 };
type _Output978 = {
	unitKind: _Output979;
	language: _Output73;
	family: _Output74;
	kind: _Output75;
	canonicalForm: _Output582;
	coreFeatures: _Output980;
};
type _Output976 = {
	unitKind: _Output977;
	lemma: _Output978;
	emojiDescription: _Output584;
};
type _Output984 = "Reading";
type _Output986 = "Lemma";
type _Output989 = "Comp";
type _Output988 = _Output989 | null;
type _Output987 = { conjType: _Output988 };
type _Output985 = {
	unitKind: _Output986;
	language: _Output77;
	family: _Output78;
	kind: _Output79;
	canonicalForm: _Output582;
	coreFeatures: _Output987;
};
type _Output983 = {
	unitKind: _Output984;
	lemma: _Output985;
	emojiDescription: _Output584;
};
type _Output991 = "Reading";
type _Output993 = "Lemma";
type _Output995 = _Output832 | null;
type _Output997 = "Card" | "Range";
type _Output996 = _Output997 | null;
type _Output994 = { foreign: _Output995; numType: _Output996 };
type _Output992 = {
	unitKind: _Output993;
	language: _Output81;
	family: _Output82;
	kind: _Output83;
	canonicalForm: _Output582;
	coreFeatures: _Output994;
};
type _Output990 = {
	unitKind: _Output991;
	lemma: _Output992;
	emojiDescription: _Output584;
};
type _Output999 = "Reading";
type _Output1001 = "Lemma";
type _Output1004 = string;
type _Output1003 = _Output1004 | null;
type _Output1005 = _Output611 | null;
type _Output1007 = "Yes";
type _Output1006 = _Output1007 | null;
type _Output1008 = _Output868 | null;
type _Output1002 = {
	hasGovPrep: _Output1003;
	hasSepPrefix: _Output1005;
	lexicallyReflexive: _Output1006;
	verbType: _Output1008;
};
type _Output1000 = {
	unitKind: _Output1001;
	language: _Output85;
	family: _Output86;
	kind: _Output87;
	canonicalForm: _Output582;
	coreFeatures: _Output1002;
};
type _Output998 = {
	unitKind: _Output999;
	lemma: _Output1000;
	emojiDescription: _Output584;
};
type _Output1010 = "Reading";
type _Output1012 = "Lemma";
type _Output1013 = Record<string, never>;
type _Output1011 = {
	unitKind: _Output1012;
	language: _Output129;
	family: _Output130;
	kind: _Output131;
	canonicalForm: _Output582;
	coreFeatures: _Output1013;
};
type _Output1009 = {
	unitKind: _Output1010;
	lemma: _Output1011;
	emojiDescription: _Output584;
};
type _Output1015 = "Reading";
type _Output1017 = "Lemma";
type _Output1018 = Record<string, never>;
type _Output1016 = {
	unitKind: _Output1017;
	language: _Output133;
	family: _Output134;
	kind: _Output135;
	canonicalForm: _Output582;
	coreFeatures: _Output1018;
};
type _Output1014 = {
	unitKind: _Output1015;
	lemma: _Output1016;
	emojiDescription: _Output584;
};
type _Output1020 = "Reading";
type _Output1022 = "Lemma";
type _Output1025 =
	| "Greeting"
	| "Farewell"
	| "Apology"
	| "Thanks"
	| "Acknowledgment"
	| "Refusal"
	| "Request"
	| "Reaction"
	| "Initiation"
	| "Transition";
type _Output1024 = _Output1025 | null;
type _Output1023 = { discourseFormulaRole: _Output1024 };
type _Output1021 = {
	unitKind: _Output1022;
	language: _Output137;
	family: _Output138;
	kind: _Output139;
	canonicalForm: _Output582;
	coreFeatures: _Output1023;
};
type _Output1019 = {
	unitKind: _Output1020;
	lemma: _Output1021;
	emojiDescription: _Output584;
};
type _Output1027 = "Reading";
type _Output1029 = "Lemma";
type _Output1030 = Record<string, never>;
type _Output1028 = {
	unitKind: _Output1029;
	language: _Output141;
	family: _Output142;
	kind: _Output143;
	canonicalForm: _Output582;
	coreFeatures: _Output1030;
};
type _Output1026 = {
	unitKind: _Output1027;
	lemma: _Output1028;
	emojiDescription: _Output584;
};
type _Output1032 = "Reading";
type _Output1034 = "Lemma";
type _Output1035 = Record<string, never>;
type _Output1033 = {
	unitKind: _Output1034;
	language: _Output145;
	family: _Output146;
	kind: _Output147;
	canonicalForm: _Output582;
	coreFeatures: _Output1035;
};
type _Output1031 = {
	unitKind: _Output1032;
	lemma: _Output1033;
	emojiDescription: _Output584;
};
type _Output1037 = "Reading";
type _Output1039 = "Lemma";
type _Output1040 = Record<string, never>;
type _Output1038 = {
	unitKind: _Output1039;
	language: _Output149;
	family: _Output150;
	kind: _Output151;
	canonicalForm: _Output582;
	coreFeatures: _Output1040;
};
type _Output1036 = {
	unitKind: _Output1037;
	lemma: _Output1038;
	emojiDescription: _Output584;
};
type _Output1042 = "Reading";
type _Output1044 = "Lemma";
type _Output1046 = _Output830 | null;
type _Output1048 = "ADP" | "ADV" | "SCONJ";
type _Output1047 = _Output1048 | null;
type _Output1050 = "Combi" | "Word";
type _Output1049 = _Output1050 | null;
type _Output1052 = "Frac" | "Ord";
type _Output1051 = _Output1052 | null;
type _Output1054 = "Expr";
type _Output1053 = _Output1054 | null;
type _Output1045 = {
	abbr: _Output1046;
	extPos: _Output1047;
	numForm: _Output1049;
	numType: _Output1051;
	style: _Output1053;
};
type _Output1043 = {
	unitKind: _Output1044;
	language: _Output153;
	family: _Output154;
	kind: _Output155;
	canonicalForm: _Output582;
	coreFeatures: _Output1045;
};
type _Output1041 = {
	unitKind: _Output1042;
	lemma: _Output1043;
	emojiDescription: _Output584;
};
type _Output1056 = "Reading";
type _Output1058 = "Lemma";
type _Output1060 = _Output830 | null;
type _Output1062 = "ADP" | "ADV" | "SCONJ";
type _Output1061 = _Output1062 | null;
type _Output1059 = { abbr: _Output1060; extPos: _Output1061 };
type _Output1057 = {
	unitKind: _Output1058;
	language: _Output157;
	family: _Output158;
	kind: _Output159;
	canonicalForm: _Output582;
	coreFeatures: _Output1059;
};
type _Output1055 = {
	unitKind: _Output1056;
	lemma: _Output1057;
	emojiDescription: _Output584;
};
type _Output1064 = "Reading";
type _Output1066 = "Lemma";
type _Output1068 = _Output830 | null;
type _Output1070 = "ADP" | "ADV" | "CCONJ" | "SCONJ";
type _Output1069 = _Output1070 | null;
type _Output1072 = "Word";
type _Output1071 = _Output1072 | null;
type _Output1074 = "Frac" | "Mult" | "Ord";
type _Output1073 = _Output1074 | null;
type _Output1077 = "Dem" | "Ind" | "Int" | "Neg" | "Rel" | "Tot";
type _Output1078 = [_Output1077, ...Array<_Output1077>];
type _Output1076 = _Output1077 | _Output1078;
type _Output1075 = _Output1076 | null;
type _Output1080 = "Expr" | "Slng";
type _Output1079 = _Output1080 | null;
type _Output1067 = {
	abbr: _Output1068;
	extPos: _Output1069;
	numForm: _Output1071;
	numType: _Output1073;
	pronType: _Output1075;
	style: _Output1079;
};
type _Output1065 = {
	unitKind: _Output1066;
	language: _Output161;
	family: _Output162;
	kind: _Output163;
	canonicalForm: _Output582;
	coreFeatures: _Output1067;
};
type _Output1063 = {
	unitKind: _Output1064;
	lemma: _Output1065;
	emojiDescription: _Output584;
};
type _Output1082 = "Reading";
type _Output1084 = "Lemma";
type _Output1086 = _Output830 | null;
type _Output1088 = "Arch" | "Vrnc";
type _Output1087 = _Output1088 | null;
type _Output1085 = { abbr: _Output1086; style: _Output1087 };
type _Output1083 = {
	unitKind: _Output1084;
	language: _Output165;
	family: _Output166;
	kind: _Output167;
	canonicalForm: _Output582;
	coreFeatures: _Output1085;
};
type _Output1081 = {
	unitKind: _Output1082;
	lemma: _Output1083;
	emojiDescription: _Output584;
};
type _Output1090 = "Reading";
type _Output1092 = "Lemma";
type _Output1094 = _Output830 | null;
type _Output1096 = "Neg";
type _Output1095 = _Output1096 | null;
type _Output1093 = { abbr: _Output1094; polarity: _Output1095 };
type _Output1091 = {
	unitKind: _Output1092;
	language: _Output169;
	family: _Output170;
	kind: _Output171;
	canonicalForm: _Output582;
	coreFeatures: _Output1093;
};
type _Output1089 = {
	unitKind: _Output1090;
	lemma: _Output1091;
	emojiDescription: _Output584;
};
type _Output1098 = "Reading";
type _Output1100 = "Lemma";
type _Output1102 = _Output830 | null;
type _Output1104 = "Def" | "Ind";
type _Output1103 = _Output1104 | null;
type _Output1106 = "ADV" | "PRON";
type _Output1105 = _Output1106 | null;
type _Output1108 = "Word";
type _Output1107 = _Output1108 | null;
type _Output1110 = "Frac";
type _Output1109 = _Output1110 | null;
type _Output1113 =
	| "Art"
	| "Dem"
	| "Ind"
	| "Int"
	| "Neg"
	| "Rcp"
	| "Rel"
	| "Tot";
type _Output1114 = [_Output1113, ...Array<_Output1113>];
type _Output1112 = _Output1113 | _Output1114;
type _Output1111 = _Output1112 | null;
type _Output1116 = "Vrnc";
type _Output1115 = _Output1116 | null;
type _Output1101 = {
	abbr: _Output1102;
	definite: _Output1103;
	extPos: _Output1105;
	numForm: _Output1107;
	numType: _Output1109;
	pronType: _Output1111;
	style: _Output1115;
};
type _Output1099 = {
	unitKind: _Output1100;
	language: _Output173;
	family: _Output174;
	kind: _Output175;
	canonicalForm: _Output582;
	coreFeatures: _Output1101;
};
type _Output1097 = {
	unitKind: _Output1098;
	lemma: _Output1099;
	emojiDescription: _Output584;
};
type _Output1118 = "Reading";
type _Output1120 = "Lemma";
type _Output1122 = _Output830 | null;
type _Output1123 = _Output832 | null;
type _Output1125 = "Neg" | "Pos";
type _Output1124 = _Output1125 | null;
type _Output1127 = "Expr";
type _Output1126 = _Output1127 | null;
type _Output1121 = {
	abbr: _Output1122;
	foreign: _Output1123;
	polarity: _Output1124;
	style: _Output1126;
};
type _Output1119 = {
	unitKind: _Output1120;
	language: _Output177;
	family: _Output178;
	kind: _Output179;
	canonicalForm: _Output582;
	coreFeatures: _Output1121;
};
type _Output1117 = {
	unitKind: _Output1118;
	lemma: _Output1119;
	emojiDescription: _Output584;
};
type _Output1129 = "Reading";
type _Output1131 = "Lemma";
type _Output1133 = _Output830 | null;
type _Output1135 = "ADV" | "PROPN";
type _Output1134 = _Output1135 | null;
type _Output1136 = _Output832 | null;
type _Output1138 = "Combi" | "Digit" | "Word";
type _Output1137 = _Output1138 | null;
type _Output1140 = "Card" | "Frac" | "Ord";
type _Output1139 = _Output1140 | null;
type _Output1142 = "Expr" | "Vrnc";
type _Output1141 = _Output1142 | null;
type _Output1132 = {
	abbr: _Output1133;
	extPos: _Output1134;
	foreign: _Output1136;
	numForm: _Output1137;
	numType: _Output1139;
	style: _Output1141;
};
type _Output1130 = {
	unitKind: _Output1131;
	language: _Output181;
	family: _Output182;
	kind: _Output183;
	canonicalForm: _Output582;
	coreFeatures: _Output1132;
};
type _Output1128 = {
	unitKind: _Output1129;
	lemma: _Output1130;
	emojiDescription: _Output584;
};
type _Output1144 = "Reading";
type _Output1146 = "Lemma";
type _Output1148 = _Output830 | null;
type _Output1150 = "PROPN";
type _Output1149 = _Output1150 | null;
type _Output1152 = "Digit" | "Roman" | "Word";
type _Output1151 = _Output1152 | null;
type _Output1154 = "Card" | "Frac";
type _Output1153 = _Output1154 | null;
type _Output1147 = {
	abbr: _Output1148;
	extPos: _Output1149;
	numForm: _Output1151;
	numType: _Output1153;
};
type _Output1145 = {
	unitKind: _Output1146;
	language: _Output185;
	family: _Output186;
	kind: _Output187;
	canonicalForm: _Output582;
	coreFeatures: _Output1147;
};
type _Output1143 = {
	unitKind: _Output1144;
	lemma: _Output1145;
	emojiDescription: _Output584;
};
type _Output1156 = "Reading";
type _Output1158 = "Lemma";
type _Output1161 = "PROPN";
type _Output1160 = _Output1161 | null;
type _Output1162 = _Output832 | null;
type _Output1159 = { extPos: _Output1160; foreign: _Output1162 };
type _Output1157 = {
	unitKind: _Output1158;
	language: _Output189;
	family: _Output190;
	kind: _Output191;
	canonicalForm: _Output582;
	coreFeatures: _Output1159;
};
type _Output1155 = {
	unitKind: _Output1156;
	lemma: _Output1157;
	emojiDescription: _Output584;
};
type _Output1164 = "Reading";
type _Output1166 = "Lemma";
type _Output1168 = _Output830 | null;
type _Output1170 = "CCONJ";
type _Output1169 = _Output1170 | null;
type _Output1172 = "Neg";
type _Output1171 = _Output1172 | null;
type _Output1167 = {
	abbr: _Output1168;
	extPos: _Output1169;
	polarity: _Output1171;
};
type _Output1165 = {
	unitKind: _Output1166;
	language: _Output193;
	family: _Output194;
	kind: _Output195;
	canonicalForm: _Output582;
	coreFeatures: _Output1167;
};
type _Output1163 = {
	unitKind: _Output1164;
	lemma: _Output1165;
	emojiDescription: _Output584;
};
type _Output1174 = "Reading";
type _Output1176 = "Lemma";
type _Output1178 = _Output830 | null;
type _Output1180 = "ADV" | "PRON";
type _Output1179 = _Output1180 | null;
type _Output1182 = "1" | "2" | "3";
type _Output1181 = _Output1182 | null;
type _Output1183 = _Output893 | null;
type _Output1186 =
	| "Dem"
	| "Emp"
	| "Ind"
	| "Int"
	| "Neg"
	| "Prs"
	| "Rcp"
	| "Rel"
	| "Tot";
type _Output1187 = [_Output1186, ...Array<_Output1186>];
type _Output1185 = _Output1186 | _Output1187;
type _Output1184 = _Output1185 | null;
type _Output1189 = "Arch" | "Coll" | "Expr" | "Slng" | "Vrnc";
type _Output1188 = _Output1189 | null;
type _Output1177 = {
	abbr: _Output1178;
	extPos: _Output1179;
	person: _Output1181;
	poss: _Output1183;
	pronType: _Output1184;
	style: _Output1188;
};
type _Output1175 = {
	unitKind: _Output1176;
	language: _Output197;
	family: _Output198;
	kind: _Output199;
	canonicalForm: _Output582;
	coreFeatures: _Output1177;
};
type _Output1173 = {
	unitKind: _Output1174;
	lemma: _Output1175;
	emojiDescription: _Output584;
};
type _Output1191 = "Reading";
type _Output1193 = "Lemma";
type _Output1195 = _Output830 | null;
type _Output1197 = "PROPN";
type _Output1196 = _Output1197 | null;
type _Output1199 = "Expr";
type _Output1198 = _Output1199 | null;
type _Output1194 = {
	abbr: _Output1195;
	extPos: _Output1196;
	style: _Output1198;
};
type _Output1192 = {
	unitKind: _Output1193;
	language: _Output201;
	family: _Output202;
	kind: _Output203;
	canonicalForm: _Output582;
	coreFeatures: _Output1194;
};
type _Output1190 = {
	unitKind: _Output1191;
	lemma: _Output1192;
	emojiDescription: _Output584;
};
type _Output1201 = "Reading";
type _Output1203 = "Lemma";
type _Output1204 = Record<string, never>;
type _Output1202 = {
	unitKind: _Output1203;
	language: _Output205;
	family: _Output206;
	kind: _Output207;
	canonicalForm: _Output582;
	coreFeatures: _Output1204;
};
type _Output1200 = {
	unitKind: _Output1201;
	lemma: _Output1202;
	emojiDescription: _Output584;
};
type _Output1206 = "Reading";
type _Output1208 = "Lemma";
type _Output1210 = _Output830 | null;
type _Output1212 = "ADP" | "SCONJ";
type _Output1211 = _Output1212 | null;
type _Output1214 = "Vrnc";
type _Output1213 = _Output1214 | null;
type _Output1209 = {
	abbr: _Output1210;
	extPos: _Output1211;
	style: _Output1213;
};
type _Output1207 = {
	unitKind: _Output1208;
	language: _Output209;
	family: _Output210;
	kind: _Output211;
	canonicalForm: _Output582;
	coreFeatures: _Output1209;
};
type _Output1205 = {
	unitKind: _Output1206;
	lemma: _Output1207;
	emojiDescription: _Output584;
};
type _Output1216 = "Reading";
type _Output1218 = "Lemma";
type _Output1220 = _Output830 | null;
type _Output1222 = "ADP" | "PROPN";
type _Output1221 = _Output1222 | null;
type _Output1219 = { abbr: _Output1220; extPos: _Output1221 };
type _Output1217 = {
	unitKind: _Output1218;
	language: _Output213;
	family: _Output214;
	kind: _Output215;
	canonicalForm: _Output582;
	coreFeatures: _Output1219;
};
type _Output1215 = {
	unitKind: _Output1216;
	lemma: _Output1217;
	emojiDescription: _Output584;
};
type _Output1224 = "Reading";
type _Output1226 = "Lemma";
type _Output1228 = _Output830 | null;
type _Output1230 = "ADP" | "CCONJ" | "PROPN";
type _Output1229 = _Output1230 | null;
type _Output1231 = _Output1004 | null;
type _Output1233 = "Yes";
type _Output1232 = _Output1233 | null;
type _Output1235 = "Expr" | "Vrnc";
type _Output1234 = _Output1235 | null;
type _Output1227 = {
	abbr: _Output1228;
	extPos: _Output1229;
	hasGovPrep: _Output1231;
	phrasal: _Output1232;
	style: _Output1234;
};
type _Output1225 = {
	unitKind: _Output1226;
	language: _Output217;
	family: _Output218;
	kind: _Output219;
	canonicalForm: _Output582;
	coreFeatures: _Output1227;
};
type _Output1223 = {
	unitKind: _Output1224;
	lemma: _Output1225;
	emojiDescription: _Output584;
};
type _Output1237 = "Reading";
type _Output1239 = "Lemma";
type _Output1240 = Record<string, never>;
type _Output1238 = {
	unitKind: _Output1239;
	language: _Output265;
	family: _Output266;
	kind: _Output267;
	canonicalForm: _Output582;
	coreFeatures: _Output1240;
};
type _Output1236 = {
	unitKind: _Output1237;
	lemma: _Output1238;
	emojiDescription: _Output584;
};
type _Output1242 = "Reading";
type _Output1244 = "Lemma";
type _Output1246 = _Output1025 | null;
type _Output1245 = { discourseFormulaRole: _Output1246 };
type _Output1243 = {
	unitKind: _Output1244;
	language: _Output269;
	family: _Output270;
	kind: _Output271;
	canonicalForm: _Output582;
	coreFeatures: _Output1245;
};
type _Output1241 = {
	unitKind: _Output1242;
	lemma: _Output1243;
	emojiDescription: _Output584;
};
type _Output1248 = "Reading";
type _Output1250 = "Lemma";
type _Output1251 = Record<string, never>;
type _Output1249 = {
	unitKind: _Output1250;
	language: _Output273;
	family: _Output274;
	kind: _Output275;
	canonicalForm: _Output582;
	coreFeatures: _Output1251;
};
type _Output1247 = {
	unitKind: _Output1248;
	lemma: _Output1249;
	emojiDescription: _Output584;
};
type _Output1253 = "Reading";
type _Output1255 = "Lemma";
type _Output1256 = Record<string, never>;
type _Output1254 = {
	unitKind: _Output1255;
	language: _Output277;
	family: _Output278;
	kind: _Output279;
	canonicalForm: _Output582;
	coreFeatures: _Output1256;
};
type _Output1252 = {
	unitKind: _Output1253;
	lemma: _Output1254;
	emojiDescription: _Output584;
};
type _Output1258 = "Reading";
type _Output1260 = "Lemma";
type _Output1261 = Record<string, never>;
type _Output1259 = {
	unitKind: _Output1260;
	language: _Output281;
	family: _Output282;
	kind: _Output283;
	canonicalForm: _Output582;
	coreFeatures: _Output1261;
};
type _Output1257 = {
	unitKind: _Output1258;
	lemma: _Output1259;
	emojiDescription: _Output584;
};
type _Output1263 = "Reading";
type _Output1265 = "Lemma";
type _Output1267 = _Output830 | null;
type _Output1266 = { abbr: _Output1267 };
type _Output1264 = {
	unitKind: _Output1265;
	language: _Output285;
	family: _Output286;
	kind: _Output287;
	canonicalForm: _Output582;
	coreFeatures: _Output1266;
};
type _Output1262 = {
	unitKind: _Output1263;
	lemma: _Output1264;
	emojiDescription: _Output584;
};
type _Output1269 = "Reading";
type _Output1271 = "Lemma";
type _Output1273 = _Output830 | null;
type _Output1275 = "Acc" | "Gen";
type _Output1274 = _Output1275 | null;
type _Output1272 = { abbr: _Output1273; case: _Output1274 };
type _Output1270 = {
	unitKind: _Output1271;
	language: _Output289;
	family: _Output290;
	kind: _Output291;
	canonicalForm: _Output582;
	coreFeatures: _Output1272;
};
type _Output1268 = {
	unitKind: _Output1269;
	lemma: _Output1270;
	emojiDescription: _Output584;
};
type _Output1277 = "Reading";
type _Output1279 = "Lemma";
type _Output1282 = "Yes";
type _Output1281 = _Output1282 | null;
type _Output1280 = { prefix: _Output1281 };
type _Output1278 = {
	unitKind: _Output1279;
	language: _Output293;
	family: _Output294;
	kind: _Output295;
	canonicalForm: _Output582;
	coreFeatures: _Output1280;
};
type _Output1276 = {
	unitKind: _Output1277;
	lemma: _Output1278;
	emojiDescription: _Output584;
};
type _Output1284 = "Reading";
type _Output1286 = "Lemma";
type _Output1289 = "Cop" | "Mod";
type _Output1288 = _Output1289 | null;
type _Output1287 = { verbType: _Output1288 };
type _Output1285 = {
	unitKind: _Output1286;
	language: _Output297;
	family: _Output298;
	kind: _Output299;
	canonicalForm: _Output582;
	coreFeatures: _Output1287;
};
type _Output1283 = {
	unitKind: _Output1284;
	lemma: _Output1285;
	emojiDescription: _Output584;
};
type _Output1291 = "Reading";
type _Output1293 = "Lemma";
type _Output1294 = Record<string, never>;
type _Output1292 = {
	unitKind: _Output1293;
	language: _Output301;
	family: _Output302;
	kind: _Output303;
	canonicalForm: _Output582;
	coreFeatures: _Output1294;
};
type _Output1290 = {
	unitKind: _Output1291;
	lemma: _Output1292;
	emojiDescription: _Output584;
};
type _Output1296 = "Reading";
type _Output1298 = "Lemma";
type _Output1301 = "Art" | "Int";
type _Output1300 = _Output1301 | null;
type _Output1299 = { pronType: _Output1300 };
type _Output1297 = {
	unitKind: _Output1298;
	language: _Output305;
	family: _Output306;
	kind: _Output307;
	canonicalForm: _Output582;
	coreFeatures: _Output1299;
};
type _Output1295 = {
	unitKind: _Output1296;
	lemma: _Output1297;
	emojiDescription: _Output584;
};
type _Output1303 = "Reading";
type _Output1305 = "Lemma";
type _Output1306 = Record<string, never>;
type _Output1304 = {
	unitKind: _Output1305;
	language: _Output309;
	family: _Output310;
	kind: _Output311;
	canonicalForm: _Output582;
	coreFeatures: _Output1306;
};
type _Output1302 = {
	unitKind: _Output1303;
	lemma: _Output1304;
	emojiDescription: _Output584;
};
type _Output1308 = "Reading";
type _Output1310 = "Lemma";
type _Output1312 = _Output830 | null;
type _Output1315 = "Fem" | "Masc";
type _Output1316 = [_Output1315, ...Array<_Output1315>];
type _Output1314 = _Output1315 | _Output1316;
type _Output1313 = _Output1314 | null;
type _Output1311 = { abbr: _Output1312; gender: _Output1313 };
type _Output1309 = {
	unitKind: _Output1310;
	language: _Output313;
	family: _Output314;
	kind: _Output315;
	canonicalForm: _Output582;
	coreFeatures: _Output1311;
};
type _Output1307 = {
	unitKind: _Output1308;
	lemma: _Output1309;
	emojiDescription: _Output584;
};
type _Output1318 = "Reading";
type _Output1320 = "Lemma";
type _Output1321 = Record<string, never>;
type _Output1319 = {
	unitKind: _Output1320;
	language: _Output317;
	family: _Output318;
	kind: _Output319;
	canonicalForm: _Output582;
	coreFeatures: _Output1321;
};
type _Output1317 = {
	unitKind: _Output1318;
	lemma: _Output1319;
	emojiDescription: _Output584;
};
type _Output1323 = "Reading";
type _Output1325 = "Lemma";
type _Output1326 = Record<string, never>;
type _Output1324 = {
	unitKind: _Output1325;
	language: _Output321;
	family: _Output322;
	kind: _Output323;
	canonicalForm: _Output582;
	coreFeatures: _Output1326;
};
type _Output1322 = {
	unitKind: _Output1323;
	lemma: _Output1324;
	emojiDescription: _Output584;
};
type _Output1328 = "Reading";
type _Output1330 = "Lemma";
type _Output1331 = Record<string, never>;
type _Output1329 = {
	unitKind: _Output1330;
	language: _Output325;
	family: _Output326;
	kind: _Output327;
	canonicalForm: _Output582;
	coreFeatures: _Output1331;
};
type _Output1327 = {
	unitKind: _Output1328;
	lemma: _Output1329;
	emojiDescription: _Output584;
};
type _Output1333 = "Reading";
type _Output1335 = "Lemma";
type _Output1338 = "Def";
type _Output1337 = _Output1338 | null;
type _Output1340 = "Dem" | "Ind" | "Int" | "Prs";
type _Output1339 = _Output1340 | null;
type _Output1342 = "Yes";
type _Output1341 = _Output1342 | null;
type _Output1336 = {
	definite: _Output1337;
	pronType: _Output1339;
	reflex: _Output1341;
};
type _Output1334 = {
	unitKind: _Output1335;
	language: _Output329;
	family: _Output330;
	kind: _Output331;
	canonicalForm: _Output582;
	coreFeatures: _Output1336;
};
type _Output1332 = {
	unitKind: _Output1333;
	lemma: _Output1334;
	emojiDescription: _Output584;
};
type _Output1344 = "Reading";
type _Output1346 = "Lemma";
type _Output1348 = _Output830 | null;
type _Output1351 = "Fem" | "Masc";
type _Output1352 = [_Output1351, ...Array<_Output1351>];
type _Output1350 = _Output1351 | _Output1352;
type _Output1349 = _Output1350 | null;
type _Output1347 = { abbr: _Output1348; gender: _Output1349 };
type _Output1345 = {
	unitKind: _Output1346;
	language: _Output333;
	family: _Output334;
	kind: _Output335;
	canonicalForm: _Output582;
	coreFeatures: _Output1347;
};
type _Output1343 = {
	unitKind: _Output1344;
	lemma: _Output1345;
	emojiDescription: _Output584;
};
type _Output1354 = "Reading";
type _Output1356 = "Lemma";
type _Output1357 = Record<string, never>;
type _Output1355 = {
	unitKind: _Output1356;
	language: _Output337;
	family: _Output338;
	kind: _Output339;
	canonicalForm: _Output582;
	coreFeatures: _Output1357;
};
type _Output1353 = {
	unitKind: _Output1354;
	lemma: _Output1355;
	emojiDescription: _Output584;
};
type _Output1359 = "Reading";
type _Output1361 = "Lemma";
type _Output1364 = "Tem";
type _Output1363 = _Output1364 | null;
type _Output1362 = { case: _Output1363 };
type _Output1360 = {
	unitKind: _Output1361;
	language: _Output341;
	family: _Output342;
	kind: _Output343;
	canonicalForm: _Output582;
	coreFeatures: _Output1362;
};
type _Output1358 = {
	unitKind: _Output1359;
	lemma: _Output1360;
	emojiDescription: _Output584;
};
type _Output1366 = "Reading";
type _Output1368 = "Lemma";
type _Output1369 = Record<string, never>;
type _Output1367 = {
	unitKind: _Output1368;
	language: _Output345;
	family: _Output346;
	kind: _Output347;
	canonicalForm: _Output582;
	coreFeatures: _Output1369;
};
type _Output1365 = {
	unitKind: _Output1366;
	lemma: _Output1367;
	emojiDescription: _Output584;
};
type _Output1371 = "Reading";
type _Output1373 = "Lemma";
type _Output1376 =
	| "HIFIL"
	| "HITPAEL"
	| "HUFAL"
	| "NIFAL"
	| "PAAL"
	| "PIEL"
	| "PUAL";
type _Output1375 = _Output1376 | null;
type _Output1378 = "Yes";
type _Output1377 = _Output1378 | null;
type _Output1374 = { hebBinyan: _Output1375; hebExistential: _Output1377 };
type _Output1372 = {
	unitKind: _Output1373;
	language: _Output349;
	family: _Output350;
	kind: _Output351;
	canonicalForm: _Output582;
	coreFeatures: _Output1374;
};
type _Output1370 = {
	unitKind: _Output1371;
	lemma: _Output1372;
	emojiDescription: _Output584;
};
type _Output1380 = "Reading";
type _Output1382 = "Lemma";
type _Output1383 = Record<string, never>;
type _Output1381 = {
	unitKind: _Output1382;
	language: _Output397;
	family: _Output398;
	kind: _Output399;
	canonicalForm: _Output582;
	coreFeatures: _Output1383;
};
type _Output1379 = {
	unitKind: _Output1380;
	lemma: _Output1381;
	emojiDescription: _Output584;
};
type _Output1385 = "Reading";
type _Output1387 = "Lemma";
type _Output1388 = Record<string, never>;
type _Output1386 = {
	unitKind: _Output1387;
	language: _Output401;
	family: _Output402;
	kind: _Output403;
	canonicalForm: _Output582;
	coreFeatures: _Output1388;
};
type _Output1384 = {
	unitKind: _Output1385;
	lemma: _Output1386;
	emojiDescription: _Output584;
};
type _Output1390 = "Reading";
type _Output1392 = "Lemma";
type _Output1393 = Record<string, never>;
type _Output1391 = {
	unitKind: _Output1392;
	language: _Output405;
	family: _Output406;
	kind: _Output407;
	canonicalForm: _Output582;
	coreFeatures: _Output1393;
};
type _Output1389 = {
	unitKind: _Output1390;
	lemma: _Output1391;
	emojiDescription: _Output584;
};
type _Output1395 = "Reading";
type _Output1397 = "Lemma";
type _Output1398 = Record<string, never>;
type _Output1396 = {
	unitKind: _Output1397;
	language: _Output409;
	family: _Output410;
	kind: _Output411;
	canonicalForm: _Output582;
	coreFeatures: _Output1398;
};
type _Output1394 = {
	unitKind: _Output1395;
	lemma: _Output1396;
	emojiDescription: _Output584;
};
type _Output818 =
	| _Output819
	| _Output824
	| _Output837
	| _Output852
	| _Output862
	| _Output869
	| _Output876
	| _Output896
	| _Output903
	| _Output912
	| _Output921
	| _Output931
	| _Output942
	| _Output967
	| _Output976
	| _Output983
	| _Output990
	| _Output998
	| _Output578
	| _Output585
	| _Output590
	| _Output595
	| _Output600
	| _Output605
	| _Output612
	| _Output617
	| _Output622
	| _Output627
	| _Output1009
	| _Output1014
	| _Output1019
	| _Output1026
	| _Output1031
	| _Output1036
	| _Output1041
	| _Output1055
	| _Output1063
	| _Output1081
	| _Output1089
	| _Output1097
	| _Output1117
	| _Output1128
	| _Output1143
	| _Output1155
	| _Output1163
	| _Output1173
	| _Output1190
	| _Output1200
	| _Output1205
	| _Output1215
	| _Output1223
	| _Output632
	| _Output637
	| _Output642
	| _Output647
	| _Output652
	| _Output657
	| _Output662
	| _Output667
	| _Output672
	| _Output677
	| _Output682
	| _Output1236
	| _Output1241
	| _Output1247
	| _Output1252
	| _Output1257
	| _Output1262
	| _Output1268
	| _Output1276
	| _Output1283
	| _Output1290
	| _Output1295
	| _Output1302
	| _Output1307
	| _Output1317
	| _Output1322
	| _Output1327
	| _Output1332
	| _Output1343
	| _Output1353
	| _Output1358
	| _Output1365
	| _Output1370
	| _Output687
	| _Output692
	| _Output697
	| _Output702
	| _Output707
	| _Output712
	| _Output717
	| _Output722
	| _Output727
	| _Output732
	| _Output737
	| _Output1379
	| _Output1384
	| _Output1389
	| _Output1394;
type _Output817 = Array<_Output818>;
type _Output816 = _Output817 | undefined;
type _Output814 = { targetKind: _Output815; synonym?: _Output816 };
type _Output1401 = "lemma";
type _Output1400 = _Output1401 | undefined;
type _Output1404 =
	| _Output821
	| _Output826
	| _Output839
	| _Output854
	| _Output864
	| _Output871
	| _Output878
	| _Output898
	| _Output905
	| _Output914
	| _Output923
	| _Output933
	| _Output944
	| _Output969
	| _Output978
	| _Output985
	| _Output992
	| _Output1000
	| _Output580
	| _Output587
	| _Output592
	| _Output597
	| _Output602
	| _Output607
	| _Output614
	| _Output619
	| _Output624
	| _Output629
	| _Output1011
	| _Output1016
	| _Output1021
	| _Output1028
	| _Output1033
	| _Output1038
	| _Output1043
	| _Output1057
	| _Output1065
	| _Output1083
	| _Output1091
	| _Output1099
	| _Output1119
	| _Output1130
	| _Output1145
	| _Output1157
	| _Output1165
	| _Output1175
	| _Output1192
	| _Output1202
	| _Output1207
	| _Output1217
	| _Output1225
	| _Output634
	| _Output639
	| _Output644
	| _Output649
	| _Output654
	| _Output659
	| _Output664
	| _Output669
	| _Output674
	| _Output679
	| _Output684
	| _Output1238
	| _Output1243
	| _Output1249
	| _Output1254
	| _Output1259
	| _Output1264
	| _Output1270
	| _Output1278
	| _Output1285
	| _Output1292
	| _Output1297
	| _Output1304
	| _Output1309
	| _Output1319
	| _Output1324
	| _Output1329
	| _Output1334
	| _Output1345
	| _Output1355
	| _Output1360
	| _Output1367
	| _Output1372
	| _Output689
	| _Output694
	| _Output699
	| _Output704
	| _Output709
	| _Output714
	| _Output719
	| _Output724
	| _Output729
	| _Output734
	| _Output739
	| _Output1381
	| _Output1386
	| _Output1391
	| _Output1396;
type _Output1403 = Array<_Output1404>;
type _Output1402 = _Output1403 | undefined;
type _Output1406 = Array<_Output1404>;
type _Output1405 = _Output1406 | undefined;
type _Output1408 = Array<_Output1404>;
type _Output1407 = _Output1408 | undefined;
type _Output1410 = Array<_Output1404>;
type _Output1409 = _Output1410 | undefined;
type _Output1412 = Array<_Output1404>;
type _Output1411 = _Output1412 | undefined;
type _Output1414 = Array<_Output1404>;
type _Output1413 = _Output1414 | undefined;
type _Output1399 = {
	targetKind?: _Output1400;
	synonym?: _Output1402;
	nearSynonym?: _Output1405;
	antonym?: _Output1407;
	nearAntonym?: _Output1409;
	hypernym?: _Output1411;
	holonym?: _Output1413;
};
type _Output813 = _Output814 | _Output1399;
type _Output1417 = string;
type _Output1416 = _Output1417 | undefined;
type _Output1418 = _Output1417 | undefined;
type _Output1422 = Array<_Output1417>;
type _Output1421 = _Output1422 | undefined;
type _Output1423 = _Output1422 | undefined;
type _Output1420 = { en?: _Output1421; ru?: _Output1423 };
type _Output1419 = _Output1420 | undefined;
type _Output1424 = _Output569 | undefined;
type _Output1425 = _Output516 | undefined;
type _Output1426 = _Output813 | undefined;
type _Output1415 = {
	transcription?: _Output1416;
	definition?: _Output1418;
	translations?: _Output1419;
	morphologicalTree?: _Output1424;
	lexicalBreakdown?: _Output1425;
	semanticRelations?: _Output1426;
};
type _Output1429 = "Contribute" | "Correct";
type _Output1430 = "transcription" | "definition";
type _Output1428 = {
	kind: _Output1429;
	aspect: _Output1430;
	value: _Output1417;
};
type _Output1432 = "Retract";
type _Output1431 = { kind: _Output1432; aspect: _Output1430 };
type _Output1434 = "translations";
type _Output1433 = {
	kind: _Output1429;
	aspect: _Output1434;
	language: _Output414;
	value: _Output1422;
};
type _Output1436 = "Retract";
type _Output1437 = "translations";
type _Output1435 = {
	kind: _Output1436;
	aspect: _Output1437;
	language: _Output414;
};
type _Output1439 = "semanticRelations";
type _Output1440 = "synonym";
type _Output1441 = "reading";
type _Output1442 = Array<_Output818>;
type _Output1438 = {
	kind: _Output1429;
	aspect: _Output1439;
	relation: _Output1440;
	targetKind: _Output1441;
	value: _Output1442;
};
type _Output1444 = "semanticRelations";
type _Output1446 = "lemma";
type _Output1445 = _Output1446 | undefined;
type _Output1447 = Array<_Output1404>;
type _Output1443 = {
	kind: _Output1429;
	aspect: _Output1444;
	relation: _Output413;
	targetKind?: _Output1445;
	value: _Output1447;
};
type _Output1449 = "Retract";
type _Output1450 = "semanticRelations";
type _Output1451 = "synonym";
type _Output1452 = "reading";
type _Output1448 = {
	kind: _Output1449;
	aspect: _Output1450;
	relation: _Output1451;
	targetKind: _Output1452;
};
type _Output1454 = "Retract";
type _Output1455 = "semanticRelations";
type _Output1457 = "lemma";
type _Output1456 = _Output1457 | undefined;
type _Output1453 = {
	kind: _Output1454;
	aspect: _Output1455;
	relation: _Output413;
	targetKind?: _Output1456;
};
type _Output1459 = "morphologicalTree";
type _Output1458 = {
	kind: _Output1429;
	aspect: _Output1459;
	value: _Output569;
};
type _Output1461 = "lexicalBreakdown";
type _Output1460 = {
	kind: _Output1429;
	aspect: _Output1461;
	value: _Output516;
};
type _Output1463 = "Retract";
type _Output1464 = "morphologicalTree" | "lexicalBreakdown";
type _Output1462 = { kind: _Output1463; aspect: _Output1464 };
type _Output1427 =
	| _Output1428
	| _Output1431
	| _Output1433
	| _Output1435
	| _Output1438
	| _Output1443
	| _Output1448
	| _Output1453
	| _Output1458
	| _Output1460
	| _Output1462;
export type KnowledgeSettings = _Output0;
export type KnowledgeRequestMask = _Output7;
export type KnowledgeSelectionInput = _Output14;
export type DirectSemanticRelation = _Output413;
export type TranslationLanguage = _Output414;
export type UnitShadow = _Output415;
export type LexicalBreakdown = _Output516;
export type MorphologicalTree = _Output569;
export type PendingSemanticRelation = _Output812;
export type SemanticRelations = _Output813;
export type ReadingKnowledge = _Output1415;
export type KnowledgeChange = _Output1427;
