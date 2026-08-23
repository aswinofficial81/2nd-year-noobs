import React from 'react';
interface CommitInspectorModalProps {
    commitId: string;
    onClose: () => void;
    onRestoreSession: (commitId: string) => void;
}
export declare const CommitInspectorModal: React.FC<CommitInspectorModalProps>;
export {};
