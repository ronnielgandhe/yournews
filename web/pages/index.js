import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
	const [searchTerm, setSearchTerm] = useState('');
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [showPanel, setShowPanel] = useState(false);

	const handleSearch = async (e) => {
		e.preventDefault();
		if (!searchTerm.trim()) return;
		setLoading(true);
		setError('');
		setShowPanel(false);
		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
			if (!res.ok) throw new Error('Failed to fetch');
			const data = await res.json();
			setResults(data.articles || []);
			setShowPanel(true);
		} catch (err) {
			setError('Error fetching news');
			setResults([]);
			setShowPanel(false);
		} finally {
			setLoading(false);
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
					disabled={loading}
					style={{ marginLeft: '1rem', fontSize: '1.2rem', padding: '0.5rem 1.5rem', borderRadius: '4px', border: 'none', background: '#007acc', color: 'white', cursor: loading ? 'not-allowed' : 'pointer' }}
				>
					{loading ? 'Searching...' : 'Search'}
				</button>
			</form>
			{error && <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>}
			{showPanel && (
				<div style={{
					position: 'fixed',
					left: 0,
					right: 0,
					bottom: 0,
					background: '#fff',
					borderTop: '2px solid #007acc',
					boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
					maxHeight: '40vh',
					overflowY: 'auto',
					zIndex: 1000,
					padding: '1.5rem 2rem',
				}}>
					<h3 style={{ margin: 0, marginBottom: '1rem', color: '#007acc' }}>Headlines</h3>
					{results.length === 0 && <div>No results found.</div>}
					<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
						{results.map((a, i) => (
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
			)}
		</div>
	);
}
