import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import { createRequire } from 'module';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import {
  Repository,
  CollaborativeDocument,
  CollaborativeChat,
  CRDTSession,
  ObjectStore,
  Commit,
  Tree,
  Blob,
  runHackathonDemo,
  computeSemanticDiff,
  detectStateConflicts,
  type AuthorSignature,
  type TreeEntry,
} from '../index.js';
import { aiService, type IngestedArtifact } from './aiService.js';
import { extractTextFromPDF, chunkPDFPages } from './pdfParser.js';

const require = createRequire(import.meta.url);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({ storage: multer.memoryStorage() });

// --- Global Persisted Repository State ---
const storageDir = path.join(os.tmpdir(), 'git-crdt-server-repo');
let store = new ObjectStore(storageDir);
let repo = new Repository('git-crdt-collab-repo');

// Active Peer Sessions Map: Map<sessionId, CRDTSession>
const activeSessions: Map<string, CRDTSession> = new Map();
const activeDocs: Map<string, CollaborativeDocument> = new Map();
const activeChats: Map<string, CollaborativeChat> = new Map();

function getOrCreateSession(branchName: string, peerId: string): {
  session: CRDTSession;
  doc: CollaborativeDocument;
  chat: CollaborativeChat;
} {
  const sessionKey = `${branchName}:${peerId}`;
  if (!activeSessions.has(sessionKey)) {
    const session = repo.createCRDTSession(branchName, peerId);
    activeSessions.set(sessionKey, session);
    const doc = new CollaborativeDocument(session);
    activeDocs.set(sessionKey, doc);
    const chat = new CollaborativeChat(session);
    activeChats.set(sessionKey, chat);
  }

  return {
    session: activeSessions.get(sessionKey)!,
    doc: activeDocs.get(sessionKey)!,
    chat: activeChats.get(sessionKey)!,
  };
}

function seedInitialCommit() {
  const author: AuthorSignature = {
    name: 'Lead AI Engineer',
    email: 'engineer@gitcrdt.ai',
    timestamp: Date.now() - 3600000,
  };

  const { doc, chat, session } = getOrCreateSession('main', 'default_peer');
  doc.setTitle('Untitled Research Document');
  doc.insertText('Start typing collaborative research notes, code, or ideas here...');
  doc.setMetadata('status', 'draft');
  chat.postMessage('Collaborative workspace session initialized. Ready for real-time peer editing.');

  const commit = repo.checkpointSession(session, author, 'feat: initial repository bootstrap');
  store.saveRepository(repo).catch(() => {});
  console.log(`[Server] Initialized repository '${repo.name}' with commit: ${commit.id}`);
}

// Initialize and restore persisted repository
async function initRepository() {
  try {
    if (fs.existsSync(path.join(storageDir, 'config.json'))) {
      repo = await store.loadRepository();
      console.log(`[Server] Successfully restored persisted repository '${repo.name}' from ${storageDir}`);
      return;
    }
  } catch (err) {
    console.warn('[Server] Could not load persisted repository, creating new instance:', err);
  }

  seedInitialCommit();
}

initRepository();

// --- WebSocket Real-Time Peer Broadcasting ---
interface WSClient extends WebSocket {
  peerId?: string;
  peerName?: string;
  color?: string;
  room?: string;
  isAlive?: boolean;
}

const rooms = new Map<string, Set<WSClient>>();

function getRoomPeers(room: string): Array<{ id: string; name: string; color: string; isOnline: boolean }> {
  const clients = rooms.get(room);
  if (!clients) return [];
  const map = new Map<string, { id: string; name: string; color: string; isOnline: boolean }>();
  for (const client of clients) {
    if (client.peerId) {
      map.set(client.peerId, {
        id: client.peerId,
        name: client.peerName || client.peerId,
        color: client.color || '#6366f1',
        isOnline: client.readyState === WebSocket.OPEN,
      });
    }
  }
  return Array.from(map.values());
}

