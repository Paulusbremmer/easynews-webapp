const { searchEasynews } = require('./easynews');
async function test() {
  const res = await searchEasynews('test', 1, { fil: '080p' });
  console.log('Result 4 (fil=080p):', res.length, res[0]?.title);
  
  const res2 = await searchEasynews('test', 1, { fil: '*080p*' });
  console.log('Result 5 (fil=*080p*):', res2.length, res2[0]?.title);
}
test().catch(console.error);
