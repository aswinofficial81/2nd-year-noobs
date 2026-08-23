# Git for Research (Git + CRDT Collaboration Engine)

> A decentralized, real-time collaborative version-control and research platform combining **immutable Git Directed Acyclic Graphs (DAG)** with **Conflict-Free Replicated Data Types (CRDT)**, **multi-format ingestion**, **human-readable semantic diffs**, and **dual-tier semantic RAG retrieval**.

---

## 1. Problem

Research workflows suffer from a fundamental tooling divide:
- **Asynchronous Code VCS (e.g., Git)** excels at immutable version trees, cryptographic commit graphs, and branch history, but completely fails at real-time concurrent editing and non-code prose documents, generating frequent merge conflicts and complex manual rebasing.
- **Real-Time Synchronous Editors (e.g., Google Docs, Overleaf, Notion)** offer instant multi-cursor collaboration, but lack discrete verifiable versions, commit trees, branching/forking workflows, offline-first autonomy, and deterministic merge mechanics.
- **AI Chat Exports & Multi-Format Research Artifacts** (ChatGPT/Claude JSON dialogues, academic PDFs, literature notes) remain siloed across disparate tools with no unified versioning or semantic search capability.

---

## 2. Solution

**Git for Research** bridges this gap with a four-layer architecture:
1. **Multi-Format Ingestion**: Ingests Markdown prose, LLM chat session exports (ChatGPT/Claude JSON & Markdown), and scientific PDFs into chunked, embedded research artifacts.
2. **Hybrid Git + CRDT Versioning**: Checkpoints live, multi-peer CRDT sessions directly into immutable Git `Blob`, `Tree`, and `Commit` DAG objects.
3. **Semantic 3-Way Merge & Conflict Studio**: Identifies Nearest Common Ancestors (NCA) across divergent branches, computes 3-way delta states, detects concurrent overlapping modifications, and reconciles edits deterministically.
4. **Human-Readable Semantic Diffing**: Computes meaningful semantic diffs between versions, extracting metric/performance deltas (e.g., `Accuracy changed from 82% to 87% (+5 pp)`), prose sentence additions/removals, and metadata changes.
5. **Dual-Tier Semantic RAG**: Combines local TF-IDF cosine ranking with Gemini generative embeddings and contextual query synthesis across all research artifacts.

---

## 3. Architecture

```
                               ┌────────────────────────────────────────────────────────┐
                               │                 User Presentation UI                   │
                               │  AI Ingest │ Collab Editor │ Team Chat │ DAG │ Merge  │ RAG   │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                                                           ▼
                               ┌────────────────────────────────────────────────────────┐
                               │           Concurrent Context Layer (CRDT)              │
                               │  CRDTSession    │ Vector Clocks    │ Lamport Clocks    │
                               │  Operations Log │ Causal Ordering  │ Live WebSocket WS │
                               └───────────────────────────┬────────────────────────────┘
                                                           │ Checkpoint / Restore
                                                           ▼
                               ┌────────────────────────────────────────────────────────┐
                               │             Versioning Engine (Git DAG)                │
                               │  Blob (Payload) │ Tree (Manifest)  │ Commit (DAG Node) │
                               │  Branch & HEAD  │ NCA Graph Search │ Semantic Diff     │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                                                           ▼
                               ┌────────────────────────────────────────────────────────┐
                               │           Ingestion & Semantic RAG Layer               │
                               │  PDF Parser │ LLM Chat Importer │ Markdown Tokenizer   │
                               │  Vector Embeddings (768-dim) │ Cosine Search & Gemini  │
                               └────────────────────────────────────────────────────────┘
```

---

## 4. Ingestion Layer

The ingestion pipeline (`src/server/aiService.ts`) supports multi-format academic and research inputs:
- **Markdown / Plaintext Research Documents**: Structured sectioning, header extraction, word counting, and tag generation.
- **LLM Chat Exports**: Parses conversation exports from ChatGPT and Claude (JSON dialogues and Markdown logs), extracting user prompts, assistant answers, and multi-turn reasoning chains.
- **PDF Documents**: Extracts text and structural metadata using `pdf-parse`, chunking documents into sliding-window passages.
- **Artifact Pipeline**: Automatically extracts key research topics, generates vector embeddings, and stores artifacts with searchable metadata.

