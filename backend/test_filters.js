const axios = require('axios');
const cheerio = require('cheerio');

async function check() {
  try {
    const res = await axios.get('https://members.easynews.com/2.0/search/?s2=0', {
      headers: { 'Authorization': 'Basic ' + Buffer.from('745861@eweka.nl:mxhgfqtilw').toString('base64') }
    });
    const $ = cheerio.load(res.data);
    $('select').each((i, el) => {
      const name = $(el).attr('name');
      const options = [];
      $(el).find('option').each((j, opt) => {
        options.push($(opt).attr('value') + '=' + $(opt).text().trim());
      });
      console.log('SELECT:', name, options.slice(0, 5).join(', '));
    });
    $('input[type="text"]').each((i, el) => {
      console.log('TextInput:', $(el).attr('name'), $(el).attr('placeholder') || '');
    });
  } catch (err) {
    console.error(err.message);
  }
}
check();