wss.on('connection', (ws: WSClient) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (messageRaw: string) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      const { type, room = 'main', peerId = 'peer_local', peerName, color, payload = {} } = data;

      if (type === 'join') {
        ws.peerId = peerId;
        ws.peerName = peerName || peerId;
        ws.color = color || '#6366f1';
        ws.room = room;
        if (!rooms.has(room)) {
          rooms.set(room, new Set());
        }
        rooms.get(room)!.add(ws);

        const { doc, chat, session } = getOrCreateSession(room, peerId);
        const activePeers = getRoomPeers(room);

        // Send state snapshot
        ws.send(JSON.stringify({
          type: 'sync-state',
          room,
          peerId,
          doc: {
            title: doc.getTitle(),
            text: doc.getText(),
            metadata: doc.export().rawState,
          },
          chat: {
            messages: chat.getMessages().map(m => ({
              id: m.id,
              author: m.author,
              text: m.content,
              timestamp: m.timestamp,
              reactions: m.reactions || {},
            })),
          },
          vectorClock: Object.fromEntries(session.getVectorClock()),
          activePeers,
        }));

        // Broadcast peer join to others
        broadcastToRoom(room, {
          type: 'peer-joined',
          peerId: ws.peerId,
          peerName: ws.peerName,
          activePeers,
        }, ws);
      }

      if (type === 'crdt-op') {
        const { opType, text, position = 0, title, key, value } = payload;
        const { doc, session } = getOrCreateSession(room, peerId);

        if (opType === 'insert') {
          doc.insertText(text, position);
        } else if (opType === 'delete') {
          // Create delete operation on content path
          const op = session.createOperation('delete', { position, length: text?.length || 1 }, 'content');
          session.applyOperation(op);
        } else if (opType === 'setTitle') {
          doc.setTitle(title);
        } else if (opType === 'setMetadata') {
          doc.setMetadata(key, value);
        }

        // Broadcast updated state and op
        broadcastToRoom(room, {
          type: 'crdt-op-applied',
          peerId,
          opType,
          doc: {
            title: doc.getTitle(),
            text: doc.getText(),
            metadata: doc.export().rawState,
          },
          vectorClock: Object.fromEntries(session.getVectorClock()),
          timestamp: Date.now(),
        });
      }

      if (type === 'chat-msg') {
        const { text, authorName } = payload;
        const { chat, session } = getOrCreateSession(room, peerId);
        const msg = chat.postMessage(text, authorName || peerId);

        broadcastToRoom(room, {
          type: 'chat-msg-received',
          message: {
            id: msg.id,
            author: msg.author,
            text: msg.content,
            timestamp: msg.timestamp,
            reactions: msg.reactions || {},
          },
          vectorClock: Object.fromEntries(session.getVectorClock()),
        });
      }

      if (type === 'chat-reaction') {
        const { messageId, emoji } = payload;
        const { chat } = getOrCreateSession(room, peerId);
        chat.addReaction(messageId, emoji, peerId);

        broadcastToRoom(room, {
          type: 'chat-reaction-updated',
          messageId,
          reactions: chat.getMessages().find(m => m.id === messageId)?.reactions || {},
        });
      }

      if (type === 'cursor') {
        broadcastToRoom(room, {
          type: 'cursor-update',
          peerId,
          cursor: payload,
        }, ws);
      }
    } catch (err) {
      console.error('[WebSocket] message processing error:', err);
    }
  });

  ws.on('close', () => {
    if (ws.room && rooms.has(ws.room)) {
      rooms.get(ws.room)!.delete(ws);
      const activePeers = getRoomPeers(ws.room);
      broadcastToRoom(ws.room, {
        type: 'peer-left',
        peerId: ws.peerId,
        peerName: ws.peerName,
        activePeers,
      });
    }
  });
});

function broadcastToRoom(room: string, message: any, excludeWs?: WSClient) {
  const clients = rooms.get(room);
  if (!clients) return;
  const msgStr = JSON.stringify(message);
  for (const client of clients) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(msgStr);
    }
  }
}

// --- REST API Endpoints ---

// 1. Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString(), repo: repo.name });
});

// 2. Repository state overview
app.get('/api/repo/state', (req: Request, res: Response) => {
  const json = repo.toJSON();
  const branchList = repo.listBranches();
  const formattedBranches = branchList.map(b => ({
    name: b.name,
    commitId: b.headCommitId,
  }));
  const currentBranch = repo.head.type === 'branch' ? repo.head.target : null;
  const currentCommitId = repo.currentCommitId;

  res.json({
    name: repo.name,
    head: repo.head,
    currentBranch,
    currentCommitId,
    branches: formattedBranches,
    stats: {
      commits: json.objects.commits.length,
      trees: json.objects.trees.length,
      blobs: json.objects.blobs.length,
      totalObjects: repo.objectCount,
      sessions: json.sessions.length,
    },
    objects: json.objects,
  });
});

