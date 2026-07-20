const { searchEasynews } = require('./easynews');
async function test() {
  const res1 = await searchEasynews('*Mandalorian*S01*', 1, {});
  console.log('Result gps:', res1.length, res1[0]?.title);
}
test().catch(console.error);
