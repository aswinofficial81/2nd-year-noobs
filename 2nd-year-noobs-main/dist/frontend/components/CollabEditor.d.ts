import React from 'react';
interface CollabEditorProps {
    activeBranch: string;
    currentPeer: string;
    peersList: Array<{
        id: string;
        name: string;
        color: string;
    }>;
    docState: {
        title: string;
        text: string;
        metadata: Record<string, unknown>;
    };
    vectorClock: Record<string, number>;
    opLog: Array<{
        id: string;
        peerId: string;
        clock: number;
        type: string;
        timestamp: number;
        payload?: any;
    }>;
    onEditDoc: (type: 'insert' | 'delete' | 'setTitle' | 'setMetadata', payload: any) => void;
    onCommitCheckpoint: (message: string) => void;
    onSyncPeers: (peerA: string, peerB: string) => void;
    onSelectPeer: (peerId: string) => void;
}
export declare const CollabEditor: React.FC<CollabEditorProps>;
export {};
