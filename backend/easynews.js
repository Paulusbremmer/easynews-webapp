const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const USERNAME = process.env.EASYNEWS_USERNAME || '745861@eweka.nl';
const PASSWORD = process.env.EASYNEWS_PASSWORD || 'mxhgfqtilw';

const axiosInstance = axios.create({
  auth: {
    username: USERNAME,
    password: PASSWORD
  },
  maxRedirects: 5
});

/**
 * Searches Easynews for the given query and returns an array of media results.
 */
async function searchEasynews(query, page = 1, filters = {}) {
  try {
    const searchUrl = `https://members.easynews.com/1.0/global5/search.html`;
    const params = {
      gps: query,
      'fty[]': 'VIDEO',
      'sS': 2,
      'pby': 100,
      'pno': page
    };
    if (filters.d1t) params['d1t'] = filters.d1t;
    if (filters.rn1t) params['rn1t'] = filters.rn1t;
    if (filters.b1t) params['b1t'] = filters.b1t;
    if (filters.from) params['from'] = filters.from;
    if (filters.fil) params['fil'] = filters.fil;
    
    const response = await axiosInstance.get(searchUrl, { params });

    const html = response.data;
    const $ = cheerio.load(html);
    const results = [];

    // In sS=2 layout, each result is inside a table > tr.rRow1/rRow2
    $('tr.rRow1, tr.rRow2').each((i, el) => {
      // Get the download link from the subjTarget anchor
      const subjectLink = $(el).find('a[target="subjTarget"]').first();
      let href = subjectLink.attr('href');
      
      if (href && href.includes('/dl/')) {
        if (!href.startsWith('http')) {
          href = `https://members.easynews.com${href}`;
        }

        // Get title and extension from the checkbox value (HASH|TITLE|.EXT)
        const inputValue = $(el).find('input.checkbox').val() || '';
        const parts = inputValue.split('|');
        const title = parts.length > 1 ? parts[1].trim() : 'Unknown Title';
        const extension = parts.length > 2 ? parts[2].replace('.', '').toLowerCase() : 'unknown';

        // Get thumbnail image and convert pr- to th- for higher resolution
        let thumbImg = $(el).find('img.thumb').attr('src');
        if (thumbImg) {
          thumbImg = thumbImg.replace(/\/pr-/g, '/th-');
        }
        
        // Extract size and date using regex on the raw text of the cell
        const cellText = $(el).text();
        const sizeMatch = cellText.match(/(\d+(?:\.\d+)?)\s*(MB|GB|KB|B)/i);
        let size = '';
        let sizeBytes = 0;
        if (sizeMatch) {
          size = `${sizeMatch[1]} ${sizeMatch[2]}`;
          const val = parseFloat(sizeMatch[1]);
          const unit = sizeMatch[2].toUpperCase();
          if (unit === 'GB') sizeBytes = val * 1024 * 1024 * 1024;
          else if (unit === 'MB') sizeBytes = val * 1024 * 1024;
          else if (unit === 'KB') sizeBytes = val * 1024;
          else sizeBytes = val;
        }
        
        const dateMatch = cellText.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/);
        const date = dateMatch ? dateMatch[1] : '';
        const timestamp = date ? new Date(date).getTime() : 0;

        results.push({
          title: title,
          url: href,
          size: size,
          sizeBytes: sizeBytes,
          date: date,
          timestamp: timestamp,
          extension: extension,
          thumbUrl: thumbImg || null
        });
      }
    });

    // Filter out parts/rars if necessary, we want playable video files
    return results.filter(r => 
      !r.extension.includes('rar') && !r.extension.includes('par2') && !r.extension.includes('zip')
    );

  } catch (error) {
    console.error("Error scraping Easynews:", error.message);
    throw error;
  }
}

module.exports = {
  searchEasynews
};
