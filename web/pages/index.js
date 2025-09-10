import { useState } from 'react';
import Head from 'next/head';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const [freeText, setFreeText] = useState('');
  const [topics, setTopics] = useState([]);
  const [feedData, setFeedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const extractTopics = async () => {
    if (!freeText.trim()) {
      setError('Please enter some text to extract topics');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ freeText }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract topics');
      }

      const data = await response.json();
      setTopics(data.topics);
    } catch (err) {
      setError('Error extracting topics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeed = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/feed`);

      if (!response.ok) {
        throw new Error('Failed to fetch feed');
      }

      const data = await response.json();
      setFeedData(data);
    } catch (err) {
      setError('Error fetching feed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderArticleGroup = (title, articles) => {
    if (!articles || articles.length === 0) return null;

    return (
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ 
          color: '#333', 
          borderBottom: '2px solid #007acc',
          paddingBottom: '0.5rem',
          marginBottom: '1rem'
        }}>
          {title} ({articles.length})
        </h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {articles.map((article, index) => (
            <div key={index} style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '1rem',
              backgroundColor: '#f9f9f9'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
                <a href={article.link} target="_blank" rel="noopener noreferrer" 
                   style={{ textDecoration: 'none', color: '#007acc' }}>
                  {article.title}
                </a>
              </h4>
              <div style={{ 
                fontSize: '0.9rem', 
                color: '#666',
                marginBottom: '0.5rem'
              }}>
                <strong>Source:</strong> {article.source} | 
                <strong> Date:</strong> {formatDate(article.date)}
              </div>
              {article.description && (
                <p style={{ 
                  margin: '0', 
                  fontSize: '0.9rem',
                  lineHeight: '1.4'
                }}>
                  {article.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '2rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      <Head>
        <title>YourNews - Get the news you want, minus the noise</title>
        <meta name="description" content="Personalized news feed based on your interests" />
      </Head>

      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ 
          color: '#333', 
          fontSize: '2.5rem',
          marginBottom: '0.5rem'
        }}>
          YourNews
        </h1>
        <p style={{ 
          color: '#666', 
          fontSize: '1.1rem',
          margin: '0'
        }}>
          Get the news you want, minus the noise
        </p>
      </header>

      <main>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#333', marginBottom: '1rem' }}>
            Step 1: Tell us what interests you
          </h2>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Enter text about topics you're interested in... (e.g., technology, artificial intelligence, climate change, sports)"
            style={{
              width: '100%',
              height: '120px',
              padding: '1rem',
              border: '2px solid #ddd',
              borderRadius: '8px',
              fontSize: '1rem',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
          <button
            onClick={extractTopics}
            disabled={loading}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Extracting...' : 'Extract Topics'}
          </button>
        </div>

        {topics.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#333', marginBottom: '1rem' }}>
              Extracted Topics:
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {topics.map((topic, index) => (
                <span key={index} style={{
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '16px',
                  fontSize: '0.9rem',
                  border: '1px solid #bbdefb'
                }}>
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#333', marginBottom: '1rem' }}>
            Step 2: Get your personalized news feed
          </h2>
          <button
            onClick={fetchFeed}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Fetching...' : 'Fetch Feed'}
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '2rem',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        {feedData && (
          <div>
            <h2 style={{ color: '#333', marginBottom: '1rem' }}>
              News Feed ({feedData.total} articles)
            </h2>
            
            {feedData.topics.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>
                  Filtered by topics: {feedData.topics.join(', ')}
                </p>
              </div>
            )}

            {renderArticleGroup('Highly Relevant', feedData.groups.highly_relevant)}
            {renderArticleGroup('Somewhat Relevant', feedData.groups.somewhat_relevant)}
            {renderArticleGroup('Other News', feedData.groups.other)}

            {feedData.total === 0 && (
              <p style={{ 
                color: '#666', 
                fontStyle: 'italic',
                textAlign: 'center',
                padding: '2rem'
              }}>
                No articles found matching your topics. Try extracting topics first or check back later for new content.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}