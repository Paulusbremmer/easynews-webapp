import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Search, Play, X, Film, Image as ImageIcon, ArrowDown, ArrowUp, Download } from 'lucide-react';
import './index.css';

const API_BASE = window.location.origin;

const Poster = ({ title, thumbUrl }) => {
  return (
    <div className="poster-container flex items-center justify-center">
      {thumbUrl ? (
        <img 
          src={thumbUrl} 
          alt={title} 
          className="poster-img" 
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
          <ImageIcon size={48} opacity={0.3} />
        </div>
      )}
    </div>
  );
};

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeStream, setActiveStream] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [runtimeFilter, setRuntimeFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [posterFilter, setPosterFilter] = useState('');
  const [filenameFilter, setFilenameFilter] = useState('');
  
  const [sortBy, setSortBy] = useState('relevance');
  const [sortDesc, setSortDesc] = useState(true);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query && !posterFilter && !filenameFilter) return;
    
    setLoading(true);
    setResults([]);
    setPage(1);
    setHasMore(true);
    
    try {
      const queryParams = new URLSearchParams({
        q: query,
        page: 1,
        d1t: dateFilter,
        rn1t: runtimeFilter,
        b1t: sizeFilter,
        from: posterFilter,
        fil: filenameFilter
      }).toString();
      const res = await axios.get(`${API_BASE}/api/search?${queryParams}`);
      setResults(res.data);
      if (res.data.length < 100) setHasMore(false);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const queryParams = new URLSearchParams({
        q: query,
        page: nextPage,
        d1t: dateFilter,
        rn1t: runtimeFilter,
        b1t: sizeFilter,
        from: posterFilter,
        fil: filenameFilter
      }).toString();
      const res = await axios.get(`${API_BASE}/api/search?${queryParams}`);
      if (res.data.length > 0) {
        setResults(prev => [...prev, ...res.data]);
        setPage(nextPage);
      }
      if (res.data.length < 100) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Load more failed:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMoreRef = useRef();
  loadMoreRef.current = loadMore;

  const observer = useRef();
  const observerTarget = useCallback(node => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreRef.current();
      }
    }, { rootMargin: '400px' });
    
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore]);

  const sortedResults = useMemo(() => {
    if (sortBy === 'relevance') return results;
    
    return [...results].sort((a, b) => {
      let valA, valB;
      if (sortBy === 'size') {
        valA = a.sizeBytes || 0;
        valB = b.sizeBytes || 0;
      } else if (sortBy === 'date') {
        valA = a.timestamp || 0;
        valB = b.timestamp || 0;
      } else if (sortBy === 'filename') {
        valA = a.title.toLowerCase();
        valB = b.title.toLowerCase();
      }
      
      if (valA < valB) return sortDesc ? 1 : -1;
      if (valA > valB) return sortDesc ? -1 : 1;
      return 0;
    });
  }, [results, sortBy, sortDesc]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(field);
      setSortDesc(true); // Default to descending when newly selected
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortDesc ? <ArrowDown size={14} style={{marginLeft: 4}} /> : <ArrowUp size={14} style={{marginLeft: 4}} />;
  };

  const handlePlay = (result) => {
    // Generate stream URL with backend proxy/transcoder
    const streamUrl = `${API_BASE}/stream?url=${encodeURIComponent(result.url)}&ext=${result.extension}`;
    setActiveStream(streamUrl);
  };

  return (
    <div className="app-container">
      <header>
        <h1><Film style={{display: 'inline', marginRight: '10px'}} size={36}/>Easynews Streamer</h1>
        {/Windows/i.test(navigator.userAgent) && (
          <div style={{ fontSize: '0.85rem', marginTop: '-10px', marginBottom: '20px' }}>
            <a href={`${API_BASE}/windows-vlc.reg?base=${encodeURIComponent(API_BASE)}&t=${Date.now()}`} style={{ color: 'var(--accent)', textDecoration: 'underline' }} download>
              Download Windows 1-Click VLC Setup (.reg)
            </a>
          </div>
        )}
      </header>

      <div className="sort-bar" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <form className="search-container" onSubmit={handleSearch} style={{ margin: '0', display: 'flex', flexGrow: 1, maxWidth: '100%', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="search-input"
            placeholder="Search Subject / NZB Name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flexGrow: 1, minWidth: '200px' }}
          />
          <input
            type="text"
            className="search-input"
            placeholder="Poster (optional)"
            value={posterFilter}
            onChange={(e) => setPosterFilter(e.target.value)}
            style={{ width: '150px', borderLeft: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
          />
          <input
            type="text"
            className="search-input"
            placeholder="Filename (optional)"
            value={filenameFilter}
            onChange={(e) => setFilenameFilter(e.target.value)}
            style={{ width: '150px', borderLeft: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
          />
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ padding: '0 10px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }}
          >
            <option value="">Any Date</option>
            <option value="6">Past 24 hours</option>
            <option value="12">Past week</option>
            <option value="15">Past month</option>
            <option value="22">Past 6 months</option>
            <option value="28">Past year</option>
          </select>
          <select 
            value={runtimeFilter} 
            onChange={(e) => setRuntimeFilter(e.target.value)}
            style={{ padding: '0 10px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }}
          >
            <option value="">Any Runtime</option>
            <option value="2">&gt; 10 mins</option>
            <option value="3">&gt; 30 mins</option>
            <option value="4">&gt; 60 mins</option>
            <option value="5">&gt; 90 mins</option>
            <option value="6">&gt; 30 hours (1800m)</option>
          </select>
          <select 
            value={sizeFilter} 
            onChange={(e) => setSizeFilter(e.target.value)}
            style={{ padding: '0 10px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }}
          >
            <option value="">Any Size</option>
            <option value="16">&gt; 100 MB</option>
            <option value="20">&gt; 500 MB</option>
            <option value="22">&gt; 1 GB</option>
            <option value="24">&gt; 2 GB</option>
            <option value="28">&gt; 5 GB</option>
          </select>
          <button type="submit" className="search-btn" disabled={loading}>
            <Search size={20} />
          </button>
        </form>

        {results.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <span className="sort-label">Sort by:</span>
            <button className={`sort-btn ${sortBy === 'relevance' ? 'active' : ''}`} onClick={() => toggleSort('relevance')}>
              Relevance
            </button>
            <button className={`sort-btn ${sortBy === 'date' ? 'active' : ''}`} onClick={() => toggleSort('date')}>
              Date <SortIcon field="date" />
            </button>
            <button className={`sort-btn ${sortBy === 'size' ? 'active' : ''}`} onClick={() => toggleSort('size')}>
              Size <SortIcon field="size" />
            </button>
            <button className={`sort-btn ${sortBy === 'filename' ? 'active' : ''}`} onClick={() => toggleSort('filename')}>
              Name <SortIcon field="filename" />
            </button>
          </div>
        )}
      </div>

      {loading && <div className="loading">Searching Easynews...</div>}

      <main className="results-grid">
        {sortedResults.map((r, i) => {
          const isAndroid = /Android/i.test(navigator.userAgent);
          const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
          const isWindows = /Windows/i.test(navigator.userAgent);
          
          const b64Mrl = btoa(r.url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          const safeTitle = (r.title || 'video').replace(/[^a-z0-9]/gi, '_');
          const safeFilename = encodeURIComponent(`${safeTitle}.${r.extension}`);
          const proxyUrl = `${API_BASE}/vlc-proxy/${b64Mrl}/${safeFilename}`;

          let vlcHref = `${API_BASE}/vlc.m3u?url=${encodeURIComponent(r.url)}&title=${encodeURIComponent(r.title)}`;
          if (isAndroid) {
            vlcHref = `${API_BASE}/vlc-android?url=${encodeURIComponent(r.url)}`;
          } else if (isIOS) {
            vlcHref = `${API_BASE}/vlc-app?url=${encodeURIComponent(r.url)}`;
          } else if (isWindows) {
            vlcHref = `vlc:${proxyUrl}`;
          }

          return (
            <div key={i} className="result-card">
              <Poster title={r.title} thumbUrl={r.thumbUrl} url={r.url} />
              <div className="result-content">
                <h3 className="result-title">{r.title}</h3>
                <div className="result-meta">
                  <span>{r.size} • {r.date}</span>
                  <span className="ext-badge">{r.extension}</span>
                </div>
                <div className="action-buttons" style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button className="play-btn" onClick={() => handlePlay(r)} style={{ flex: 1, padding: '8px 4px', fontSize: '0.9rem' }}>
                    <Play size={16} /> Play
                  </button>
                  <a 
                    className="play-btn" 
                    href={vlcHref}
                    style={{ background: '#ff7300', textDecoration: 'none', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 4px', fontSize: '0.9rem' }}
                  >
                    <Play size={16} /> VLC
                  </a>
                  <a 
                    className="play-btn" 
                    href={`${proxyUrl}?download=1`}
                    download
                    style={{ background: '#28a745', textDecoration: 'none', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 4px', fontSize: '0.9rem' }}
                  >
                    <Download size={16} /> Save
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {results.length > 0 && hasMore && (
        <div className="load-more-container" ref={observerTarget}>
          <button className="load-more-btn" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Loading next results...'}
          </button>
        </div>
      )}

      {activeStream && (
        <div className="player-overlay" onClick={() => setActiveStream(null)}>
          <div className="player-container" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setActiveStream(null)}>
              <X size={24} />
            </button>
            <video 
              src={activeStream} 
              controls 
              autoPlay 
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
