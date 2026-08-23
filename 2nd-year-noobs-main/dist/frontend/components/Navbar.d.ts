import React from 'react';
interface NavbarProps {
    repoName: string;
    activeBranch: string;
    branches: Array<{
        name: string;
        commitId: string | null;
    }>;
    currentCommitId: string | null;
    stats: {
        commits: number;
        trees: number;
        blobs: number;
        totalObjects: number;
    };
    wsConnected: boolean;
    theme: 'dark' | 'light';
    onToggleTheme: () => void;
    onBranchChange: (branch: string) => void;
    onCreateBranch: (branchName: string) => void;
    onRefresh: () => void;
    onQuickCheckpoint: () => void;
}
export declare const Navbar: React.FC<NavbarProps>;
export {};
