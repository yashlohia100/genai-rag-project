import { useEffect, useState } from 'react';
import * as api from './api.js';
import Chat from './components/Chat.jsx';
import DocumentPanel from './components/DocumentPanel.jsx';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [excludedIds, setExcludedIds] = useState(() => new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    api.listDocuments().then(setDocuments).catch((err) => setError(err.message));
  }, []);

  function toggleDocument(id) {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // undefined = search every document; an array = only search these.
  const documentIds = documents.some((d) => excludedIds.has(d.id))
    ? documents.filter((d) => !excludedIds.has(d.id)).map((d) => d.id)
    : undefined;

  return (
    <div className="app">
      <DocumentPanel
        documents={documents}
        setDocuments={setDocuments}
        excludedIds={excludedIds}
        onToggle={toggleDocument}
        onError={setError}
      />
      <main className="main">
        {error && (
          <div className="error" role="alert">
            {error}
            <button className="link" onClick={() => setError('')}>Dismiss</button>
          </div>
        )}
        <Chat hasDocuments={documents.length > 0} documentIds={documentIds} onError={setError} />
      </main>
    </div>
  );
}
