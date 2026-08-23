import { CRDTSession } from './CRDTSession.js';
/**
 * CollaborativeDocument provides a high-level text document editing model
 * powered by underlying CRDTSession operations.
 */
export class CollaborativeDocument {
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
    setTitle(title) {
        const op = this.session.createOperation('update', title, 'title');
        this.session.applyOperation(op);
    }
    getTitle() {
        return this.session.getState('title') ?? '';
    }
    insertText(text, startPosition = 0) {
        const chars = text.split('');
        chars.forEach((char, idx) => {
            const op = this.session.createOperation('insert', { char, position: startPosition + idx }, 'content');
            this.session.applyOperation(op);
        });
    }
    getText() {
        const items = this.session.getState('content') ?? [];
        if (!Array.isArray(items))
            return '';
        return items
            .map((item) => (typeof item === 'string' ? item : item.char ?? ''))
            .join('');
    }
    setMetadata(key, value) {
        const op = this.session.createOperation('update', value, `meta_${key}`);
        this.session.applyOperation(op);
    }
    getMetadata(key) {
        return this.session.getState(`meta_${key}`);
    }
    syncWith(otherDoc) {
        this.session.syncWith(otherDoc.session);
    }
    export() {
        return {
            title: this.getTitle(),
            text: this.getText(),
            rawState: this.session.exportState(),
        };
    }
}
//# sourceMappingURL=CollaborativeDocument.js.map