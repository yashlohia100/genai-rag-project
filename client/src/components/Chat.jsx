import { useEffect, useRef, useState } from 'react';
import * as api from '../api.js';

export default function Chat({ hasDocuments, documentIds, onError }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Apply a change to the assistant message currently being streamed (always the last one).
  const updateLast = (fn) => setMessages((msgs) => [...msgs.slice(0, -1), fn(msgs.at(-1))]);

  async function send(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;

    const history = [...messages.map(({ role, content }) => ({ role, content })), { role: 'user', content: question }];
    setMessages((msgs) => [...msgs, { role: 'user', content: question }, { role: 'assistant', content: '', sources: [] }]);
    setInput('');
    setBusy(true);

    try {
      await api.streamChat(history, documentIds, (event) => {
        if (event.type === 'sources') updateLast((m) => ({ ...m, sources: event.sources }));
        if (event.type === 'token') updateLast((m) => ({ ...m, content: m.content + event.text }));
        if (event.type === 'error') throw new Error(event.message);
      });
    } catch (err) {
      onError(err.message);
      setMessages((msgs) => msgs.slice(0, -2));
      setInput(question);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="messages">
        {messages.length === 0 && (
          <div className="empty">
            {hasDocuments ? 'Ask a question about your documents.' : 'Upload a document to get started.'}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <div className="bubble">{m.content || (busy && i === messages.length - 1 ? '…' : '')}</div>
            {m.sources?.length > 0 && <Sources sources={m.sources} />}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="composer" onSubmit={send}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your documents…"
          disabled={busy}
          autoFocus
        />
        <button type="submit" disabled={busy || !input.trim()}>Send</button>
      </form>
    </>
  );
}

function Sources({ sources }) {
  return (
    <details className="sources">
      <summary>Sources ({sources.length})</summary>
      <ol>
        {sources.map((s, i) => (
          <li key={i}>
            <div className="source-meta">
              [{i + 1}] {s.docName} · chunk {s.chunkIndex} · similarity {s.score.toFixed(3)}
            </div>
            <div className="source-text">{s.text}</div>
          </li>
        ))}
      </ol>
    </details>
  );
}
