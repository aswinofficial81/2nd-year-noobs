import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CollaborativeDocument,
  CollaborativeChat,
  Repository,
  type AuthorSignature,
} from '../src/index.js';

describe('Phase 18: Collaborative Document & Chat Model', () => {
  const author: AuthorSignature = {
    name: 'Aswin Babu',
    email: 'aswin@example.com',
    timestamp: 1700000000,
  };

  describe('1. CollaborativeDocument', () => {
    it('should edit title, text content, and metadata', () => {
      const doc = new CollaborativeDocument({ peerId: 'alice' });

      doc.setTitle('AI Architecture Whitepaper');
      doc.insertText('Hello World');
      doc.setMetadata('category', 'Technical Report');

      assert.strictEqual(doc.getTitle(), 'AI Architecture Whitepaper');
      assert.strictEqual(doc.getText(), 'Hello World');
      assert.strictEqual(doc.getMetadata('category'), 'Technical Report');
    });

    it('should sync document edits between Alice and Bob', () => {
      const docAlice = new CollaborativeDocument({ peerId: 'alice' });
      const docBob = new CollaborativeDocument({ peerId: 'bob' });

      docAlice.setTitle('Shared Spec');
      docAlice.insertText('CRDT + ');

      // Alice syncs to Bob
      docBob.syncWith(docAlice);
      assert.strictEqual(docBob.getTitle(), 'Shared Spec');
      assert.strictEqual(docBob.getText(), 'CRDT + ');

      // Bob appends text at current position
      docBob.insertText('Git Engine', docBob.getText().length);

      // Bob syncs back to Alice
      docAlice.syncWith(docBob);

      assert.strictEqual(docAlice.getTitle(), 'Shared Spec');
      assert.strictEqual(docBob.getTitle(), 'Shared Spec');
      assert.strictEqual(docAlice.getText(), 'CRDT + Git Engine');
      assert.strictEqual(docBob.getText(), 'CRDT + Git Engine');
    });

    it('should checkpoint document into Git and restore accurately', () => {
      const repo = new Repository('doc-repo');
      const session = repo.createCRDTSession('main', 'alice');
      const doc = new CollaborativeDocument(session);

      doc.setTitle('Production Roadmap');
      doc.insertText('Phase 1 to Phase 20');
      doc.setMetadata('status', 'Approved');

      const commit = repo.checkpointSession(doc.session, author, 'feat: roadmap doc');

      // Restore into a new document for Bob
      const restoredSession = repo.createSessionFromCommit({
        commitId: commit.id,
        peerId: 'bob',
      });
      const restoredDoc = new CollaborativeDocument(restoredSession);

      assert.strictEqual(restoredDoc.getTitle(), 'Production Roadmap');
      assert.strictEqual(restoredDoc.getText(), 'Phase 1 to Phase 20');
      assert.strictEqual(restoredDoc.getMetadata('status'), 'Approved');
    });
  });

  describe('2. CollaborativeChat', () => {
    it('should post messages and assign unique message IDs', () => {
      const chat = new CollaborativeChat({ peerId: 'alice' });

      const msg1 = chat.postMessage('Welcome to the Hackathon!');
      const msg2 = chat.postMessage('Let us build something epic!');

      const messages = chat.getMessages();
      assert.strictEqual(messages.length, 2);
      assert.strictEqual(messages[0].id, msg1.id);
      assert.strictEqual(messages[0].content, 'Welcome to the Hackathon!');
      assert.strictEqual(messages[1].content, 'Let us build something epic!');
    });

    it('should add reactions from multiple users to messages', () => {
      const chat = new CollaborativeChat({ peerId: 'alice' });
      const msg = chat.postMessage('Ready for review?');

      chat.addReaction(msg.id, '🚀', 'alice');
      chat.addReaction(msg.id, '🚀', 'bob');
      chat.addReaction(msg.id, '🔥', 'carol');

      const messages = chat.getMessages();
      const target = messages.find((m) => m.id === msg.id);

      assert.ok(target);
      assert.deepStrictEqual(target.reactions?.['🚀'], ['alice', 'bob']);
      assert.deepStrictEqual(target.reactions?.['🔥'], ['carol']);
    });

    it('should synchronize chat channels between replicas', () => {
      const chatAlice = new CollaborativeChat({ peerId: 'alice' });
      const chatBob = new CollaborativeChat({ peerId: 'bob' });

      chatAlice.postMessage('Hello from Alice');
      chatBob.postMessage('Hello from Bob');

      chatAlice.syncWith(chatBob);
      chatBob.syncWith(chatAlice);

      assert.strictEqual(chatAlice.getMessages().length, 2);
      assert.strictEqual(chatBob.getMessages().length, 2);
    });
  });
});
