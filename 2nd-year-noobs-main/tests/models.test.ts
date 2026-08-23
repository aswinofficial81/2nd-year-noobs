import { describe, it } from "node:test";
import assert from "node:assert";
import {
  Blob,
  Tree,
  Commit,
  Branch,
  CRDTSession,
  Repository,
} from "../src/index.js";

describe("Git + CRDT Core Objects", () => {
  describe("1. Blob", () => {
    it("should create a Blob from string and compute SHA-256 hash", () => {
      const content = 'console.log("Hello CRDT World");';
      const blob = Blob.fromString(content);

      assert.strictEqual(blob.type, "blob");
      assert.strictEqual(blob.getContentAsString(), content);
      assert.strictEqual(blob.size, Buffer.from(content).length);
      assert.ok(blob.id.length === 64, "SHA-256 hash should be 64 characters");
    });

    it("should serialize and deserialize a Blob correctly", () => {
      const blob = Blob.fromString("test content");
      const serialized = blob.serialize();
      const restored = Blob.deserialize(serialized);

      assert.strictEqual(restored.id, blob.id);
      assert.strictEqual(
        restored.getContentAsString(),
        blob.getContentAsString(),
      );
      assert.strictEqual(restored.size, blob.size);
    });
    it("should keep Blob immutable when original bytes are modified", () => {
      const bytes = new Uint8Array([1, 2, 3]);
      const blob = Blob.fromBytes(bytes);

      bytes[0] = 99;

      assert.deepStrictEqual(Array.from(blob.getContentAsBytes()), [1, 2, 3]);
    });
    it("should preserve binary content after serialization", () => {
      const original = Blob.fromBytes(new Uint8Array([1, 2, 3, 255]));

      const restored = Blob.deserialize(original.serialize());

      assert.strictEqual(restored.id, original.id);

      assert.deepStrictEqual(
        Array.from(restored.getContentAsBytes()),
        [1, 2, 3, 255],
      );
    });
    it("should reject a Blob when the supplied ID does not match its content", () => {
      assert.throws(() => {
        Blob.deserialize(
          JSON.stringify({
            id: "fake-id",
            type: "blob",
            content: "hello",
            encoding: "utf8",
            size: 5,
          }),
        );
      });
    });
  });

  describe("2. Tree", () => {
    it("should create a Tree and manage entries", () => {
      const blob1 = Blob.fromString("const a = 1;");
      const blob2 = Blob.fromString("const b = 2;");

      const tree = new Tree();
      tree.addBlob("index.ts", blob1.id);
      tree.addBlob("helper.ts", blob2.id);

      assert.strictEqual(tree.type, "tree");
      assert.strictEqual(tree.size, 2);
      assert.ok(tree.hasEntry("index.ts"));
      assert.strictEqual(tree.getEntry("index.ts")?.id, blob1.id);
      assert.ok(tree.id.length === 64);

      const entries = tree.listEntries();
      assert.strictEqual(entries[0].name, "helper.ts");
      assert.strictEqual(entries[1].name, "index.ts");
    });

    it("should support subtrees and serialization", () => {
      const subTree = new Tree();
      const blob = Blob.fromString("sub file");
      subTree.addBlob("sub.txt", blob.id);

      const rootTree = new Tree();
      rootTree.addSubtree("subdir", subTree.id);

      const serialized = rootTree.serialize();
      const restored = Tree.deserialize(serialized);

      assert.strictEqual(restored.id, rootTree.id);
      assert.strictEqual(restored.getEntry("subdir")?.id, subTree.id);
      assert.strictEqual(restored.getEntry("subdir")?.type, "tree");
    });
    it("should produce the same ID for the same tree contents", () => {
      const tree1 = new Tree();

      tree1.addBlob("a.md", "blob-a");
      tree1.addBlob("b.md", "blob-b");

      const tree2 = new Tree();

      tree2.addBlob("a.md", "blob-a");
      tree2.addBlob("b.md", "blob-b");

      assert.strictEqual(tree1.id, tree2.id);
    });
    it("should produce the same ID regardless of insertion order", () => {
      const tree1 = new Tree();

      tree1.addBlob("a.md", "blob-a");
      tree1.addBlob("b.md", "blob-b");

      const tree2 = new Tree();

      tree2.addBlob("b.md", "blob-b");
      tree2.addBlob("a.md", "blob-a");

      assert.strictEqual(tree1.id, tree2.id);
    });
    it("should change ID when an entry is added", () => {
      const tree = new Tree();

      tree.addBlob("a.md", "blob-a");

      const oldId = tree.id;

      tree.addBlob("b.md", "blob-b");

      assert.notStrictEqual(tree.id, oldId);
    });
    it("should change ID when an entry is removed", () => {
      const tree = new Tree();

      tree.addBlob("a.md", "blob-a");
      tree.addBlob("b.md", "blob-b");

      const oldId = tree.id;

      tree.removeEntry("b.md");

      assert.notStrictEqual(tree.id, oldId);
    });
    it("should reject a Tree when the supplied ID does not match its entries", () => {
      assert.throws(() => {
        new Tree(
          [
            {
              name: "a.md",
              mode: "100644",
              type: "blob",
              id: "blob-a",
            },
          ],
          "fake-tree-id",
        );
      });
    });
  });

  describe("3. Commit", () => {
    it("should create a root Commit and child Commit with linkage", () => {
      const tree = new Tree();
      const author = {
        name: "Alice",
        email: "alice@example.com",
        timestamp: 1700000000000,
      };

      const rootCommit = new Commit({
        treeId: tree.id,
        author,
        message: "Initial commit",
      });

      assert.strictEqual(rootCommit.type, "commit");
      assert.ok(rootCommit.isRoot());
      assert.strictEqual(rootCommit.isMerge(), false);
      assert.strictEqual(rootCommit.parentIds.length, 0);

      const childCommit = new Commit({
        treeId: tree.id,
        parentIds: [rootCommit.id],
        author,
        message: "Second commit",
      });

      assert.strictEqual(childCommit.isRoot(), false);
      assert.strictEqual(childCommit.parentIds[0], rootCommit.id);
    });

    it("should support merge commits and serialization", () => {
      const author = {
        name: "Bob",
        email: "bob@example.com",
        timestamp: 1700000000000,
      };
      const mergeCommit = new Commit({
        treeId: "tree123",
        parentIds: ["parent1", "parent2"],
        author,
        message: "Merge branch feature into main",
        metadata: { vectorClock: { peerA: 5, peerB: 3 } },
      });

      assert.ok(mergeCommit.isMerge());
      assert.strictEqual(mergeCommit.parentIds.length, 2);

      const serialized = mergeCommit.serialize();
      const restored = Commit.deserialize(serialized);

      assert.strictEqual(restored.id, mergeCommit.id);
      assert.strictEqual(restored.message, mergeCommit.message);
      assert.deepStrictEqual(restored.metadata, mergeCommit.metadata);
    });
    it("should produce the same ID for identical commit contents", () => {
      const author = {
        name: "Alice",
        email: "alice@example.com",
        timestamp: 1000,
      };

      const commit1 = new Commit({
        treeId: "tree-1",
        parentIds: ["parent-1"],
        author,
        message: "Update research",
      });

      const commit2 = new Commit({
        treeId: "tree-1",
        parentIds: ["parent-1"],
        author,
        message: "Update research",
      });

      assert.strictEqual(commit1.id, commit2.id);
    });
    it("should produce the same ID regardless of metadata key order", () => {
      const author = {
        name: "Alice",
        email: "alice@example.com",
        timestamp: 1000,
      };

      const commit1 = new Commit({
        treeId: "tree-1",
        author,
        message: "Experiment",
        metadata: {
          model: "RandomForest",
          accuracy: 91,
        },
      });

      const commit2 = new Commit({
        treeId: "tree-1",
        author,
        message: "Experiment",
        metadata: {
          accuracy: 91,
          model: "RandomForest",
        },
      });

      assert.strictEqual(commit1.id, commit2.id);
    });
    it("should change ID when commit content changes", () => {
      const author = {
        name: "Alice",
        email: "alice@example.com",
        timestamp: 1000,
      };

      const commit1 = new Commit({
        treeId: "tree-1",
        author,
        message: "Initial version",
      });

      const commit2 = new Commit({
        treeId: "tree-1",
        author,
        message: "Updated version",
      });

      assert.notStrictEqual(commit1.id, commit2.id);
    });
    it("should reject a Commit when the supplied ID does not match its content", () => {
      const author = {
        name: "Alice",
        email: "alice@example.com",
        timestamp: 1000,
      };

      assert.throws(() => {
        new Commit({
          treeId: "tree-1",
          author,
          message: "Initial commit",
          id: "fake-commit-id",
        });
      });
    });
  });

  describe("4. Branch", () => {
    it("should create and update branch references", () => {
      const branch = new Branch("feature/collab", "commit-123");

      assert.strictEqual(branch.name, "feature/collab");
      assert.strictEqual(branch.headCommitId, "commit-123");

      branch.updateHead("commit-456");
      assert.strictEqual(branch.headCommitId, "commit-456");

      branch.setRemote("origin/feature/collab");
      assert.strictEqual(branch.remote, "origin/feature/collab");
    });

    it("should serialize and deserialize a Branch correctly", () => {
      const branch = new Branch("main", "commit-abc", "origin/main", {
        protected: true,
      });
      const serialized = branch.serialize();
      const restored = Branch.deserialize(serialized);

      assert.strictEqual(restored.name, "main");
      assert.strictEqual(restored.headCommitId, "commit-abc");
      assert.strictEqual(restored.remote, "origin/main");
      assert.strictEqual(restored.metadata.protected, true);
    });
  });

  describe("5. CRDTSession", () => {
    it("should manage peers, vector clocks, and generated operations", () => {
      const session = new CRDTSession({
        peerId: "peer-alpha",
        branchName: "main",
      });

      assert.strictEqual(session.peerId, "peer-alpha");
      assert.strictEqual(session.branchName, "main");
      assert.strictEqual(session.getClock("peer-alpha"), 0);

      // Add remote peer
      session.addPeer({ peerId: "peer-beta", lastActive: Date.now() });
      assert.strictEqual(session.listPeers().length, 2);

      // Create operation
      const op1 = session.createOperation(
        "insert",
        { char: "A", position: 0 },
        "src/main.ts",
      );

      assert.strictEqual(op1.peerId, "peer-alpha");
      assert.strictEqual(op1.clock, 1);
      assert.strictEqual(session.getClock("peer-alpha"), 1);
      assert.strictEqual(session.getPendingOperations().length, 1);
      assert.strictEqual(session.hasApplied(op1.id), false);

      assert.strictEqual(
        session.applyOperation(op1),
        true,
      );

      assert.strictEqual(
        session.hasApplied(op1.id),
        true,
      );

      assert.strictEqual(session.getPendingOperations().length, 0);

      // Queue remote operation
      const remoteOp = {
        id: "remote-op-1",
        peerId: "peer-beta",
        clock: 3,
        timestamp: Date.now(),
        type: "insert" as const,
        path: "src/main.ts",
        payload: { char: "B", position: 1 },
      };

      const queued = session.queueOperation(remoteOp);
      assert.ok(queued);
      assert.strictEqual(session.getClock("peer-beta"), 3);
      assert.strictEqual(session.getPendingOperations().length, 1);

      // Idempotent rejection
      const duplicateQueued = session.queueOperation(remoteOp);
      assert.strictEqual(duplicateQueued, false);
      assert.strictEqual(session.getPendingOperations().length, 1);
    });
    it("should create a versioned Git history across multiple CRDT checkpoints", () => {
      const author = {
        name: "Alice",
        email: "alice@example.com",
        timestamp: 1000,
      };

      const repo = new Repository("chat");

      const session = repo.createCRDTSession("main", "alice", "session-1");

      // Version 1
      session.setState("content", "Hello");

      const firstCommit = repo.checkpointSession(
        session,
        author,
        "Checkpoint 1",
      );

      // Change collaborative state
      session.setState("content", "Hello world");

      // Version 2
      const secondCommit = repo.checkpointSession(
        session,
        author,
        "Checkpoint 2",
      );

      // C2 should point to C1
      assert.deepStrictEqual(secondCommit.parentIds, [firstCommit.id]);

      // Branch should now point to C2
      assert.strictEqual(repo.currentCommitId, secondCommit.id);

      // The two versions must have different trees
      assert.notStrictEqual(firstCommit.treeId, secondCommit.treeId);
    });
    it("should not apply a created operation until it is explicitly applied", () => {
      const session = new CRDTSession({
        peerId: "alice",
        branchName: "main",
        sessionId: "session-1",
      });

      const operation = session.createOperation("update", "Hello", "content");

      assert.ok(operation);
      assert.strictEqual(session.getState("content"), undefined);
    });
    it("should apply an update operation to CRDT state", () => {
      const session = new CRDTSession({
        peerId: "alice",
        branchName: "main",
        sessionId: "session-1",
      });

      const operation = session.createOperation(
        "update",
        "Hello world",
        "content",
      );

      session.applyOperation(operation);

      assert.strictEqual(session.getState("content"), "Hello world");
    });
    it("should apply the same operation only once", () => {
      const session = new CRDTSession({
        peerId: "alice",
        branchName: "main",
        sessionId: "session-1",
      });

      const operation = session.createOperation("update", "Hello", "content");

      const first = session.applyOperation(operation);
      const second = session.applyOperation(operation);

      assert.strictEqual(first, true);
      assert.strictEqual(second, false);

      assert.strictEqual(session.getState("content"), "Hello");
    });
    it("should apply the same operation only once", () => {
      const session = new CRDTSession({
        peerId: "alice",
        branchName: "main",
        sessionId: "session-1",
      });

      const operation = session.createOperation("update", "Hello", "content");

      const first = session.applyOperation(operation);
      const second = session.applyOperation(operation);

      assert.strictEqual(first, true);
      assert.strictEqual(second, false);

      assert.strictEqual(session.getState("content"), "Hello");
    });
    it("should serialize and restore CRDTSession state", () => {
      const session = new CRDTSession({
        sessionId: "session-xyz",
        peerId: "peer-1",
        branchName: "dev",
      });
      session.createOperation("update", { status: "in-progress" }, "status");
      session.setState("activeFile", "index.ts");

      const serialized = session.serialize();
      const restored = CRDTSession.deserialize(serialized);

      assert.strictEqual(restored.sessionId, "session-xyz");
      assert.strictEqual(restored.peerId, "peer-1");
      assert.strictEqual(restored.branchName, "dev");
      assert.strictEqual(restored.getState("activeFile"), "index.ts");
      assert.strictEqual(restored.getPendingOperations().length, 1);
    });
    it("should export the current CRDT state", () => {
      const session = new CRDTSession({
        peerId: "alice",
        branchName: "main",
        sessionId: "session-1",
      });

      session.setState("title", "My Chat");
      session.setState("content", "Hello world");

      const exported = session.exportState();

      assert.deepStrictEqual(exported, {
        title: "My Chat",
        content: "Hello world",
      });
    });
    it("should return an independent copy of the CRDT state", () => {
      const session = new CRDTSession({
        peerId: "alice",
        branchName: "main",
        sessionId: "session-1",
      });

      session.setState("title", "Original");

      const exported = session.exportState();

      exported.title = "Modified";

      assert.strictEqual(session.getState("title"), "Original");
    });
    it("should produce the same exported state for identical state", () => {
      const session1 = new CRDTSession({
        peerId: "alice",
        branchName: "main",
        sessionId: "session-1",
      });

      const session2 = new CRDTSession({
        peerId: "bob",
        branchName: "main",
        sessionId: "session-2",
      });

      session1.setState("title", "My Chat");
      session1.setState("content", "Hello");

      session2.setState("title", "My Chat");
      session2.setState("content", "Hello");

      assert.deepStrictEqual(session1.exportState(), session2.exportState());
    });
    it("should insert into an empty sequence", () => {
      const session = new CRDTSession({
        peerId: "alice",
        branchName: "main",
      });

      const op = session.createOperation(
        "insert",
        { char: "A", position: 0 },
        "src/main.ts",
      );

      session.applyOperation(op);

      const items = session.getState<Array<{ char: string; position: number }>>("src/main.ts");
      assert.ok(Array.isArray(items));
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].char, "A");
    });
    it("should insert at the beginning of a sequence", () => {
      const session = new CRDTSession({
        peerId: "alice",
        branchName: "main",
      });

      session.setState("chars", [{ char: "B" }]);

      const op = session.createOperation(
        "insert",
        { char: "A", position: 0 },
        "chars",
      );

      session.applyOperation(op);

      const items = session.getState<Array<{ char: string }>>("chars");
      assert.deepStrictEqual(
        items?.map((item) => item.char),
        ["A", "B"],
      );
    });
    it("should insert into the middle of a sequence", () => {
      const session = new CRDTSession({
        peerId: "alice",
        branchName: "main",
      });

      session.setState("chars", [{ char: "A" }, { char: "C" }]);

      const op = session.createOperation(
        "insert",
        { char: "B", position: 1 },
        "chars",
      );

      session.applyOperation(op);

      const items = session.getState<Array<{ char: string }>>("chars");
      assert.deepStrictEqual(
        items?.map((item) => item.char),
        ["A", "B", "C"],
      );
    });
    it("should insert at the end of a sequence", () => {
      const session = new CRDTSession({
        peerId: "alice",
        branchName: "main",
      });

      session.setState("chars", [{ char: "A" }, { char: "B" }]);

      const op = session.createOperation(
        "insert",
        { char: "C", position: 2 },
        "chars",
      );

      session.applyOperation(op);

      const items = session.getState<Array<{ char: string }>>("chars");
      assert.deepStrictEqual(
        items?.map((item) => item.char),
        ["A", "B", "C"],
      );
    });
    it("should clamp invalid negative position to beginning", () => {
      const session = new CRDTSession({
        peerId: "alice",
        branchName: "main",
      });

      session.setState("chars", [{ char: "B" }]);

      const op = session.createOperation(
        "insert",
        { char: "A", position: -5 },
        "chars",
      );

      session.applyOperation(op);

      const items = session.getState<Array<{ char: string }>>("chars");
      assert.deepStrictEqual(
        items?.map((item) => item.char),
        ["A", "B"],
      );
    });
    it("should clamp invalid oversized position to end", () => {
      const session = new CRDTSession({
        peerId: "alice",
        branchName: "main",
      });

      session.setState("chars", [{ char: "A" }]);

      const op = session.createOperation(
        "insert",
        { char: "B", position: 999 },
        "chars",
      );

      session.applyOperation(op);

      const items = session.getState<Array<{ char: string }>>("chars");
      assert.deepStrictEqual(
        items?.map((item) => item.char),
        ["A", "B"],
      );
    });
    it("should reject duplicate insert operation and preserve sequence", () => {
      const session = new CRDTSession({
        peerId: "alice",
        branchName: "main",
      });

      const op = session.createOperation(
        "insert",
        { char: "A", position: 0 },
        "chars",
      );

      const firstApply = session.applyOperation(op);
      const secondApply = session.applyOperation(op);

      assert.strictEqual(firstApply, true);
      assert.strictEqual(secondApply, false);

      const items = session.getState<Array<{ char: string }>>("chars");
      assert.strictEqual(items?.length, 1);
    });
    it("should reject an operation with an empty or missing ID", () => {
      const session = new CRDTSession({ peerId: "alice", branchName: "main" });
      const badOp = {
        id: "",
        peerId: "alice",
        clock: 1,
        timestamp: Date.now(),
        type: "update" as const,
        path: "title",
        payload: "Doc",
      };
      assert.throws(() => session.applyOperation(badOp));
      assert.throws(() => session.queueOperation(badOp));
    });
    it("should reject an operation with an empty or missing peerId", () => {
      const session = new CRDTSession({ peerId: "alice", branchName: "main" });
      const badOp = {
        id: "op-1",
        peerId: "   ",
        clock: 1,
        timestamp: Date.now(),
        type: "update" as const,
        path: "title",
        payload: "Doc",
      };
      assert.throws(() => session.applyOperation(badOp));
      assert.throws(() => session.queueOperation(badOp));
    });
    it("should reject an operation with a negative or non-integer clock", () => {
      const session = new CRDTSession({ peerId: "alice", branchName: "main" });
      const negativeClockOp = {
        id: "op-neg",
        peerId: "alice",
        clock: -1,
        timestamp: Date.now(),
        type: "update" as const,
        path: "title",
        payload: "Doc",
      };
      const floatClockOp = {
        id: "op-float",
        peerId: "alice",
        clock: 1.5,
        timestamp: Date.now(),
        type: "update" as const,
        path: "title",
        payload: "Doc",
      };
      assert.throws(() => session.applyOperation(negativeClockOp));
      assert.throws(() => session.applyOperation(floatClockOp));
    });
    it("should reject an operation with an unsupported type", () => {
      const session = new CRDTSession({ peerId: "alice", branchName: "main" });
      const badOp = {
        id: "op-bad-type",
        peerId: "alice",
        clock: 1,
        timestamp: Date.now(),
        type: "invalid_type" as any,
        path: "title",
        payload: "Doc",
      };
      assert.throws(() => session.applyOperation(badOp));
    });
    it("should reject an update, insert, or delete operation with an empty path", () => {
      const session = new CRDTSession({ peerId: "alice", branchName: "main" });
      const noPathOp = {
        id: "op-no-path",
        peerId: "alice",
        clock: 1,
        timestamp: Date.now(),
        type: "delete" as const,
        path: "",
        payload: null,
      };
      assert.throws(() => session.applyOperation(noPathOp));
    });
    it("should reject an update or insert operation with an undefined payload", () => {
      const session = new CRDTSession({ peerId: "alice", branchName: "main" });
      const noPayloadOp = {
        id: "op-no-payload",
        peerId: "alice",
        clock: 1,
        timestamp: Date.now(),
        type: "update" as const,
        path: "title",
        payload: undefined as any,
      };
      assert.throws(() => session.applyOperation(noPayloadOp));
    });
  });

  describe("6. Repository", () => {
    it("should store objects, create commits, manage branches, and CRDT sessions", () => {
      const repo = new Repository("test-repo");

      // 1. Store blobs
      const blob = repo.storeObject(
        Blob.fromString('console.log("Hello from repo");'),
      );
      assert.ok(repo.hasObject(blob.id));
      assert.strictEqual(
        repo.getBlob(blob.id)?.getContentAsString(),
        'console.log("Hello from repo");',
      );

      // 2. Store tree
      const tree = new Tree();
      tree.addBlob("index.js", blob.id);
      repo.storeObject(tree);
      assert.ok(repo.hasObject(tree.id));

      // 3. Create initial commit
      const author = {
        name: "Dev",
        email: "dev@example.com",
        timestamp: Date.now(),
      };
      const commit1 = repo.createCommit({
        treeId: tree.id,
        author,
        message: "Initial commit",
      });

      assert.strictEqual(repo.currentCommitId, commit1.id);
      assert.strictEqual(repo.getBranch("main")?.headCommitId, commit1.id);

      // 4. Create and checkout new branch
      repo.checkout("feature/crdt-sync", { createBranch: true });
      assert.strictEqual(repo.head.target, "feature/crdt-sync");

      // 5. Create commit on new branch
      const blob2 = repo.storeObject(
        Blob.fromString("export const crdt = true;"),
      );
      const tree2 = repo.storeObject(new Tree().addBlob("crdt.js", blob2.id));
      const commit2 = repo.createCommit({
        treeId: tree2.id,
        author,
        message: "Add CRDT support",
      });

      assert.strictEqual(repo.currentCommitId, commit2.id);
      assert.strictEqual(
        repo.getBranch("feature/crdt-sync")?.headCommitId,
        commit2.id,
      );

      // 6. Switch back to main
      repo.checkout("main");
      assert.strictEqual(repo.currentCommitId, commit1.id);

      // 7. Create CRDT session
      const session = repo.createCRDTSession("feature/crdt-sync", "peer-local");
      assert.strictEqual(session.branchName, "feature/crdt-sync");
      assert.strictEqual(repo.listCRDTSessions().length, 1);
      assert.strictEqual(
        repo.getCRDTSession(session.sessionId)?.peerId,
        "peer-local",
      );

      // 8. Repository full serialization & restoration
      const serialized = repo.serialize();
      const restored = Repository.deserialize(serialized);

      assert.strictEqual(restored.name, "test-repo");
      assert.strictEqual(restored.objectCount, repo.objectCount);
      assert.strictEqual(restored.listBranches().length, 2);
      assert.strictEqual(restored.getBranch("main")?.headCommitId, commit1.id);
      assert.strictEqual(
        restored.getBranch("feature/crdt-sync")?.headCommitId,
        commit2.id,
      );
      assert.strictEqual(restored.listCRDTSessions().length, 1);
    });
  });
  it("should retrieve commit parents", () => {
    const author = {
      name: "Alice",
      email: "alice@example.com",
      timestamp: 1000,
    };

    const repo = new Repository("test");

    const c1 = repo.createCommit({
      treeId: "tree-1",
      author,
      message: "Initial",
    });

    const c2 = repo.createCommit({
      treeId: "tree-2",
      author,
      message: "Second",
    });

    const parents = repo.getCommitParents(c2.id);

    assert.strictEqual(parents.length, 1);
    assert.strictEqual(parents[0].id, c1.id);
  });
  it("should find all ancestors of a commit", () => {
    const author = {
      name: "Alice",
      email: "alice@example.com",
      timestamp: 1000,
    };

    const repo = new Repository("test");

    const c1 = repo.createCommit({
      treeId: "tree-1",
      author,
      message: "Initial",
    });

    const c2 = repo.createCommit({
      treeId: "tree-2",
      author,
      message: "Second",
    });

    const c3 = repo.createCommit({
      treeId: "tree-3",
      author,
      message: "Third",
    });

    const ancestors = repo.getAncestors(c3.id);

    assert.strictEqual(ancestors.has(c1.id), true);
    assert.strictEqual(ancestors.has(c2.id), true);
    assert.strictEqual(ancestors.has(c3.id), false);
  });
  it("should determine whether one commit is an ancestor of another", () => {
    const author = {
      name: "Alice",
      email: "alice@example.com",
      timestamp: 1000,
    };

    const repo = new Repository("test");

    const c1 = repo.createCommit({
      treeId: "tree-1",
      author,
      message: "Initial",
    });

    const c2 = repo.createCommit({
      treeId: "tree-2",
      author,
      message: "Second",
    });

    const c3 = repo.createCommit({
      treeId: "tree-3",
      author,
      message: "Third",
    });

    assert.strictEqual(repo.isAncestor(c1.id, c3.id), true);

    assert.strictEqual(repo.isAncestor(c3.id, c1.id), false);
  });
  it("should find common ancestor in linear history", () => {
    const author = {
      name: "Alice",
      email: "alice@example.com",
      timestamp: 1000,
    };

    const repo = new Repository("test");

    const c1 = repo.createCommit({
      treeId: "tree-1",
      author,
      message: "Initial",
    });

    const c2 = repo.createCommit({
      treeId: "tree-2",
      author,
      message: "Second",
    });

    const c3 = repo.createCommit({
      treeId: "tree-3",
      author,
      message: "Third",
    });

    const ancestor = repo.findCommonAncestor(c2.id, c3.id);

    assert.ok(ancestor);
    assert.strictEqual(ancestor.id, c2.id);
  });
  it("should find common ancestor of two branches", () => {
    const author = {
      name: "Alice",
      email: "alice@example.com",
      timestamp: 1000,
    };

    const repo = new Repository("test");

    const c1 = repo.createCommit({
      treeId: "tree-1",
      author,
      message: "Initial",
    });

    const c2 = repo.createCommit({
      treeId: "tree-2",
      author,
      message: "Base",
    });

    const c3 = repo.createCommit({
      treeId: "tree-3",
      author,
      message: "Branch A",
      parentIds: [c2.id],
    });

    const c4 = repo.createCommit({
      treeId: "tree-4",
      author,
      message: "Branch B",
      parentIds: [c2.id],
    });

    const ancestor = repo.findCommonAncestor(c3.id, c4.id);

    assert.ok(ancestor);
    assert.strictEqual(ancestor.id, c2.id);
  });
  it("should find the nearest common ancestor in a merge DAG", () => {
    const author = {
      name: "Alice",
      email: "alice@example.com",
      timestamp: 1000,
    };

    const repo = new Repository("test");

    const c1 = repo.createCommit({
      treeId: "tree-1",
      author,
      message: "Initial",
    });

    const c2 = repo.createCommit({
      treeId: "tree-2",
      author,
      message: "Base",
    });

    const c3 = repo.createCommit({
      treeId: "tree-3",
      author,
      message: "Branch A start",
      parentIds: [c2.id],
    });

    const c4 = repo.createCommit({
      treeId: "tree-4",
      author,
      message: "Branch B start",
      parentIds: [c2.id],
    });

    const c5 = repo.createCommit({
      treeId: "tree-5",
      author,
      message: "Branch A second",
      parentIds: [c3.id],
    });

    const c6 = repo.createCommit({
      treeId: "tree-6",
      author,
      message: "Branch B second",
      parentIds: [c4.id],
    });

    const ancestor = repo.findCommonAncestor(c5.id, c6.id);

    assert.ok(ancestor);
    assert.strictEqual(ancestor.id, c2.id);
  });
  it("should return the commit itself when both inputs are the same", () => {
    const author = {
      name: "Alice",
      email: "alice@example.com",
      timestamp: 1000,
    };

    const repo = new Repository("test");

    const c1 = repo.createCommit({
      treeId: "tree-1",
      author,
      message: "Initial",
    });

    const ancestor = repo.findCommonAncestor(c1.id, c1.id);

    assert.ok(ancestor);
    assert.strictEqual(ancestor.id, c1.id);
  });
  it("should return undefined when commits have no common ancestor", () => {
    const author = {
      name: "Alice",
      email: "alice@example.com",
      timestamp: 1000,
    };

    const repo = new Repository("test");

    const c1 = repo.createCommit({
      treeId: "tree-1",
      author,
      message: "First history",
      parentIds: [],
    });

    const c2 = repo.createCommit({
      treeId: "tree-2",
      author,
      message: "Unrelated history",
      parentIds: [],
    });

    const ancestor = repo.findCommonAncestor(c1.id, c2.id);

    assert.strictEqual(ancestor, undefined);
  });
  it("should initialize the default branch with no commit", () => {
    const repo = new Repository("test");

    const main = repo.getBranch("main");

    assert.ok(main);
    assert.strictEqual(main.headCommitId, null);
    assert.strictEqual(repo.currentCommitId, null);
  });
  it("should advance the current branch after creating a commit", () => {
    const repo = new Repository("test");

    const author = {
      name: "Alice",
      email: "alice@example.com",
      timestamp: 1000,
    };

    const commit = repo.createCommit({
      treeId: "tree-1",
      author,
      message: "Initial commit",
    });

    assert.strictEqual(repo.getBranch("main")?.headCommitId, commit.id);

    assert.strictEqual(repo.currentCommitId, commit.id);
  });
  it("should create a branch pointing to the current commit", () => {
    const repo = new Repository("test");

    const author = {
      name: "Alice",
      email: "alice@example.com",
      timestamp: 1000,
    };

    const c1 = repo.createCommit({
      treeId: "tree-1",
      author,
      message: "Initial",
    });

    const feature = repo.createBranch("feature");

    assert.strictEqual(feature.headCommitId, c1.id);
  });
  it("should advance only the checked-out branch", () => {
    const repo = new Repository("test");

    const author = {
      name: "Alice",
      email: "alice@example.com",
      timestamp: 1000,
    };

    const c1 = repo.createCommit({
      treeId: "tree-1",
      author,
      message: "Initial",
    });

    repo.checkout("feature", {
      createBranch: true,
    });

    const c2 = repo.createCommit({
      treeId: "tree-2",
      author,
      message: "Feature work",
    });

    assert.strictEqual(repo.getBranch("main")?.headCommitId, c1.id);

    assert.strictEqual(repo.getBranch("feature")?.headCommitId, c2.id);
  });
  it("should switch HEAD between branches", () => {
    const repo = new Repository("test");

    const author = {
      name: "Alice",
      email: "alice@example.com",
      timestamp: 1000,
    };

    const c1 = repo.createCommit({
      treeId: "tree-1",
      author,
      message: "Initial",
    });

    repo.createBranch("feature");

    repo.checkout("feature");

    assert.strictEqual(repo.head.type, "branch");

    assert.strictEqual(repo.head.target, "feature");

    assert.strictEqual(repo.currentCommitId, c1.id);
  });
  it("should support detached HEAD without moving the branch", () => {
    const repo = new Repository("test");

    const author = {
      name: "Alice",
      email: "alice@example.com",
      timestamp: 1000,
    };

    const c1 = repo.createCommit({
      treeId: "tree-1",
      author,
      message: "Initial",
    });

    const c2 = repo.createCommit({
      treeId: "tree-2",
      author,
      message: "Second",
    });

    repo.checkout(c1.id, {
      detach: true,
    });

    assert.strictEqual(repo.head.type, "detached");

    assert.strictEqual(repo.currentCommitId, c1.id);

    assert.strictEqual(repo.getBranch("main")?.headCommitId, c2.id);
  });
  it("should not allow deleting the checked-out branch", () => {
    const repo = new Repository("test");

    assert.throws(() => {
      repo.deleteBranch("main");
    });
  });
  it("should checkpoint a CRDT session into a Git commit", () => {
    const author = {
      name: "Alice",
      email: "alice@example.com",
      timestamp: 1000,
    };

    const repo = new Repository("chat");

    const session = repo.createCRDTSession("main", "alice", "session-1");

    session.setState("title", "My Chat");
    session.setState("content", "Hello world");

    const commit = repo.checkpointSession(session, author, "Save chat");

    assert.ok(commit);

    assert.strictEqual(repo.currentCommitId, commit.id);

    assert.ok(repo.getCommit(commit.id));
  });
  it("should create Blob and Tree objects for a CRDT checkpoint", () => {
    const author = {
      name: "Alice",
      email: "alice@example.com",
      timestamp: 1000,
    };

    const repo = new Repository("chat");

    const session = repo.createCRDTSession("main", "alice", "session-1");

    session.setState("title", "My Chat");
    session.setState("content", "Hello world");

    const commit = repo.checkpointSession(session, author, "Save chat");

    const tree = repo.getTree(commit.treeId);

    assert.ok(tree);

    const titleEntry = tree.getEntry("state.json");

    assert.ok(titleEntry);
    assert.strictEqual(titleEntry.type, "blob");

    const blob = repo.getBlob(titleEntry.id);

    assert.ok(blob);

    assert.deepStrictEqual(
      blob.getContentAsString(),
      JSON.stringify(session.exportState()),
    );
  });
});