// 3. Formatted Git DAG Graph (nodes and edges for visual rendering)
app.get('/api/repo/dag', (req: Request, res: Response) => {
  const json = repo.toJSON();
  const commits = json.objects.commits;
  const branchList = repo.listBranches();

  // Map commits to nodes
  const nodes = commits.map(c => {
    const associatedBranches = branchList
      .filter(b => b.headCommitId === c.id)
      .map(b => b.name);

    const isHead = repo.currentCommitId === c.id;

    return {
      id: c.id,
      shortId: c.id.slice(0, 7),
      message: c.message,
      author: c.author,
      timestamp: c.author.timestamp,
      treeId: c.treeId,
      shortTreeId: c.treeId.slice(0, 7),
      parentIds: c.parentIds,
      branches: associatedBranches,
      isHead,
    };
  });

  // Sort chronologically
  nodes.sort((a, b) => a.timestamp - b.timestamp);

  const edges: Array<{ from: string; to: string }> = [];
  commits.forEach(c => {
    c.parentIds.forEach(pId => {
      edges.push({ from: pId, to: c.id });
    });
  });

  res.json({
    nodes,
    edges,
    head: repo.head,
    activeCommit: repo.currentCommitId,
  });
});

// 4. Initialize or Reset Repository
app.post('/api/repo/init', async (req: Request, res: Response) => {
  const { name = 'my-crdt-project' } = req.body;
  repo = new Repository(name);
  activeSessions.clear();
  activeDocs.clear();
  activeChats.clear();
  seedInitialCommit();
  res.json({ success: true, name: repo.name, currentCommit: repo.currentCommitId });
});

