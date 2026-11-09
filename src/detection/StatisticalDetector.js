/**
 * Statistical Anomaly Detector (SentinelOps).
 * Analyzes event frequency and standard deviation z-scores.
 */

export class StatisticalDetector {
  /**
   * Evaluates rolling hourly event volumes and flags statistical outliers (Z-Score > threshold).
   */
  static detectVolumeAnomalies(events, zThreshold = 2.5) {
    if (!Array.isArray(events) || events.length < 5) {
      return []; // Insufficient baseline data
    }

    // Group events into 1-hour buckets (format: YYYY-MM-DDTHH:00:00)
    const buckets = new Map();
    for (const evt of events) {
      const d = new Date(evt.timestamp);
      if (isNaN(d.getTime())) continue;
      d.setUTCMinutes(0, 0, 0);
      const bucketKey = d.toISOString();
      if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
      buckets.get(bucketKey).push(evt);
    }

    const counts = Array.from(buckets.values()).map(list => list.length);
    if (counts.length < 3) {
      return []; // Need at least 3 distinct time windows for a reliable standard deviation
    }

    // Calculate Mean (mu)
    const sum = counts.reduce((acc, val) => acc + val, 0);
    const mean = sum / counts.length;

    // Calculate Variance & Standard Deviation (sigma)
    const variance = counts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) {
      return []; // Zero variance, no deviation possible
    }

    const alerts = [];
    for (const [bucketKey, bucketEvents] of buckets.entries()) {
      const count = bucketEvents.length;
      const zScore = (count - mean) / stdDev;

      if (zScore >= zThreshold) {
        alerts.push({
          alertId: `ALT-STAT-001-${bucketKey.substring(0, 13)}`,
          ruleId: 'STAT_001',
          name: 'Statistical Event Volume Surge (Z-Score Outlier)',
          severity: 'MEDIUM',
          source: 'SentinelOps_Analytics',
          affectedEntity: 'System_Log_Ingress',
          evidenceEventIds: bucketEvents.slice(0, 5).map(e => e.eventId),
          timestamp: bucketKey,
          explanation: `Hour window ${bucketKey} observed ${count} security events. Mean baseline is ${mean.toFixed(1)} events/hr (std dev: ${stdDev.toFixed(2)}). Calculated Z-Score is ${zScore.toFixed(2)} (threshold: ${zThreshold}). Indicates an abnormal traffic burst.`
        });
      }
    }

    return alerts;
  }
}
