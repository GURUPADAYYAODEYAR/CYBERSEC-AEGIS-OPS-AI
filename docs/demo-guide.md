# AEGIS OPS AI — College Demonstration Presentation Guide

This guide details the live 10-step demonstration workflow designed for academic presentation, cybersecurity defense evaluation, and engineering reviews.

---

### Step 1 — Initialize Security Operations
- Open the application. The system initializes IndexedDB with baseline telemetry, synthetic identities, and cloud assets.
- Show the executive SOC metrics: Analyzed Events, Active Alerts, Open Incidents, Cloud Violations, and Flagged Identities.

### Step 2 — Simulate Authentication Activity
- Navigate to the **Simulation Lab**.
- Select **Scenario 1 (Suspicious Login Burst)** or **Scenario 4 (Multi-Stage Kill Chain)**.
- Press **Start Replay**. Observe the live event ticker streaming events into IndexedDB.

### Step 3 — Run Threat Detection
- Navigate to **Threat Detection**.
- Click **Run Detection Cycle**.
- Highlight triggered alerts (e.g. `AUTH_001`, `AUTH_003`). Click on any **Evidence Event ID** to open the slide-out **Security Event Inspector** drawer showing the exact normalized log.

### Step 4 — Investigate Identity in AuthWatch
- Navigate to **AuthWatch (Identity Security)**.
- Select **Sarah Chen**.
- Review her calculated Risk Score (88/100) and documented risk drivers.
- Point to the **Impossible Travel Velocity Analyzer**: Frankfurt to Tokyo in 11.5 minutes, traversing 9,330 km at an implied velocity of 48,678 km/h.

### Step 5 — Inspect Cloud Misconfiguration in CloudFence
- Navigate to **CloudFence (Cloud Security)**.
- Review identified posture violations:
  - `s3-corporate-finance-vault` (Public S3 Bucket)
  - `iam-role-devops-wildcard` (Overprivileged `*` permissions)
  - `sg-production-ingress` (Open SSH port 22 to 0.0.0.0/0)

### Step 6 — Correlate Security Events in Entity Graph
- Navigate to **Entity Graph**.
- Review the Cytoscape graph connecting Sarah Chen, Tor exit IP `185.220.101.5`, Tokyo IP `203.0.113.190`, the compromised IAM role, and the public S3 bucket.
- Click any node to highlight its connected blast radius.

### Step 7 — Incident Investigation Workspace
- Navigate to **Incident Investigation**.
- Select **INC-2026-0881**.
- Walk through the chronological evidence timeline.
- Demonstrate adding an analyst triage note and changing status to `INVESTIGATING`.

### Step 8 — Simulate Cloud Remediation
- Return to **CloudFence**.
- Click **Simulate Remediation** on `s3-corporate-finance-vault`.
- Observe the instant policy re-evaluation: the violation disappears, the remediated asset count increments, and an audit event is logged.

### Step 9 — Test AI Agent Security in AgentGuard
- Navigate to **AgentGuard (AI Defense)**.
- Select **Indirect Prompt Injection via Fictional PDF Invoice**.
- Show the Trust Boundary separation:
  - Trusted System Policy (High Authority)
  - Untrusted Retrieved Invoice Payload (Zero Authority)
- Click **Evaluate Policy Boundary**. Point out the `EXECUTION BLOCKED` verdict and rule `AGENT_001`.
- Click **Run Automated Test Suite** to run all benchmark test cases with 100% policy compliance.

### Step 10 — Generate Forensic Incident Report
- Navigate to **Reports**.
- Select **INC-2026-0881**.
- Review the auto-compiled report containing the Executive Summary, Chronological Timeline, Triggering Rules, Blast Radius, and Analyst Notes.
- Click **Print to PDF** to demonstrate the clean print-ready stylesheet.

---

### Lead Developer Spotlight
- Click the **&lt;/&gt; DEVELOPER** button in the top right header.
- Presents **Gurupadayya Odeyar**, Lead Cybersecurity Software Engineer, with verified links to GitHub, LinkedIn, and Email.
