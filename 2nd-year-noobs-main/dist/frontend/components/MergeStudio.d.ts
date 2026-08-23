import React from 'react';
interface MergeStudioProps {
    branches: Array<{
        name: string;
        commitId: string | null;
    }>;
    activeBranch: string;
    onExecuteMerge: (targetBranch: string, sourceBranch: string) => Promise<any>;
    onRefreshDag: () => void;
}
export declare const MergeStudio: React.FC<MergeStudioProps>;
export {};
