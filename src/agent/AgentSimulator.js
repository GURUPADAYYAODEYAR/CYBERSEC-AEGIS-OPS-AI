import { PolicyEvaluator } from './PolicyEvaluator.js';

/**
 * Deterministic Simulated AI Agent for Security Testing.
 */
export class AgentSimulator {
  /**
   * Run a simulation step with provided policy, prompt, document, and proposed action.
   */
  static runStep({ agentName, systemPolicy, userPrompt, retrievedDocument, proposedAction }) {
    const evaluation = PolicyEvaluator.evaluate({
      systemPolicy,
      userPrompt,
      retrievedDocument,
      proposedAction
    });

    let simulatedOutput = '';
    let executed = false;

    if (evaluation.decision === 'ALLOWED') {
      executed = true;
      simulatedOutput = `[SIMULATION RESULT: SUCCESS] Executed tool "${proposedAction?.tool || 'none'}". Action verified safe against system boundaries.`;
    } else {
      executed = false;
      simulatedOutput = `[SIMULATION RESULT: BLOCKED] Action halted by AgentGuard policy gatekeeper. Reason: ${evaluation.reason}`;
    }

    return {
      agentName: agentName || 'Simulated Assistant',
      timestamp: new Date().toISOString(),
      evaluation,
      executed,
      simulatedOutput
    };
  }
}

