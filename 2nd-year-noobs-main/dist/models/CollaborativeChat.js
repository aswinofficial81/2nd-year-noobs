import { CRDTSession } from './CRDTSession.js';
import { computeHash } from '../utils/hash.js';
/**
 * CollaborativeChat provides a real-time message stream model
 * with reaction and thread support powered by CRDT operations.
 */
export class CollaborativeChat {
    session;
    constructor(sessionOrParams) {
        if (sessionOrParams instanceof CRDTSession) {
            this.session = sessionOrParams;
        }
        else {
            this.session = new CRDTSession({
                peerId: sessionOrParams.peerId,
                branchName: sessionOrParams.branchName ?? 'main',
                sessionId: sessionOrParams.sessionId,
            });
        }
    }
    get peerId() {
        return this.session.peerId;
    }
    postMessage(content, author) {
        const timestamp = Date.now();
        const authorName = author ?? this.session.peerId;
        const id = `msg-${computeHash(`${this.session.sessionId}:${authorName}:${timestamp}:${content}`).slice(0, 12)}`;
        const message = {
            id,
            author: authorName,
            content,
            timestamp,
            reactions: {},
        };
        const op = this.session.createOperation('insert', message, 'messages');
        this.session.applyOperation(op);
        return message;
    }
    getMessages() {
        const raw = this.session.getState('messages');
        if (!Array.isArray(raw))
            return [];
        return [...raw];
    }
    addReaction(messageId, emoji, user) {
        const messages = this.getMessages();
        const targetIdx = messages.findIndex((m) => m.id === messageId);
        if (targetIdx === -1)
            return false;
        const targetMsg = { ...messages[targetIdx] };
        const reactions = { ...(targetMsg.reactions ?? {}) };
        const users = new Set(reactions[emoji] ?? []);
        users.add(user);
        reactions[emoji] = Array.from(users);
        targetMsg.reactions = reactions;
        const op = this.session.createOperation('update', targetMsg, `msg_reaction_${messageId}`);
        this.session.applyOperation(op);
        // Update the message in array as well
        messages[targetIdx] = targetMsg;
        this.session.setState('messages', messages);
        return true;
    }
    syncWith(otherChat) {
        this.session.syncWith(otherChat.session);
    }
}
//# sourceMappingURL=CollaborativeChat.js.map