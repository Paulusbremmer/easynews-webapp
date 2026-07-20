import os
import requests
import urllib.parse
import subprocess
from flask import Flask, request, jsonify, render_template, Response, stream_with_context, redirect

app = Flask(__name__)

EASYNEWS_USER = "745861@eweka.nl"
EASYNEWS_PASS = "mxhgfqtilw"
BASE_URL = "https://members.easynews.com"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/search')
def search():
    query = request.args.get('q', '')
    if not query:
        return jsonify([])

    params = {
        'st': 'adv',
        'sb': '1',
        'fex': 'mp4,mkv,avi,wmv,mov,m4v',
        'fty[]': 'VIDEO',
        'spamf': '1',
        'u': '1',
        'gx': '1',
        'pno': '1',
        'sS': '3',
        's1': 'dsize',
        's1d': '-',
        's2': 'relevance',
        's2d': '-',
        's3': 'dtime',
        's3d': '-',
        'pby': '100',
        'safeO': '0',
        'gps': query,
    }
    
    url = f"{BASE_URL}/2.0/search/solr-search/advanced"
    
    try:
        response = requests.get(url, params=params, auth=(EASYNEWS_USER, EASYNEWS_PASS), timeout=10)
        response.raise_for_status()
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        
    data = response.json()
    results = []
    
    down_url = data.get("downURL", f"{BASE_URL}/dl")
    dl_farm = data.get("dlFarm", "auto")
    dl_port = data.get("dlPort", "443")
    
    for item in data.get("data", []):
        post_hash = item.get("0", "")
        post_title = item.get("10", "")
        ext = item.get("11", "")
        size = item.get("4", "")
        
        # Build the URL that requires auth
        stream_path = f"{post_hash}{ext}/{urllib.parse.quote(post_title)}{ext}"
        auth_url = f"{down_url}/{dl_farm}/{dl_port}/{stream_path}"
        
        results.append({
            'title': post_title,
            'ext': ext,
            'size': size,
            'auth_url': auth_url,
            'hash': post_hash
        })
        
    return jsonify(results)

@app.route('/stream')
def stream():
    auth_url = request.args.get('url')
    ext = request.args.get('ext', '').lower()
    
    # 1. Get the redirect URL from Easynews so we don't need basic auth in the browser
    try:
        # We use allow_redirects=False to catch the Location header
        head_resp = requests.head(auth_url, auth=(EASYNEWS_USER, EASYNEWS_PASS), allow_redirects=False, timeout=5)
        if head_resp.status_code in (301, 302):
            final_url = head_resp.headers.get('Location')
        else:
            final_url = auth_url.replace("https://", f"https://{urllib.parse.quote(EASYNEWS_USER)}:{urllib.parse.quote(EASYNEWS_PASS)}@")
    except Exception:
        return "Failed to resolve stream URL", 500

    # 2. Decide whether to transcode
    if ext in ['.mp4', '.webm']:
        # Browser supports it, just redirect
        return redirect(final_url)
    else:
        # Needs transcoding
        cmd = [
            'ffmpeg',
            '-i', final_url,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '28',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', 'frag_keyframe+empty_moov+faststart',
            '-f', 'mp4',
            'pipe:1'
        ]
        
        def generate():
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
            try:
                while True:
                    data = process.stdout.read(8192)
                    if not data:
                        break
                    yield data
            finally:
                process.kill()
                
        return Response(stream_with_context(generate()), mimetype='video/mp4')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8081)
