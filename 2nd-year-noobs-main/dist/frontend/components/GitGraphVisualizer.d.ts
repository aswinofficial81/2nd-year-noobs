import React from 'react';
interface GitGraphVisualizerProps {
    onSelectCommit?: (commitId: string) => void;
    onRestoreSession: (commitId: string) => void;
}
export declare const GitGraphVisualizer: React.FC<GitGraphVisualizerProps>;
export {};
