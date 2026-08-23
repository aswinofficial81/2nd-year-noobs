import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  GitCommit,
  Clock,
  Users,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  reactions?: Record<string, string[]>;
}

interface CollabChatProps {
  activeBranch: string;
  currentPeer: string;
  peersList: Array<{ id: string; name: string; color: string }>;
  messages: ChatMessage[];
  onSendMessage: (text: string, author: string) => void;
  onReactMessage: (messageId: string, emoji: string) => void;
  onCommitCheckpoint: (message: string) => void;
}

const EMOJI_LIST = ['🚀', '🔥', '👍', '❤️', '💡', '🎉'];

export const CollabChat: React.FC<CollabChatProps> = ({
  activeBranch,
  currentPeer,
  peersList,
  messages,
  onSendMessage,
  onReactMessage,
  onCommitCheckpoint,
}) => {
  const [inputMsg, setInputMsg] = useState('');
  const [activeAuthor, setActiveAuthor] = useState(currentPeer);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    onSendMessage(inputMsg.trim(), activeAuthor);
    setInputMsg('');
  };

  const getAuthorPeer = (authorId: string) => {
    return (
      peersList.find((p) => p.id === authorId || p.name === authorId) || {
        id: authorId,
        name: authorId,
        color: '#6366f1',
      }
    );
  };

  return (
    <div className="glass-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div className="glass-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--indigo)' }}>
            <MessageSquare style={{ width: '18px', height: '18px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Collaborative Team Chat Channel
              <span className="badge badge-indigo">Causal CRDT Stream</span>
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Synchronized peer discussion on branch <b style={{ color: 'var(--emerald-light)' }}>{activeBranch}</b>
            </p>
          </div>
        </div>

        <button
          onClick={() => onCommitCheckpoint(`chore: checkpoint chat transcript on ${activeBranch}`)}
          className="btn btn-secondary btn-sm"
        >
          <GitCommit style={{ width: '13px', height: '13px', color: 'var(--cyan)' }} />
          <span>Checkpoint Chat Log</span>
        </button>
      </div>

      {/* Message Feed Window */}
      <div className="chat-window">
        <div className="chat-message-list">
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-dim)' }}>
              <MessageSquare style={{ width: '32px', height: '32px', margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
              <p style={{ fontSize: '0.875rem' }}>No messages in this branch room yet.</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Start collaborating by sending the first message below!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const peer = getAuthorPeer(msg.author);
              const isSelf = msg.author === currentPeer || msg.author === activeAuthor;

              return (
                <div key={msg.id} className={`chat-msg-row ${isSelf ? 'self' : ''}`}>
                  {/* Avatar */}
                  <div className="chat-avatar" style={{ backgroundColor: peer.color }}>
                    {peer.name[0].toUpperCase()}
                  </div>

                  {/* Message Bubble */}
                  <div className={`chat-bubble ${isSelf ? 'self' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {peer.name} {isSelf && <span style={{ color: 'var(--indigo-light)', fontWeight: 400 }}>(You)</span>}
                      </span>
                      <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Clock style={{ width: '10px', height: '10px' }} />
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.text}</p>

                    {/* Reactions */}
                    <div className="chat-reactions-row">
                      {Object.entries(msg.reactions || {}).map(([emoji, reactors]) => (
                        <button
                          key={emoji}
                          onClick={() => onReactMessage(msg.id, emoji)}
                          className="reaction-chip"
                          style={reactors.includes(currentPeer) ? { background: 'var(--indigo-glow)', borderColor: 'var(--indigo)' } : {}}
                        >
                          <span>{emoji}</span>
                          <span className="mono" style={{ fontWeight: 700 }}>{reactors.length}</span>
                        </button>
                      ))}

                      {/* Emoji Picker Pills */}
                      <div style={{ display: 'flex', gap: '0.2rem', marginLeft: 'auto', opacity: 0.8 }}>
                        {EMOJI_LIST.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => onReactMessage(msg.id, emoji)}
                            className="btn btn-icon btn-sm"
                            style={{ padding: '0.1rem 0.25rem', fontSize: '0.75rem' }}
                            title={`React with ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Composer */}
        <form onSubmit={handleSend} style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Users style={{ width: '13px', height: '13px', color: 'var(--indigo)' }} />
            <span>Send persona:</span>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {peersList.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveAuthor(p.id)}
                  style={{
                    background: activeAuthor === p.id ? 'var(--indigo)' : 'var(--bg-surface)',
                    color: activeAuthor === p.id ? '#ffffff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.15rem 0.45rem',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Type a collaborative message or review note..."
              className="input-control"
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
              <Send style={{ width: '14px', height: '14px' }} />
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
