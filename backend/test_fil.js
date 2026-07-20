const { searchEasynews } = require('./easynews');
async function test() {
  const res = await searchEasynews('test', 1, { fil: '1080p' });
  console.log('Result 1 (fil=1080p):', res.length, res[0]?.title);
  
  const res2 = await searchEasynews('test', 1, { fil: '*1080p*' });
  console.log('Result 2 (fil=*1080p*):', res2.length, res2[0]?.title);
  
  const res3 = await searchEasynews('test', 1, { fil: 'DOESNOTEXISTXYZ' });
  console.log('Result 3 (fil=DOESNOTEXIST):', res3.length);
}
test().catch(console.error);
