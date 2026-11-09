import { describe, it, expect } from 'vitest';
import { SCENARIOS, ScenarioEngine } from '../src/engine/ScenarioEngine.js';

describe('Simulation Lab Scenario Generator Tests', () => {
  it('should include all 6 mandatory demonstration scenarios', () => {
    expect(SCENARIOS.length).toBe(6);
    const scenarioIds = SCENARIOS.map(s => s.id);
    expect(scenarioIds).toContain('scenario-1');
    expect(scenarioIds).toContain('scenario-2');
    expect(scenarioIds).toContain('scenario-3');
    expect(scenarioIds).toContain('scenario-4');
    expect(scenarioIds).toContain('scenario-5');
    expect(scenarioIds).toContain('scenario-6');
  });

  it('should deterministically generate scenario playback queue', () => {
    const engine = new ScenarioEngine();
    const queue = engine.loadScenario('scenario-1');
    expect(queue.length).toBe(4);
    expect(queue[0].action).toBe('USER_LOGIN_ATTEMPT');
    expect(queue[3].action).toBe('USER_LOGIN_SUCCESS');
  });
});
