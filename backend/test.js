const { searchEasynews } = require('./easynews');

(async () => {
  try {
    const results = await searchEasynews('Big Buck Bunny');
    console.log(JSON.stringify(results.slice(0, 5), null, 2));
  } catch (err) {
    console.error(err);
  }
})();
