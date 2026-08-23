import { CRDTSession } from './CRDTSession.js';
export interface DocumentCharItem {
    char: string;
    position: number;
}
/**
 * CollaborativeDocument provides a high-level text document editing model
 * powered by underlying CRDTSession operations.
 */
export declare class CollaborativeDocument {
    readonly session: CRDTSession;
    constructor(sessionOrParams: CRDTSession | {
        peerId: string;
        branchName?: string;
        sessionId?: string;
    });
    get peerId(): string;
    setTitle(title: string): void;
    getTitle(): string;
    insertText(text: string, startPosition?: number): void;
    getText(): string;
    setMetadata(key: string, value: unknown): void;
    getMetadata<T = unknown>(key: string): T | undefined;
    syncWith(otherDoc: CollaborativeDocument): void;
    export(): {
        title: string;
        text: string;
        rawState: Record<string, unknown>;
    };
}
