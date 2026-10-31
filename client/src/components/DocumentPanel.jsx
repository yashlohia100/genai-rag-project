import { useRef, useState } from 'react';
import * as api from '../api.js';

export default function DocumentPanel({ documents, setDocuments, onError }) {
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

      <ul className="doc-list">
        {documents.map((doc) => (
          <li key={doc.id}>
            <div>
              <div className="doc-name" title={doc.name}>{doc.name}</div>
              <div className="doc-meta">{doc.chunkCount} chunks</div>
            </div>
            <button className="link" onClick={() => handleDelete(doc.id)} aria-label={`Delete ${doc.name}`}>
              ✕
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
