const express = require('express');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const { searchEasynews } = require('./easynews');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());

const USERNAME = process.env.EASYNEWS_USERNAME || '745861@eweka.nl';
const PASSWORD = process.env.EASYNEWS_PASSWORD || 'mxhgfqtilw';
const authHeader = 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  const page = parseInt(req.query.page) || 1;
  const filters = {
    d1t: req.query.d1t || '',
    rn1t: req.query.rn1t || '',
    b1t: req.query.b1t || '',
    from: req.query.from || '',
    fil: req.query.fil || ''
  };

  if (!query && !filters.fil && !filters.from) {
    return res.status(400).json({ error: 'Missing search criteria' });
  }

  try {
    const results = await searchEasynews(query, page, filters);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/thumbnail', (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('Missing url parameter');

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  ffmpeg(videoUrl)
    .inputOptions([
      '-headers',
      `Authorization: ${authHeader}\r\n`
    ])
    .seekInput(15) // Seek to 15 seconds to avoid opening credits/black screens
    .frames(1)
    .format('image2')
    .on('error', (err) => {
      console.error('Thumbnail generation error:', err.message);
      if (!res.headersSent) res.status(500).send('Failed to generate thumbnail');
    })
    .pipe(res, { end: true });
});

app.get('/vlc.m3u', (req, res) => {
  const videoUrl = req.query.url;
  const title = req.query.title || 'Easynews Video';
  if (!videoUrl) return res.status(400).send('Missing url parameter');

  try {
    const urlObj = new URL(videoUrl);
    urlObj.username = '745861@eweka.nl';
    urlObj.password = 'mxhgfqtilw';

    const m3u = `#EXTM3U\n#EXTINF:-1,${title}\n${urlObj.toString()}\n`;
    
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/[^a-z0-9]/gi, '_')}.m3u"`);
    res.send(m3u);
  } catch (err) {
    res.status(500).send('Invalid URL');
  }
});

app.get('/vlc-app', (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('Missing url parameter');

  try {
    const urlObj = new URL(videoUrl);
    urlObj.username = '745861@eweka.nl';
    urlObj.password = 'mxhgfqtilw';
    
    // vlc://https://user:pass@host/path
    const vlcLink = `vlc://${urlObj.toString()}`;
    res.redirect(vlcLink);
  } catch (err) {
    res.status(500).send('Invalid URL');
  }
});

