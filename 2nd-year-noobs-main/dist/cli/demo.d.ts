export interface DemoStepResult {
    step: string;
    details: string;
    state?: Record<string, unknown>;
}
/**
 * Runs an automated end-to-end hackathon demonstration of Git + CRDT collaboration.
 */
export declare function runHackathonDemo(outputDir?: string): Promise<DemoStepResult[]>;
