import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
	const [searchTerm, setSearchTerm] = useState('');
	const [newsapiResults, setNewsapiResults] = useState([]);
	const [googleResults, setGoogleResults] = useState([]);
	const [loadingNewsapi, setLoadingNewsapi] = useState(false);
	const [loadingGoogle, setLoadingGoogle] = useState(false);
	const [errorNewsapi, setErrorNewsapi] = useState('');
	const [errorGoogle, setErrorGoogle] = useState('');
	const [showPanel, setShowPanel] = useState(false);

	const handleSearch = async (e) => {
		e.preventDefault();
		if (!searchTerm.trim()) return;
		setLoadingNewsapi(true);
		setLoadingGoogle(true);
		setErrorNewsapi('');
		setErrorGoogle('');
		setShowPanel(false);
		try {
			const res = await fetch(`/api/search-all?q=${encodeURIComponent(searchTerm)}`);
			if (!res.ok) throw new Error('Failed to fetch');
			const data = await res.json();
			// backend returns { newsapi: [...], google: [...] } or errors per key
			if (data.newsapi && Array.isArray(data.newsapi)) setNewsapiResults(data.newsapi);
			else if (data.newsapi && data.newsapi.error) setErrorNewsapi(data.newsapi.error || 'Error');
			if (data.google && Array.isArray(data.google)) setGoogleResults(data.google);
			else if (data.google && data.google.error) setErrorGoogle(data.google.error || 'Error');
			setShowPanel(true);
		} catch (err) {
			setErrorNewsapi('Error fetching news');
			setErrorGoogle('Error fetching news');
			setNewsapiResults([]);
			setGoogleResults([]);
			setShowPanel(false);
		} finally {
			setLoadingNewsapi(false);
			setLoadingGoogle(false);
		}
	};

	return (
		<div style={{ minHeight: '100vh', paddingBottom: '200px' }}>
			<form onSubmit={handleSearch} style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
				<input
					type="text"
					value={searchTerm}
					onChange={e => setSearchTerm(e.target.value)}
					placeholder="Type a keyword and search news..."
					style={{ fontSize: '1.2rem', padding: '0.5rem', width: '300px', borderRadius: '4px', border: '1px solid #ccc' }}
				/>
				<button
					type="submit"
					disabled={loadingNewsapi || loadingGoogle}
					style={{ marginLeft: '1rem', fontSize: '1.2rem', padding: '0.5rem 1.5rem', borderRadius: '4px', border: 'none', background: '#007acc', color: 'white', cursor: (loadingNewsapi || loadingGoogle) ? 'not-allowed' : 'pointer' }}
				>
					{(loadingNewsapi || loadingGoogle) ? 'Searching...' : 'Search'}
				</button>
			</form>
			{(errorNewsapi || errorGoogle) && (
				<div style={{ color: 'red', textAlign: 'center' }}>
					{errorNewsapi && <div>NewsAPI: {errorNewsapi}</div>}
					{errorGoogle && <div>Google: {errorGoogle}</div>}
				</div>
			)}
			{showPanel && (
				<div style={{
					display: 'flex',
					gap: '2rem',
					position: 'fixed',
					left: 0,
					right: 0,
					bottom: 0,
					background: '#fff',
					borderTop: '2px solid #007acc',
					boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
					maxHeight: '60vh',
					overflowY: 'auto',
					zIndex: 1000,
					padding: '1.5rem 2rem',
				}}>
					<div style={{ flex: 1 }}>
						<h3 style={{ margin: 0, marginBottom: '1rem', color: '#007acc' }}>NewsAPI (Reuters…)</h3>
						{loadingNewsapi && <div>Loading...</div>}
						{!loadingNewsapi && newsapiResults.length === 0 && <div>No results found.</div>}
						<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
							{newsapiResults.map((a, i) => (
								<li key={i} style={{ marginBottom: '1.5rem' }}>
									<div style={{ fontSize: '0.95rem', color: '#666', marginBottom: '0.2rem' }}>
										{a.source} &bull; {a.publishedAt ? new Date(a.publishedAt).toLocaleString() : ''}
									</div>
									<div>
										<a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '1.1rem', color: '#007acc', textDecoration: 'underline' }}>{a.title}</a>
									</div>
								</li>
							))}
						</ul>
					</div>
					<div style={{ width: '1px', background: '#eee' }} />
					<div style={{ flex: 1 }}>
						<h3 style={{ margin: 0, marginBottom: '1rem', color: '#007acc' }}>Google News</h3>
						{loadingGoogle && <div>Loading...</div>}
						{!loadingGoogle && googleResults.length === 0 && <div>No results found.</div>}
						<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
							{googleResults.map((a, i) => (
								<li key={i} style={{ marginBottom: '1.5rem' }}>
									<div style={{ fontSize: '0.95rem', color: '#666', marginBottom: '0.2rem' }}>
										{a.source} &bull; {a.publishedAt ? new Date(a.publishedAt).toLocaleString() : ''}
									</div>
									<div>
										<a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '1.1rem', color: '#007acc', textDecoration: 'underline' }}>{a.title}</a>
									</div>
								</li>
							))}
						</ul>
					</div>
				</div>
			)}
		</div>
	);
}
