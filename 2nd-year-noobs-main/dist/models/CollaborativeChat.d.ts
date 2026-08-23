import { CRDTSession } from './CRDTSession.js';
export interface ChatMessage {
    id: string;
    author: string;
    content: string;
    timestamp: number;
    reactions?: Record<string, string[]>;
}
/**
 * CollaborativeChat provides a real-time message stream model
 * with reaction and thread support powered by CRDT operations.
 */
export declare class CollaborativeChat {
    readonly session: CRDTSession;
    constructor(sessionOrParams: CRDTSession | {
        peerId: string;
        branchName?: string;
        sessionId?: string;
    });
    get peerId(): string;
    postMessage(content: string, author?: string): ChatMessage;
    getMessages(): ChatMessage[];
    addReaction(messageId: string, emoji: string, user: string): boolean;
    syncWith(otherChat: CollaborativeChat): void;
}
