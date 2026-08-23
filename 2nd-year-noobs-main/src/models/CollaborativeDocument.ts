import { CRDTSession } from './CRDTSession.js';

export interface DocumentCharItem {
  char: string;
  position: number;
}

/**
 * CollaborativeDocument provides a high-level text document editing model
 * powered by underlying CRDTSession operations.
 */
export class CollaborativeDocument {
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

  public setTitle(title: string): void {
    const op = this.session.createOperation('update', title, 'title');
    this.session.applyOperation(op);
  }

  public getTitle(): string {
    return (this.session.getState('title') as string) ?? '';
  }

  public insertText(text: string, startPosition: number = 0): void {
    const chars = text.split('');
    chars.forEach((char, idx) => {
      const op = this.session.createOperation<DocumentCharItem>(
        'insert',
        { char, position: startPosition + idx },
        'content',
      );
      this.session.applyOperation(op);
    });
  }

  public getText(): string {
    const items = (this.session.getState('content') as DocumentCharItem[]) ?? [];
    if (!Array.isArray(items)) return '';
    return items
      .map((item) => (typeof item === 'string' ? item : item.char ?? ''))
      .join('');
  }

  public setMetadata(key: string, value: unknown): void {
    const op = this.session.createOperation('update', value, `meta_${key}`);
    this.session.applyOperation(op);
  }

  public getMetadata<T = unknown>(key: string): T | undefined {
    return this.session.getState<T>(`meta_${key}`);
  }

  public syncWith(otherDoc: CollaborativeDocument): void {
    this.session.syncWith(otherDoc.session);
  }

  public export(): {
    title: string;
    text: string;
    rawState: Record<string, unknown>;
  } {
    return {
      title: this.getTitle(),
      text: this.getText(),
      rawState: this.session.exportState(),
    };
  }
}
