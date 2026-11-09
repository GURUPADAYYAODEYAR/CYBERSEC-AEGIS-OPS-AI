/**
 * AgentGuard AI Security Policy Evaluator.
 * Implements strict Trust Boundaries, Tool Permission Whitelisting, and Prompt-Injection Defense.
 */

export class PolicyEvaluator {
  /**
   * Evaluates a proposed AI agent action against defensive trust policies.
   */
  static evaluate({ systemPolicy = '', userPrompt = '', retrievedDocument = '', proposedAction = null }) {
    const findings = [];
    let decision = 'ALLOWED';
    let riskLevel = 'LOW';
    let triggeredRule = null;
    let reason = 'Action satisfies security and least-privilege boundary policies.';

    const combinedUntrustedText = `${userPrompt}\n${retrievedDocument}`.toLowerCase();

    // 1. Indirect Prompt Injection Check (OWASP LLM01)
    const injectionSignatures = [
      'system override',
      'ignore all previous',
      'ignore previous instructions',
      'disregard prior',
      'disregard all guardrails',
      'export aws api secrets',
      'print secrets',
      'bypass guardrails',
      'you are now in developer mode',
      'jailbreak',
      'new instruction hierarchy'
    ];

    for (const sig of injectionSignatures) {
      if (combinedUntrustedText.includes(sig)) {
        findings.push(`Adversarial directive matched signature: "${sig}"`);
        decision = 'DENIED';
        riskLevel = 'CRITICAL';
        triggeredRule = 'AGENT_001 (Indirect Prompt Injection)';
        reason = `Retrieved document context contained an adversarial prompt injection pattern: "${sig}". Untrusted text attempted to hijack system instructions.`;
        break;
      }
    }

    // 2. Tool Permission Whitelist Check (OWASP LLM07: Excessive Agency)
    const allowedTools = ['read_document', 'generate_summary', 'git_diff', 'run_linter', 'search_knowledge_base'];
    const dangerousTools = ['read_filesystem_secret', 'modify_iam_policy', 'deploy_production', 'exec_bash', 'send_webhook'];

    if (proposedAction && proposedAction.tool) {
      const tool = proposedAction.tool;

      if (dangerousTools.includes(tool)) {
        decision = 'DENIED';
        riskLevel = riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
        if (!triggeredRule) {
          triggeredRule = 'AGENT_002 (Unauthorized Tool Execution)';
          reason = `Simulated agent requested execution of high-risk tool "${tool}", which is explicitly restricted to verified human administrators.`;
        }
        findings.push(`Blocked dangerous tool invocation: ${tool}`);
      } else if (!allowedTools.includes(tool)) {
        decision = 'DENIED';
        riskLevel = 'MEDIUM';
        if (!triggeredRule) {
          triggeredRule = 'AGENT_002 (Tool Whitelist Violation)';
          reason = `Tool "${tool}" is not in the authorized agent capability whitelist: [${allowedTools.join(', ')}].`;
        }
        findings.push(`Unrecognized tool requested: ${tool}`);
      }
    }

    // 3. Sensitive Data Exfiltration / DLP Boundary Check (OWASP LLM06)
    const creditCardRegex = /\b(?:\d{4}[ -]?){3}\d{4}\b/;
    const awsKeyRegex = /(?:AKIA[0-9A-Z]{16})|(?:~?\/?\.aws\/credentials)/i;

    const actionPayloadStr = JSON.stringify(proposedAction || {});
    if (creditCardRegex.test(actionPayloadStr) || creditCardRegex.test(combinedUntrustedText)) {
      if (proposedAction && (proposedAction.tool === 'send_webhook' || proposedAction.tool === 'export_data')) {
        decision = 'DENIED';
        riskLevel = 'CRITICAL';
        if (!triggeredRule) {
          triggeredRule = 'AGENT_003 (Sensitive Data Egress Violation)';
          reason = 'Payload contained payment card numbers (PCI-DSS violation) destined for an external network destination.';
        }
        findings.push('DLP boundary triggered on credit card pattern.');
      }
    }

    if (awsKeyRegex.test(actionPayloadStr)) {
      decision = 'DENIED';
      riskLevel = 'CRITICAL';
      if (!triggeredRule) {
        triggeredRule = 'AGENT_003 (Credential Exfiltration Attempt)';
        reason = 'Proposed tool call targeted internal AWS credential storage (~/.aws/credentials).';
      }
      findings.push('DLP credential access intercepted.');
    }

    return {
      decision,
      riskLevel,
      triggeredRule,
      reason,
      findings,
      timestamp: new Date().toISOString()
    };
  }
}
