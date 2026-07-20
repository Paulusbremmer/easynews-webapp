const axios = require('axios');
const cheerio = require('cheerio');
axios.get('https://members.easynews.com/1.0/global5/search.html', {
  auth: { username: '745861@eweka.nl', password: 'mxhgfqtilw' }
}).then(res => {
  const $ = cheerio.load(res.data);
  console.log("rn1t HTML:", $('[name="rn1t"]').html());
  console.log("b1t HTML:", $('[name="b1t"]').html());
}).catch(console.error);
