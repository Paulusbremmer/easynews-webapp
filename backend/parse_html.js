const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('en.html', 'utf8');
const $ = cheerio.load(html);
$('input[type="text"]').each((i, el) => {
  console.log('Text input:', $(el).attr('name'), $(el).attr('id'));
});