---

## 5. Git / Versioning Engine

The versioning engine (`src/models/Repository.ts`, `Blob.ts`, `Tree.ts`, `Commit.ts`) implements core Git primitives:
- **Content-Addressable Object Storage**: All objects are cryptographically indexed by SHA-256 hashes (`Blob.fromBytes`, `Blob.fromString`).
- **Immutable Commit DAG**: Commits store tree references, parent commit hashes (supporting dual parents for merge commits), author signatures, and metadata tags.
- **Branch & HEAD References**: Full branch creation, deletion, fast-forward pointers, and HEAD checkout state management.
- **Graph Traversal & NCA**: Computes shortest-path graph distances to identify the **Nearest Common Ancestor (NCA)** between any two commit nodes in the DAG.
- **Historical Checkpoints**: Checkpoints live CRDT session states into immutable Git trees (`state.json`), enabling instant session restoration from any historical commit.

---

## 6. CRDT / Concurrent Collaboration Layer

The collaboration layer (`src/models/CRDTSession.ts`, `CollaborativeDocument.ts`, `CollaborativeChat.ts`) provides real-time peer-to-peer editing:
- **Vector Clocks & Causality**: Implements multi-replica Vector Clocks with pairwise comparison (`before`, `after`, `equal`, `concurrent`).
- **Operations Log**: Tracks causal operations (`insert`, `delete`, `update`, `setTitle`, `setMetadata`) with monotonic Lamport and Vector Clock timestamps.
- **Deterministic Conflict Resolution**: Employs commutative operation sorting with peer-ID and timestamp tie-breakers, guaranteeing mathematical convergence across replicas regardless of network delivery order.
- **Live Presence & WebSocket Hub**: Real-time broadcast server (`src/server/server.ts`) syncing document state, peer presence, vector clocks, and chat reactions across active rooms.

---

## 7. Branching and Merging

The 3-Way Merge Studio (`src/utils/mergeEngine.ts`, `src/frontend/components/MergeStudio.tsx`) handles branch divergence:
- **Fast-Forward Merges**: Automatically advances branch pointers when the target branch is a direct ancestor of the source branch.
- **3-Way Merges**: Identifies the Nearest Common Ancestor (NCA) in the Git DAG and computes 3-way state diffs (`base` vs `ours` vs `theirs`).
- **Live Conflict Detection**: Surfaces overlapping edits when both branches modified the same fields or prose blocks.
- **Deterministic CRDT Reconciliation**: Merges operation logs commutatively to guarantee zero divergence while recording a merge commit with dual parent pointers.

---

## 8. Semantic Diff Engine

The semantic diff engine (`src/utils/semanticDiff.ts`) moves beyond raw byte-level character diffs to provide human-readable impact summaries:
- **Metric Delta Extraction**: Detects numeric and performance metric changes in research prose (e.g., `accuracy changed from 82% to 87% (+5 pp)`, `latency reduced from 15ms to 12ms`).
- **Prose Revisions**: Sentence-level similarity matching distinguishing between revisions, newly introduced statements, and deleted sentences.
- **Document Metadata & Title Diffs**: Tracks title renames and metadata additions, updates, or removals.
- **Interactive Commit Inspector**: Visualized in `CommitInspectorModal.tsx` and the `MergeStudio.tsx` preview panel.

---

## 9. Retrieval / Semantic RAG

The RAG engine (`src/server/aiService.ts`, `src/frontend/components/RagSearch.tsx`) enables multi-modal research discovery:
- **Embedding Generation**: 768-dimensional normalized dense vector representations for all ingested chunks.
- **Semantic Similarity Search**: Cosine similarity retrieval over research chunks, conversation messages, and document versions.
- **Dual-Tier Hybrid Querying**: Fast deterministic local TF-IDF/cosine ranking coupled with optional Gemini AI synthesis for summarized answers with cited sources.
- **Cross-Artifact Filtering**: Filter queries by artifact type (`paper`, `chat-export`, `pdf`, `experiment-log`, `notes`).

