const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('search.html', 'utf8');
const $ = cheerio.load(html);
$('input[type="text"]').each((i, el) => {
  console.log('TextInput:', $(el).attr('name'), $(el).parent().text().trim());
});
$('select').each((i, el) => {
  console.log('Select:', $(el).attr('name'));
});
