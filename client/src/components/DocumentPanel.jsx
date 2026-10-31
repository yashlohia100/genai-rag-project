import { useRef, useState } from 'react';
import * as api from '../api.js';

export default function DocumentPanel({ documents, setDocuments, excludedIds, onToggle, onError }) {
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);

  async function handleFiles(files) {
    setUploading(true);
    try {
      for (const file of files) {
        const doc = await api.uploadDocument(file);
        setDocuments((docs) => [...docs, doc]);
      }
    } catch (err) {
      onError(err.message);
    } finally {
      setUploading(false);
      fileInput.current.value = '';
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteDocument(id);
      setDocuments((docs) => docs.filter((d) => d.id !== id));
    } catch (err) {
      onError(err.message);
    }
  }

  return (
    <aside className="sidebar">
      <h1>DocMind</h1>
      <label className={`upload ${uploading ? 'disabled' : ''}`}>
        {uploading ? 'Processing…' : '+ Upload documents'}
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.markdown,.csv,.json,.html"
          disabled={uploading}
          onChange={(e) => handleFiles([...e.target.files])}
        />
      </label>
      <p className="hint">PDF, Markdown or text files</p>

      {documents.length > 0 && <h2 className="section-title">Search in</h2>}
      <ul className="doc-list">
        {documents.map((doc) => (
          <li key={doc.id}>
            <label className="doc-toggle">
              <input type="checkbox" checked={!excludedIds.has(doc.id)} onChange={() => onToggle(doc.id)} />
              <div>
                <div className="doc-name" title={doc.name}>{doc.name}</div>
                <div className="doc-meta">{doc.chunkCount} chunks</div>
              </div>
            </label>
            <button className="link" onClick={() => handleDelete(doc.id)} aria-label={`Delete ${doc.name}`}>
              ✕
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
