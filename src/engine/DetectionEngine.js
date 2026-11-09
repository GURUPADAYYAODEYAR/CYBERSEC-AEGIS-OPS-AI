import { AuthenticationRules } from '../detection/AuthenticationRules.js';
import { CloudRules } from '../detection/CloudRules.js';
import { BehavioralDetector } from '../detection/BehavioralDetector.js';
import { StatisticalDetector } from '../detection/StatisticalDetector.js';

import {
  EventsRepository,
  IdentitiesRepository,
  CloudResourcesRepository,
  AlertsRepository
} from '../storage/repositories.js';

/**
 * Central Detection Engine.
 * Coordinates all security detection modules and persists unified findings.
 */
export class DetectionEngine {
  /**
   * Run full detection cycle over current database events, cloud configurations, and identities.
   */
  static async runFullDetection() {
    const [events, identities, cloudResources, existingAlerts] = await Promise.all([
      EventsRepository.getAll(),
      IdentitiesRepository.getAll(),
      CloudResourcesRepository.getAll(),
      AlertsRepository.getAll()
    ]);

    const newAlerts = [];
    const existingAlertIds = new Set(existingAlerts.map(a => a.alertId));

    // 1. Identity & Authentication Rules
    const authBursts = AuthenticationRules.detectFailedLoginBursts(events);
    const authSuccessAfterFail = AuthenticationRules.detectSuccessAfterFailures(events);
    const authImpossibleTravel = AuthenticationRules.detectImpossibleTravel(events, identities);
    const authUnseenDevices = AuthenticationRules.detectUnseenDevices(events, identities);
    const authPrivEscalation = AuthenticationRules.detectUnexpectedPrivilegeChanges(events);

    // 2. Behavioral Baseline Checks
    const behavioralAlerts = BehavioralDetector.detectOffHoursActivity(events, identities);

    // 3. Statistical Volume Anomaly Check
    const statisticalAlerts = StatisticalDetector.detectVolumeAnomalies(events);

    // 4. Cloud Posture Assessment Checks
    const cloudFindings = CloudRules.evaluateCloudPosture(cloudResources);
    const cloudAlerts = cloudFindings.map(f => ({
      alertId: `ALT-${f.findingId}`,
      ruleId: f.policyId,
      name: f.title,
      severity: f.severity,
      source: 'CloudFence_Posture',
      affectedEntity: f.resourceId,
      evidenceEventIds: [],
      timestamp: new Date().toISOString(),
      explanation: f.technicalExplanation,
      suggestedRemediation: f.suggestedRemediation,
      remediationAction: f.remediationAction
    }));

    // Gather all candidate alerts
    const allCandidates = [
      ...authBursts,
      ...authSuccessAfterFail,
      ...authImpossibleTravel,
      ...authUnseenDevices,
      ...authPrivEscalation,
      ...behavioralAlerts,
      ...statisticalAlerts,
      ...cloudAlerts
    ];

    // Filter duplicates
    for (const alert of allCandidates) {
      if (!existingAlertIds.has(alert.alertId)) {
        newAlerts.push(alert);
        existingAlertIds.add(alert.alertId);
      }
    }

    if (newAlerts.length > 0) {
      await AlertsRepository.addBatch(newAlerts);
    }

    // Recalculate identity risk scores deterministically
    await this.updateIdentityRiskScores(identities, [...existingAlerts, ...newAlerts]);

    return {
      totalAlertsEvaluated: allCandidates.length,
      newAlertsGenerated: newAlerts.length,
      alerts: [...existingAlerts, ...newAlerts]
    };
  }

  /**
   * Recalculates transparent risk scores for synthetic identities.
   */
  static async updateIdentityRiskScores(identities, allAlerts) {
    for (const identity of identities) {
      let score = 10; // Baseline
      const factors = [];

      const userAlerts = allAlerts.filter(a => a.affectedEntity === identity.userId);

      for (const alert of userAlerts) {
        if (alert.ruleId === 'AUTH_001') {
          score += 25;
          factors.push('Multiple failed authentication attempts');
        } else if (alert.ruleId === 'AUTH_002') {
          score += 40;
          factors.push('Successful login after consecutive failures');
        } else if (alert.ruleId === 'AUTH_003') {
          score += 50;
          factors.push('Impossible travel velocity anomaly');
        } else if (alert.ruleId === 'AUTH_004') {
          score += 15;
          factors.push('Authentication from previously unseen device');
        } else if (alert.ruleId === 'AUTH_005') {
          score += 35;
          factors.push('Elevated IAM permission modification');
        } else if (alert.ruleId === 'BEHAV_001') {
          score += 10;
          factors.push('Off-hours activity');
        }
      }

      const finalScore = Math.min(100, score);
      await IdentitiesRepository.updateRiskScore(identity.userId, finalScore, factors);
    }
  }
}
