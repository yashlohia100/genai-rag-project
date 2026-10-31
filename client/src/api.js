async function request(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

export const listDocuments = () => request('/api/documents');

export function uploadDocument(file) {
  const form = new FormData();
  form.append('file', file);
  return request('/api/documents', { method: 'POST', body: form });
}

export const deleteDocument = (id) => request(`/api/documents/${id}`, { method: 'DELETE' });

/**
 * POST the conversation and read the streamed response.
 * The server sends one JSON object per line; we split on newlines and call
 * `onEvent` for each complete line as soon as it arrives.
 */
export async function streamChat(messages, onEvent) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.trim()) onEvent(JSON.parse(line));
    }
  }
}