// 5. Create Branch
app.post('/api/branch/create', (req: Request, res: Response) => {
  const { name, startCommitId } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Branch name is required' });
  }
  try {
    const branch = repo.createBranch(name, startCommitId || repo.currentCommitId);
    try {
      store.saveRepository(repo);
    } catch (e) {}
    res.json({
      success: true,
      branch: {
        name: branch.name,
        commitId: branch.headCommitId,
      }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Checkout Branch or Commit
app.post('/api/branch/checkout', (req: Request, res: Response) => {
  const { target } = req.body;
  if (!target) {
    return res.status(400).json({ error: 'Checkout target is required' });
  }
  try {
    repo.checkout(target);
    res.json({
      success: true,
      head: repo.head,
      currentCommitId: repo.currentCommitId,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Checkpoint active Session to Commit
app.post('/api/commit', (req: Request, res: Response) => {
  const {
    branch = repo.head.target,
    peerId = 'default_peer',
    message = 'feat: collaborative checkpoint',
    authorName,
    email,
  } = req.body;

  try {
    if (repo.head.type !== 'branch' || repo.head.target !== branch) {
      repo.checkout(branch);
    }
    const { session } = getOrCreateSession(branch, peerId);
    const effectiveAuthor = authorName || peerId || 'Researcher';
    const author: AuthorSignature = {
      name: effectiveAuthor,
      email: email || `${peerId}@gitcrdt.local`,
      timestamp: Date.now(),
    };

    const commit = repo.checkpointSession(session, author, message);
    try {
      store.saveRepository(repo);
    } catch (e) {}

    res.json({
      success: true,
      commit: {
        id: commit.id,
        message: commit.message,
        treeId: commit.treeId,
        parentIds: commit.parentIds,
        author: commit.author,
      },
      head: repo.head,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Inspect Commit details
app.get('/api/commit/:id', (req: Request, res: Response) => {
  const id = typeof req.params.id === 'string' ? req.params.id : String(req.params.id);
  let commit = repo.getCommit(id);
  if (!commit) {
    const allCommits = repo.toJSON().objects.commits;
    const match = allCommits.find(c => c.id === id || c.id.startsWith(id));
    if (match) commit = repo.getCommit(match.id);
  }
  if (!commit) {
    return res.status(404).json({ error: 'Commit not found' });
  }

  const tree = repo.getTree(commit.treeId);
  const entries = tree ? tree.listEntries().map((e: TreeEntry) => {
    const blob = repo.getBlob(e.id);
    let preview = '';
    if (blob) {
      preview = blob.getContentAsString().slice(0, 500);
    }
    return {
      name: e.name,
      mode: e.mode,
      type: e.type,
      id: e.id,
      contentPreview: preview,
    };
  }) : [];

  res.json({
    commit: {
      id: commit.id,
      message: commit.message,
      treeId: commit.treeId,
      parentIds: commit.parentIds,
      author: commit.author,
    },
    tree: {
      id: tree?.id,
      entries,
    }
  });
});

// Helper to extract document text & metadata from a commit object
function getCommitDocumentState(commitId: string): { title: string; text: string; metadata: Record<string, unknown> } {
  let commit = repo.getCommit(commitId);
  if (!commit) {
    const allCommits = repo.toJSON().objects.commits;
    const match = allCommits.find(c => c.id === commitId || c.id.startsWith(commitId));
    if (match) commit = repo.getCommit(match.id);
  }
  if (!commit) return { title: '', text: '', metadata: {} };

  const tree = repo.getTree(commit.treeId);
  const stateEntry = tree?.listEntries().find((e: TreeEntry) => e.name === 'state.json');
  if (stateEntry) {
    const blob = repo.getBlob(stateEntry.id);
    if (blob) {
      try {
        const parsed = JSON.parse(blob.getContentAsString());
        let text = '';
        if (typeof parsed.content === 'string') {
          text = parsed.content;
        } else if (Array.isArray(parsed.content)) {
          text = parsed.content.map((c: any) => typeof c === 'string' ? c : c?.char || '').join('');
        }
        const metadata: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (k.startsWith('meta_')) {
            metadata[k.replace(/^meta_/, '')] = v;
          }
        }
        return {
          title: parsed.title || '',
          text,
          metadata,
        };
      } catch (e) {}
    }
  }
  return { title: '', text: '', metadata: {} };
}

// 8b. Semantic Diff between two commits (or commit vs parent)
app.get('/api/diff', (req: Request, res: Response) => {
  const fromId = req.query.from as string | undefined;
  const toId = req.query.to as string;

  if (!toId) {
    return res.status(400).json({ error: 'to commit ID is required' });
  }

  const toState = getCommitDocumentState(toId);
  let fromState = { title: '', text: '', metadata: {} };
  let resolvedFromId = fromId || null;

  if (fromId) {
    fromState = getCommitDocumentState(fromId);
  } else {
    let commit = repo.getCommit(toId);
    if (!commit) {
      const match = repo.toJSON().objects.commits.find(c => c.id === toId || c.id.startsWith(toId));
      if (match) commit = repo.getCommit(match.id);
    }
    if (commit && commit.parentIds.length > 0) {
      resolvedFromId = commit.parentIds[0];
      fromState = getCommitDocumentState(resolvedFromId);
    }
  }

  const diffResult = computeSemanticDiff(fromState, toState);
  res.json({
    fromCommit: resolvedFromId,
    toCommit: toId,
    fromState,
    toState,
    diff: diffResult,
  });
});

// 8c. Preview 3-Way Merge & Conflict Detection
app.get('/api/branch/merge/preview', (req: Request, res: Response) => {
  const targetBranch = (req.query.targetBranch as string) || 'main';
  const sourceBranch = req.query.sourceBranch as string;

  if (!sourceBranch) {
    return res.status(400).json({ error: 'sourceBranch is required' });
  }

  const target = repo.getBranch(targetBranch);
  const source = repo.getBranch(sourceBranch);

  if (!target || !source) {
    return res.status(404).json({ error: 'One or both branches not found' });
  }

  const oursHeadId = target.headCommitId;
  const theirsHeadId = source.headCommitId;

  if (!theirsHeadId) {
    return res.json({ mergeType: 'already-up-to-date', conflicts: [], hasConflicts: false });
  }
  if (!oursHeadId) {
    return res.json({ mergeType: 'fast-forward', targetCommit: theirsHeadId, conflicts: [], hasConflicts: false });
  }
  if (oursHeadId === theirsHeadId) {
    return res.json({ mergeType: 'already-up-to-date', mergeBaseId: oursHeadId, conflicts: [], hasConflicts: false });
  }

  const baseCommit = repo.findCommonAncestor(oursHeadId, theirsHeadId);

  if (baseCommit && baseCommit.id === theirsHeadId) {
    return res.json({ mergeType: 'already-up-to-date', mergeBaseId: baseCommit.id, conflicts: [], hasConflicts: false });
  }
  if (baseCommit && baseCommit.id === oursHeadId) {
    return res.json({ mergeType: 'fast-forward', targetCommit: theirsHeadId, mergeBaseId: baseCommit.id, conflicts: [], hasConflicts: false });
  }

  const baseDoc = baseCommit ? getCommitDocumentState(baseCommit.id) : { title: '', text: '', metadata: {} };
  const oursDoc = getCommitDocumentState(oursHeadId);
  const theirsDoc = getCommitDocumentState(theirsHeadId);

  // Extract raw state objects for conflict calculation
  let baseState: Record<string, unknown> = {};
  if (baseCommit) {
    const sessionBase = repo.createSessionFromCommit({ commitId: baseCommit.id, peerId: 'prev-base', branchName: targetBranch });
    baseState = sessionBase.exportState();
    repo.closeCRDTSession(sessionBase.sessionId);
  }

  const sessionOurs = repo.createSessionFromCommit({ commitId: oursHeadId, peerId: 'prev-ours', branchName: targetBranch });
  const sessionTheirs = repo.createSessionFromCommit({ commitId: theirsHeadId, peerId: 'prev-theirs', branchName: sourceBranch });

  const conflicts = detectStateConflicts(baseState, sessionOurs.exportState(), sessionTheirs.exportState());
  const diffOurs = computeSemanticDiff(baseDoc, oursDoc);
  const diffTheirs = computeSemanticDiff(baseDoc, theirsDoc);

  repo.closeCRDTSession(sessionOurs.sessionId);
  repo.closeCRDTSession(sessionTheirs.sessionId);

  res.json({
    mergeType: '3-way-merge',
    mergeBaseId: baseCommit?.id || null,
    oursHeadId,
    theirsHeadId,
    conflicts,
    hasConflicts: conflicts.length > 0,
    diffOurs,
    diffTheirs,
    baseDoc,
    oursDoc,
    theirsDoc,
  });
});

// 9. 3-Way Semantic CRDT Branch Merge
app.post('/api/branch/merge', (req: Request, res: Response) => {
  const {
    targetBranch = 'main',
    sourceBranch,
    authorName = 'Automated Merge Engine',
    email = 'merge@gitcrdt.ai',
    message,
  } = req.body;

  if (!sourceBranch) {
    return res.status(400).json({ error: 'sourceBranch is required' });
  }

  try {
    const author: AuthorSignature = {
      name: authorName,
      email,
      timestamp: Date.now(),
    };

    const mergeResult = repo.mergeBranches({
      targetBranch,
      sourceBranch,
      author,
      message: message || `Merge branch '${sourceBranch}' into '${targetBranch}'`,
    });
    try {
      store.saveRepository(repo);
    } catch (e) {}

    res.json({
      success: true,
      mergeType: mergeResult.type,
      mergeBaseId: mergeResult.mergeBaseId,
      commit: mergeResult.commit ? {
        id: mergeResult.commit.id,
        type: mergeResult.commit.type,
      } : null,
      mergedState: mergeResult.mergedState,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Session state & Live Collaborative Dispatch
app.get('/api/session/state', (req: Request, res: Response) => {
  const branch = (req.query.branch as string) || (repo.head.type === 'branch' ? repo.head.target : 'main');
  const peerId = (req.query.peerId as string) || 'default_peer';

  const { doc, chat, session } = getOrCreateSession(branch, peerId);
  const jsonSession = session.toJSON();
  const activePeers = getRoomPeers(branch);

  res.json({
    branch,
    peerId,
    doc: {
      title: doc.getTitle(),
      text: doc.getText(),
      metadata: doc.export().rawState,
    },
    chat: {
      messages: chat.getMessages().map(m => ({
        id: m.id,
        author: m.author,
        text: m.content,
        timestamp: m.timestamp,
        reactions: m.reactions || {},
      })),
    },
    vectorClock: Object.fromEntries(session.getVectorClock()),
    operationsCount: jsonSession.pendingOperations.length,
    operationsLog: jsonSession.pendingOperations.slice(-30),
    activePeers,
  });
});

app.get('/api/session/peers', (req: Request, res: Response) => {
  const branch = (req.query.branch as string) || 'main';
  const peers = getRoomPeers(branch);
  res.json({ branch, peers });
});

app.post('/api/session/edit', (req: Request, res: Response) => {
  const {
    branch = 'main',
    peerId = 'alice',
    type,
    text,
    position = 0,
    title,
    metadataKey,
    metadataVal,
    key,
    value,
  } = req.body;

  const { doc, session } = getOrCreateSession(branch, peerId);

  if (type === 'insert') {
    doc.insertText(text, position);
  } else if (type === 'delete') {
    const op = session.createOperation('delete', { position, length: text?.length || 1 }, 'content');
    session.applyOperation(op);
  } else if (type === 'setTitle') {
    doc.setTitle(title);
  } else if (type === 'setMetadata') {
    const metaKey = metadataKey || key;
    const metaVal = metadataVal !== undefined ? metadataVal : value;
    if (metaKey) {
      doc.setMetadata(metaKey, metaVal);
    }
  }

  broadcastToRoom(branch, {
    type: 'crdt-op-applied',
    peerId,
    opType: type,
    doc: {
      title: doc.getTitle(),
      text: doc.getText(),
      metadata: doc.export().rawState,
    },
    vectorClock: Object.fromEntries(session.getVectorClock()),
    timestamp: Date.now(),
  });

  res.json({
    success: true,
    doc: {
      title: doc.getTitle(),
      text: doc.getText(),
      metadata: doc.export().rawState,
    },
    vectorClock: Object.fromEntries(session.getVectorClock()),
  });
});

// 11. Peer Sync Endpoint (Simulate Alice <-> Bob Sync)
app.post('/api/session/sync', (req: Request, res: Response) => {
  const { branch = 'main', peerA = 'alice', peerB = 'bob' } = req.body;

  const sessionA = getOrCreateSession(branch, peerA);
  const sessionB = getOrCreateSession(branch, peerB);

  sessionA.doc.syncWith(sessionB.doc);
  sessionB.doc.syncWith(sessionA.doc);
  sessionA.chat.syncWith(sessionB.chat);
  sessionB.chat.syncWith(sessionA.chat);

  res.json({
    success: true,
    message: `Synchronized replicas ${peerA} and ${peerB} on branch '${branch}'`,
    peerAState: {
      text: sessionA.doc.getText(),
      clock: Object.fromEntries(sessionA.session.getVectorClock()),
    },
    peerBState: {
      text: sessionB.doc.getText(),
      clock: Object.fromEntries(sessionB.session.getVectorClock()),
    },
  });
});

// 12. Run Hackathon Automated 9-Step Demo
app.get('/api/demo/run', async (req: Request, res: Response) => {
  try {
    const steps = await runHackathonDemo();
    res.json({
      success: true,
      totalSteps: steps.length,
      steps,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI Research Ingestion & RAG Endpoints ---

// 13. Ingest Markdown
app.post('/api/ingest/markdown', upload.single('file'), async (req: Request, res: Response) => {
  try {
    let content = '';
    let title = req.body.title || 'Markdown Artifact';

    if (req.file) {
      content = req.file.buffer.toString('utf-8');
      if (!req.body.title) title = req.file.originalname.replace(/\.md$/i, '');
    } else if (req.body.content) {
      content = req.body.content;
    }

    if (!content.trim()) {
      return res.status(400).json({ error: 'Content is empty' });
    }

    const chunks = aiService.chunkText(content);
    const summary = await aiService.generateSummary(content);
    const topics = aiService.extractTopics(content);

    const artifact: IngestedArtifact = {
      id: `art-md-${Date.now()}`,
      type: 'doc',
      title,
      raw_content: content,
      summary_line: summary,
      topics,
      chunks,
      created_at: Date.now(),
    };

    aiService.indexArtifact(artifact);
    res.json(artifact);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Ingest PDF
app.post('/api/ingest/pdf', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    const title = req.body.title || req.file.originalname.replace(/\.pdf$/i, '');
    const extractionResult = await extractTextFromPDF(req.file.buffer);

    if (!extractionResult.success) {
      return res.status(422).json({
        error: extractionResult.error || 'This PDF does not contain an extractable text layer.',
        requires_ocr: extractionResult.requiresOcr ?? true,
        totalPages: extractionResult.totalPages,
      });
    }

    const content = extractionResult.fullText;
    const artifactId = `art-pdf-${Date.now()}`;
    const structuredChunks = chunkPDFPages(extractionResult.pages, artifactId);
    const chunks = structuredChunks.map(c => c.text);

    const summary = await aiService.generateSummary(content);
    const topics = aiService.extractTopics(content);

    const artifact: IngestedArtifact = {
      id: artifactId,
      type: 'pdf',
      title,
      raw_content: content,
      summary_line: summary,
      topics,
      chunks,
      structured_chunks: structuredChunks,
      pages_count: extractionResult.totalPages,
      created_at: Date.now(),
    };

    aiService.indexArtifact(artifact);
    res.json(artifact);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Ingest ChatGPT Export JSON
app.post('/api/ingest/chat/chatgpt', upload.single('file'), async (req: Request, res: Response) => {
  try {
    let jsonStr = '';
    if (req.file) {
      jsonStr = req.file.buffer.toString('utf-8');
    } else if (req.body.content) {
      jsonStr = typeof req.body.content === 'string' ? req.body.content : JSON.stringify(req.body.content);
    }

    const data = JSON.parse(jsonStr);
    const title = req.body.title || data.title || 'ChatGPT Conversation Export';
    const messages: Array<{ role: string; content: string }> = [];

    if (data.mapping) {
      for (const node of Object.values(data.mapping) as any[]) {
        const msg = node?.message;
        if (msg && msg.content && msg.content.parts) {
          const role = msg.author?.role || 'user';
          const text = msg.content.parts.join('\n');
          if (text.trim()) messages.push({ role, content: text });
        }
      }
    }

    const rawContent = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const chunks = aiService.chunkText(rawContent);
    const summary = await aiService.generateSummary(rawContent);
    const topics = aiService.extractTopics(rawContent);

    const artifact: IngestedArtifact = {
      id: `art-gpt-${Date.now()}`,
      type: 'chat',
      title,
      raw_content: rawContent,
      summary_line: summary,
      topics,
      chunks,
      normalized_messages: messages,
      created_at: Date.now(),
    };

    aiService.indexArtifact(artifact);
    res.json(artifact);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 16. Ingest Claude Export JSON
app.post('/api/ingest/chat/claude', upload.single('file'), async (req: Request, res: Response) => {
  try {
    let jsonStr = '';
    if (req.file) {
      jsonStr = req.file.buffer.toString('utf-8');
    } else if (req.body.content) {
      jsonStr = typeof req.body.content === 'string' ? req.body.content : JSON.stringify(req.body.content);
    }

    const data = JSON.parse(jsonStr);
    const title = req.body.title || data.name || 'Claude Conversation Export';
    const messages: Array<{ role: string; content: string }> = [];

    if (data.chat_messages) {
      for (const msg of data.chat_messages) {
        messages.push({
          role: msg.sender === 'human' ? 'user' : 'assistant',
          content: msg.text || '',
        });
      }
    }

    const rawContent = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const chunks = aiService.chunkText(rawContent);
    const summary = await aiService.generateSummary(rawContent);
    const topics = aiService.extractTopics(rawContent);

    const artifact: IngestedArtifact = {
      id: `art-claude-${Date.now()}`,
      type: 'chat',
      title,
      raw_content: rawContent,
      summary_line: summary,
      topics,
      chunks,
      normalized_messages: messages,
      created_at: Date.now(),
    };

    aiService.indexArtifact(artifact);
    res.json(artifact);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 17. List Artifacts
app.get('/api/artifacts', (req: Request, res: Response) => {
  res.json(aiService.getAllArtifacts());
});

app.get('/api/artifacts/:id', (req: Request, res: Response) => {
  const artId = typeof req.params.id === 'string' ? req.params.id : String(req.params.id);
  const art = aiService.getArtifact(artId);
  if (!art) return res.status(404).json({ error: 'Artifact not found' });
  res.json(art);
});

// 18. Cross-Corpus Semantic RAG Search & Synthesis
app.post(['/api/search', '/api/rag/query'], async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Query string is required' });
  }

  try {
    const result = await aiService.searchAndSynthesize(query);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend static assets if built
const clientDistPath = path.join(process.cwd(), 'dist-client');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req: Request, res: Response, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Unified Git + CRDT & AI API Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server running on ws://localhost:${PORT}`);
});

export { app, server };
