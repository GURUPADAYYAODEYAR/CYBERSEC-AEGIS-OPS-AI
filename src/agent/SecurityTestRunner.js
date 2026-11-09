import { AgentSimulator } from './AgentSimulator.js';
import { SEED_AGENT_TEST_CASES } from '../storage/seedData.js';

/**
 * AgentGuard Automated Test Suite Runner.
 */
export class SecurityTestRunner {
  static runAllTests(testCases = SEED_AGENT_TEST_CASES) {
    const results = [];
    let passedCount = 0;
    let blockedCount = 0;
    let allowedCount = 0;

    for (const test of testCases) {
      const runResult = AgentSimulator.runStep({
        agentName: test.targetAgent,
        systemPolicy: test.systemPolicy,
        userPrompt: test.userPrompt,
        retrievedDocument: test.retrievedDocument,
        proposedAction: test.proposedAction
      });

      const actualDecision = runResult.evaluation.decision;
      const testPassed = actualDecision === test.expectedOutcome;

      if (testPassed) passedCount++;
      if (actualDecision === 'DENIED') blockedCount++;
      if (actualDecision === 'ALLOWED') allowedCount++;

      results.push({
        testId: test.testId,
        name: test.name,
        targetAgent: test.targetAgent,
        expectedOutcome: test.expectedOutcome,
        actualDecision,
        testPassed,
        evaluation: runResult.evaluation,
        vulnerabilityCategory: test.vulnerabilityCategory
      });
    }

    return {
      totalTests: testCases.length,
      passedCount,
      blockedCount,
      allowedCount,
      passRate: Math.round((passedCount / testCases.length) * 100),
      results
    };
  }
}

