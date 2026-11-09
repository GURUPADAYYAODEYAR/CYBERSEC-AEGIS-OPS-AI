# AEGIS OPS AI — Threat Detection Methodology

## 1. Detection Principles

AEGIS OPS AI operates on explainable, evidence-backed security algorithms. Every generated alert links to specific evidence event IDs and provides an audit explanation.

## 2. Detection Rules Catalog

| Rule ID | Rule Name | Category | Severity | MITRE ATT&CK Mapping | Description |
|---|---|---|---|---|---|
| `AUTH_001` | Excessive Failed Logins | Identity | HIGH | Credential Access (T1110) | Flags 3+ consecutive authentication failures within a 10-minute window for a single identity or source IP. |
| `AUTH_002` | Success Following Failures | Identity | CRITICAL | Initial Access (T1078) | Detects successful authentication within 15 minutes of multiple consecutive authentication failures. |
| `AUTH_003` | Impossible Travel Velocity | Identity | CRITICAL | Defense Evasion (T1078) | Identifies consecutive logins from distant coordinates exceeding 900 km/h implied velocity. |
| `AUTH_004` | Unseen Device Footprint | Identity | MEDIUM | Initial Access (T1078.004) | Flags successful logins from device identifiers absent from user's authorized profile. |
| `AUTH_005` | Unexpected Privilege Escalation | Cloud / Identity | HIGH | Privilege Escalation (T1098) | Identifies wildcard (`*`) permission attachments on IAM roles. |
| `CLOUD_001` | Public Cloud Storage | Cloud | CRITICAL | Exfiltration (T1530) | Detects S3 buckets lacking Public Access Blocks or configured with public-read ACLs. |
| `CLOUD_002` | Unrestricted Admin Ingress | Cloud | HIGH | Initial Access (T1190) | Flags security group rules allowing `0.0.0.0/0` ingress on ports 22 (SSH) or 3389 (RDP). |
| `CLOUD_003` | Wildcard IAM Policy | Cloud | HIGH | Privilege Escalation (T1098) | Flags IAM policies granting unconstrained wildcard actions. |
| `CLOUD_004` | Unencrypted Data Store | Cloud | MEDIUM | Defense Evasion (T1486) | Identifies databases or object volumes operating without KMS encryption at rest. |
| `CLOUD_005` | Disabled Security Audit Trail | Cloud | HIGH | Defense Evasion (T1562) | Detects disabled CloudTrail audit logging. |
| `AGENT_001` | Indirect Prompt Injection | AI Agent | CRITICAL | OWASP LLM01 | Detects adversarial instructions embedded within retrieved documents attempting to override system prompts. |
| `AGENT_002` | Unauthorized Tool Request | AI Agent | HIGH | OWASP LLM07 | Intercepts simulated AI agent calls to high-privilege tools outside its authorized capability whitelist. |
| `AGENT_003` | Sensitive Data Exfiltration | AI Agent | CRITICAL | OWASP LLM06 | Prevents unauthorized egress of credit card numbers or AWS API credentials. |
| `STAT_001` | Volume Outlier Surge | Behavioral | MEDIUM | Discovery (T1087) | Calculates hourly event frequencies and flags deviations where $Z = (x - \mu)/\sigma > 2.5$. |

---

## 3. Statistical Z-Score Calculation

For rolling time buckets $B = \{b_1, b_2, \dots, b_n\}$:

$$\mu = \frac{1}{n} \sum_{i=1}^n \text{count}(b_i)$$

$$\sigma = \sqrt{\frac{1}{n} \sum_{i=1}^n (\text{count}(b_i) - \mu)^2}$$

$$Z = \frac{\text{count}(b_k) - \mu}{\sigma}$$

When $\sigma = 0$ or $n < 3$, the engine suppresses statistical alerts to avoid false positives from zero-variance or insufficient baselines.

---

## 4. Impossible Travel Velocity Heuristic

Given coordinate locations $(lat_1, lon_1)$ at timestamp $t_1$, and $(lat_2, lon_2)$ at timestamp $t_2$:

1. Calculate Great-Circle distance using the Haversine formula:
   $$a = \sin^2\left(\frac{\Delta lat}{2}\right) + \cos(lat_1) \cdot \cos(lat_2) \cdot \sin^2\left(\frac{\Delta lon}{2}\right)$$
   $$d = 2 R \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a})$$
   where Earth's radius $R = 6371\text{ km}$.
2. Calculate elapsed hours:
   $$\Delta t = \frac{|t_2 - t_1|}{3600000}$$
3. Implied speed:
   $$v = \frac{d}{\Delta t}\text{ km/h}$$
4. Anomaly threshold:
   $$\text{Anomaly} \iff v > 900\text{ km/h} \land d > 300\text{ km}$$

*Forensic note: The platform explicitly highlights that impossible travel is a heuristic that can be affected by commercial VPNs, proxies, shared egress gateways, or GeoIP database inaccuracies.*