app.get('/vlc-android', (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('Missing url parameter');

  try {
    const urlObj = new URL(videoUrl);
    urlObj.username = '745861@eweka.nl';
    urlObj.password = 'mxhgfqtilw';
    
    // intent://user:pass@host/path#Intent;scheme=https;package=org.videolan.vlc;end;
    const intentLink = urlObj.toString().replace(/^https?:\/\//, 'intent://') + '#Intent;scheme=https;package=org.videolan.vlc;type=video/*;end;';
    res.redirect(intentLink);
  } catch (err) {
    res.status(500).send('Invalid URL');
  }
});

app.get('/vlc-redirect', (req, res) => {
  let mrl = req.query.mrl;
  if (!mrl) return res.status(400).send('Missing mrl parameter');

  // Strip potential quotes added by the OS
  mrl = mrl.replace(/^["']|["']$/g, '');
  // Strip vlc:// or vlc: or easynews-vlc://
  mrl = mrl.replace(/^(easynews-vlc|vlc):\/?\/?/i, '');

  try {
    const urlObj = new URL(mrl);
    // Remove embedded credentials if any
    urlObj.username = '';
    urlObj.password = '';
    const cleanUrl = urlObj.toString();

    // Extract filename from Easynews URL path
    const pathname = urlObj.pathname;
    let filename = pathname.split('/').pop() || 'video.mkv';
    
    // Base64 encode the cleanUrl so we don't need a query string
    const b64Mrl = Buffer.from(cleanUrl).toString('base64url');
    
    // We redirect to a route that strictly ends in the filename so VLC knows the container format!
    res.redirect(`/vlc-proxy/${b64Mrl}/${encodeURIComponent(filename)}`);
  } catch (err) {
    res.status(400).send('Invalid MRL');
  }
});

app.get('/vlc-proxy/:b64mrl/:filename', async (req, res) => {
  let mrl;
  try {
    mrl = Buffer.from(req.params.b64mrl, 'base64url').toString('utf8');
  } catch (err) {
    return res.status(400).send('Invalid base64 MRL');
  }
  if (!mrl) return res.status(400).send('Missing mrl parameter');

  try {
    const urlObj = new URL(mrl);
    const headers = {};
    if (req.headers.range) headers['Range'] = req.headers.range;
    
    if (urlObj.hostname.includes('easynews.com')) {
      headers['Authorization'] = authHeader;
    }

    const response = await axios({
      method: 'get',
      url: mrl,
      responseType: 'stream',
      headers: headers,
      maxRedirects: 5,
      validateStatus: () => true
    });

    if (response.headers['content-type']) res.setHeader('Content-Type', response.headers['content-type']);
    if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length']);
    if (response.headers['accept-ranges']) res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
    if (response.headers['content-range']) res.setHeader('Content-Range', response.headers['content-range']);
    
    const disposition = req.query.download ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${req.params.filename}"`);
    
    res.status(response.status);
    response.data.pipe(res);

    res.on('close', () => {
      if (response.data && typeof response.data.destroy === 'function') {
        response.data.destroy();
      }
    });
  } catch (err) {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) res.status(500).send('Proxy failed');
  }
});

app.get('/windows-vlc.reg', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  const host = req.get('host');
  const protocol = req.protocol;
  const apiBase = `${protocol}://${host}`;

  const regContent = `Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\\vlc]
@="URL:VLC Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\\vlc\\shell]
[HKEY_CLASSES_ROOT\\vlc\\shell\\open]
[HKEY_CLASSES_ROOT\\vlc\\shell\\open\\command]
@="\\"C:\\\\Program Files\\\\VideoLAN\\\\VLC\\\\vlc.exe\\" \\"${apiBase}/vlc-redirect?mrl=%1\\""

[HKEY_CLASSES_ROOT\\easynews-vlc]
@="URL:Easynews VLC Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\\easynews-vlc\\shell]
[HKEY_CLASSES_ROOT\\easynews-vlc\\shell\\open]
[HKEY_CLASSES_ROOT\\easynews-vlc\\shell\\open\\command]
@="\\"C:\\\\Program Files\\\\VideoLAN\\\\VLC\\\\vlc.exe\\" \\"${apiBase}/vlc-redirect?mrl=%1\\""
`;
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="vlc-protocol.reg"');
  res.send(regContent);
});

app.get('/stream', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('Missing url parameter');

  // We should determine if transcoding is needed based on extension
  const extension = req.query.ext || 'unknown';
  const needsTranscode = ['mkv', 'avi', 'ts', 'm2ts', 'wmv'].includes(extension.toLowerCase());

  try {
    if (needsTranscode) {
      console.log(`Transcoding stream for ${videoUrl}`);
      res.contentType('video/mp4');

      // We use fluent-ffmpeg to read from the URL and output fragmented MP4
      ffmpeg(videoUrl)
        .inputOptions([
          '-headers',
          `Authorization: ${authHeader}\r\n`
        ])
        .outputOptions([
          '-movflags frag_keyframe+empty_moov+default_base_moof',
          '-preset ultrafast',
          '-crf 28'
        ])
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4')
        .on('start', (commandLine) => {
          console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('error', (err, stdout, stderr) => {
          console.error('FFmpeg error:', err.message);
          console.error('FFmpeg stderr:', stderr);
          if (!res.headersSent) res.status(500).send('Transcoding failed');
        })
        .pipe(res, { end: true });

    } else {
      console.log(`Direct stream for ${videoUrl}`);
      // Proxy the stream directly to avoid exposing credentials and CORS issues
      // This allows Range headers to pass through so the browser can seek the video!
      const response = await axios({
        method: 'get',
        url: videoUrl,
        responseType: 'stream',
        headers: {
          'Authorization': authHeader,
          'Range': req.headers.range || 'bytes=0-'
        },
        validateStatus: (status) => status >= 200 && status < 300 || status === 306
      });

      // Pass along the headers for seeking (if server supports range requests)
      if (response.headers['content-type']) res.setHeader('Content-Type', response.headers['content-type']);
      if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length']);
      if (response.headers['accept-ranges']) res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
      if (response.headers['content-range']) res.setHeader('Content-Range', response.headers['content-range']);
      
      res.status(response.status);
      response.data.pipe(res);

      res.on('close', () => {
        if (response.data && typeof response.data.destroy === 'function') {
          response.data.destroy();
        }
      });
    }
  } catch (err) {
    console.error('Streaming error:', err.message);
    if (!res.headersSent) res.status(500).send('Streaming failed');
  }
});


const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Easynews backend listening on port ${PORT}`);
});
