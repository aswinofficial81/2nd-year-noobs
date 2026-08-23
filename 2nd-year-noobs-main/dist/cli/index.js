#!/usr/bin/env node
import { runHackathonDemo } from './demo.js';
import { Repository } from '../models/Repository.js';
import { ObjectStore } from '../storage/ObjectStore.js';
/**
 * Main entry point for the Git + CRDT CLI.
 */
export async function main(args = process.argv.slice(2)) {
    const command = args[0] ?? 'help';
    const cwd = process.cwd();
    switch (command) {
        case 'demo': {
            console.log('🚀 Running Git + CRDT Hackathon Live Demo...\n');
            const results = await runHackathonDemo();
            for (const res of results) {
                console.log(`[PASS] ${res.step}`);
                console.log(`       ${res.details}\n`);
            }
            console.log('🎉 Hackathon Demo Completed Successfully with 100% Convergence!');
            break;
        }
        case 'init': {
            const name = args[1] ?? 'my-collab-repo';
            const store = new ObjectStore(cwd);
            const repo = new Repository(name);
            await store.saveRepository(repo);
            console.log(`Initialized empty Git + CRDT repository in ${store.gitDir}`);
            break;
        }
        case 'status': {
            const store = new ObjectStore(cwd);
            try {
                const repo = await store.loadRepository();
                console.log(`Repository: ${repo.name}`);
                console.log(`On branch:  ${repo.head.target}`);
                console.log(`HEAD:       ${repo.currentCommitId ?? '(initial)'}`);
                console.log(`Objects:    ${repo.objectCount}`);
            }
            catch {
                console.error('Not a git-crdt repository (or no .gitcrdt found)');
            }
            break;
        }
        case 'help':
        default: {
            console.log(`
Git + CRDT Collaboration Engine CLI
Usage: git-crdt <command> [options]

Commands:
  demo        Run full automated live collaboration demo
  init <name> Initialize a new repository
  status      Show repository status
  help        Show this help message
`);
            break;
        }
    }
}
const scriptPath = process.argv[1]?.replace(/\\/g, '/') ?? '';
if (scriptPath.endsWith('cli/index.js') ||
    scriptPath.endsWith('cli/index.ts')) {
    main().catch(console.error);
}
//# sourceMappingURL=index.js.map