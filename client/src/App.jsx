import { useEffect, useState } from 'react';
import * as api from './api.js';
import Chat from './components/Chat.jsx';
import DocumentPanel from './components/DocumentPanel.jsx';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listDocuments().then(setDocuments).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="app">
      <DocumentPanel documents={documents} setDocuments={setDocuments} onError={setError} />
      <main className="main">
        {error && (
          <div className="error" role="alert">
            {error}
            <button className="link" onClick={() => setError('')}>Dismiss</button>
          </div>
        )}
        <Chat hasDocuments={documents.length > 0} onError={setError} />
      </main>
    </div>
  );
}
