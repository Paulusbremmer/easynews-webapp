const { searchEasynews } = require('./easynews');
async function test() {
  const res = await searchEasynews('', 1, { fil: '*1080p*' });
  console.log('Result (gps="", fil=*1080p*):', res.length);
}
test().catch(console.error);
