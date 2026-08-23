import { CRDTSession } from './CRDTSession.js';
import { computeHash } from '../utils/hash.js';

export interface ChatMessage {
  id: string;
  author: string;
  content: string;
  timestamp: number;
  reactions?: Record<string, string[]>; // emoji -> [peerIds]
}

/**
 * CollaborativeChat provides a real-time message stream model
 * with reaction and thread support powered by CRDT operations.
 */
export class CollaborativeChat {
  public readonly session: CRDTSession;

  constructor(
    sessionOrParams:
      | CRDTSession
      | { peerId: string; branchName?: string; sessionId?: string },
  ) {
    if (sessionOrParams instanceof CRDTSession) {
      this.session = sessionOrParams;
    } else {
      this.session = new CRDTSession({
        peerId: sessionOrParams.peerId,
        branchName: sessionOrParams.branchName ?? 'main',
        sessionId: sessionOrParams.sessionId,
      });
    }
  }

  public get peerId(): string {
    return this.session.peerId;
  }

  public postMessage(content: string, author?: string): ChatMessage {
    const timestamp = Date.now();
    const authorName = author ?? this.session.peerId;
    const id = `msg-${computeHash(
      `${this.session.sessionId}:${authorName}:${timestamp}:${content}`,
    ).slice(0, 12)}`;

    const message: ChatMessage = {
      id,
      author: authorName,
      content,
      timestamp,
      reactions: {},
    };

    const op = this.session.createOperation<ChatMessage>(
      'insert',
      message,
      'messages',
    );
    this.session.applyOperation(op);
    return message;
  }

  public getMessages(): ChatMessage[] {
    const raw = this.session.getState<ChatMessage[]>('messages');
    if (!Array.isArray(raw)) return [];
    return [...raw];
  }

  public addReaction(messageId: string, emoji: string, user: string): boolean {
    const messages = this.getMessages();
    const targetIdx = messages.findIndex((m) => m.id === messageId);
    if (targetIdx === -1) return false;

    const targetMsg = { ...messages[targetIdx] };
    const reactions = { ...(targetMsg.reactions ?? {}) };
    const users = new Set(reactions[emoji] ?? []);
    users.add(user);
    reactions[emoji] = Array.from(users);
    targetMsg.reactions = reactions;

    const op = this.session.createOperation(
      'update',
      targetMsg,
      `msg_reaction_${messageId}`,
    );
    this.session.applyOperation(op);

    // Update the message in array as well
    messages[targetIdx] = targetMsg;
    this.session.setState('messages', messages);
    return true;
  }

  public syncWith(otherChat: CollaborativeChat): void {
    this.session.syncWith(otherChat.session);
  }
}