---

## 10. Current Capabilities

| Capability Area | Status | Implementation Details |
|---|:---:|---|
| **Multi-Format Ingestion** | ✅ Complete | Markdown, plain text, ChatGPT/Claude exports, PDF documents |
| **Git Object Model & DAG** | ✅ Complete | SHA-256 `Blob`, `Tree`, `Commit`, `Branch`, `HEAD`, NCA algorithm |
| **CRDT Collaboration** | ✅ Complete | Vector clocks, causal ordering, multi-peer sync, chat reactions |
| **3-Way Merge & Conflict Handling** | ✅ Complete | NCA calculation, live conflict detection, CRDT auto-reconciliation |
| **Semantic Diffing** | ✅ Complete | Metric delta extraction, sentence modification detection, title/metadata diffs |
| **Semantic RAG Search** | ✅ Complete | 768-dim embeddings, cosine similarity search, AI synthesis |
| **Dark & Light Mode** | ✅ Complete | Complete dual-theme design system with zero-FOUC initialization |
| **WebSockets & Real-Time Sync** | ✅ Complete | Full-duplex WebSocket broadcasting for multi-peer collaboration |

---

## 11. What Was Not Implemented / Scope Boundaries

To maintain strict architectural integrity and hackathon focus, the following items are intentionally out of scope:
- **Distributed Network DHT / libp2p Transport**: Peer communication currently uses WebSockets with an in-memory/sharded backend rather than full decentralized libp2p mesh networking.
- **Binary Git Delta Compression (Packfiles)**: Objects are stored as individual loose SHA-256 Blobs rather than compressed `.pack` delta indexes.
- **Rich-Text WYSIWYG WYSIWYM Formatting**: Collaborative document editor operates on markdown/plaintext character strings rather than proprietary rich-text document formats (e.g., ProseMirror schema trees).
- **External Git Remote Bridge (git push to GitHub)**: The system implements an independent Git object store and DAG engine; direct remote push/fetch to external GitHub/GitLab servers is not implemented.

---

## 12. How to Run the Project

### Prerequisites
- Node.js (>= 18.0.0)
- npm (>= 9.0.0)

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Application
```bash
npm run build
```

### 3. Start the Full-Stack Server (API + WebSockets + UI)
```bash
npm run server
```

The application will be accessible at:
- **Web UI**: [http://localhost:3000](http://localhost:3000)
- **REST API**: `http://localhost:3000/api`
- **WebSocket Endpoint**: `ws://localhost:3000/ws`

---

## 13. How to Run Tests

The test suite validates Git primitives, DAG ancestry, vector clock causal ordering, CRDT concurrency, replica synchronization, 3-way merges, fullstack APIs, and semantic diffing.

```bash
# Run the entire test suite (123 tests across 31 suites)
npm test
```

### Test Coverage Breakdown
- `tests/models.test.ts` — Git Blobs, Trees, Commits, Branches, HEAD, and NCA graph traversal
- `tests/vectorClock.test.ts` — Vector clock causality, concurrency comparisons, and normalization
- `tests/conflictResolution.test.ts` — Deterministic tie-breaking and CRDT operation sorting
- `tests/sync.test.ts` — Multi-replica convergence, duplicate delivery idempotence, out-of-order handling
- `tests/versionedCollaboration.test.ts` — Checkpoint creation and historical session restoration
- `tests/branchMerge.test.ts` — Fast-forward, up-to-date, and 3-way semantic branch merges
- `tests/storage.test.ts` — Sharded ObjectStore persistence and deserialization
- `tests/collaborativeModels.test.ts` — High-level CollaborativeDocument and CollaborativeChat
- `tests/semanticDiff.test.ts` — Metric delta extraction, sentence diffs, and 3-way conflict detection
- `tests/fullstack_integration.test.ts` — REST endpoints, WebSocket live sync, and end-to-end flows
- `tests/hardening.test.ts` — Multi-peer concurrency stress testing and error boundaries
