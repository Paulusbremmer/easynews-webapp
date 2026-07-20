const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('search.html', 'utf8');
const $ = cheerio.load(html);
$('input[type="text"]').each((i, el) => {
  const tr = $(el).closest('tr');
  console.log($(el).attr('name'), ':', tr.find('td').first().text().trim());
});
