const started=performance.now();
const mode=process.argv[2];
const mod=await import('./'+mode+'.mjs');
if(process.argv[3]==='parse') {
 if(mode==='noun') {
  const result=mod.schema.safeParse({core:{gender:'Masc',hyph:null},inflectional:{case:'Nom',number:'Sing'}});
  if(!result.success) throw result.error;
 } else if(mode==='oldParser') {
  // Import cost only here: complete legacy input tested separately.
 }
}
console.log(JSON.stringify({rss:process.resourceUsage().maxRSS,elapsed:performance.now()-started,heap:process.memoryUsage().heapUsed}));
