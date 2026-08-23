import React from 'react';
interface ChatMessage {
    id: string;
    author: string;
    text: string;
    timestamp: number;
    reactions?: Record<string, string[]>;
}
interface CollabChatProps {
    activeBranch: string;
    currentPeer: string;
    peersList: Array<{
        id: string;
        name: string;
        color: string;
    }>;
    messages: ChatMessage[];
    onSendMessage: (text: string, author: string) => void;
    onReactMessage: (messageId: string, emoji: string) => void;
    onCommitCheckpoint: (message: string) => void;
}
export declare const CollabChat: React.FC<CollabChatProps>;
export {};
