# AEGIS OPS AI — Architecture & Engineering Specification

## 1. System Overview

**AEGIS OPS AI** is an offline, browser-delivered unified cybersecurity intelligence platform engineered with modern standard web standards (HTML5, CSS3, ES2022+ Native Modules, Vite) and runs **100% on GitHub Pages without requiring a backend server**.

```mermaid
flowchart TD
    subgraph INGESTION["Data Ingestion Layer"]
        A1["Synthetic Log Stream"] --> B["EventNormalizer"]
        A2["User CSV Logs"] --> B
        A3["User JSON Logs"] --> B
        A4["ScenarioEngine Replay"] --> B
    end

    subgraph STORAGE["Client Storage Layer (IndexedDB)"]
        B --> S1[("securityEvents")]
        S2[("identities")]
        S3[("cloudResources")]
        S4[("detectionRules")]
        S5[("alerts")]
        S6[("incidents")]
        S7[("incidentNotes")]
    end

    subgraph ENGINES["Detection & Analytics Layer"]
        S1 & S2 & S3 --> D1["DetectionEngine\n(Rules + Stats + Behavioral)"]
        D1 --> S5
        S5 & S1 --> D2["CorrelationEngine"]
        D2 --> S6
        S3 --> D3["CloudFence Policy Engine"]
        D4["AgentGuard Trust Evaluator"]
    end

    subgraph VISUALIZATION["Presentation Layer (Solid-Color UI)"]
        S1 & S5 & S6 --> UI1["SOC Overview & Analytics\n(Chart.js)"]
        S1 & S2 & S3 & S6 --> UI2["Entity Graph\n(Cytoscape.js)"]
        S6 & S7 --> UI3["Incident Investigation & Timeline"]
        S2 --> UI4["AuthWatch Identity Dossier"]
        S3 --> UI5["CloudFence Remediator"]
        D4 --> UI6["AgentGuard Testbed"]
        S6 --> UI7["Forensic Report Generator"]
    end
```

## 2. Core Modules

1. **SentinelOps (Security Event Intelligence):**
   - Normalizes raw heterogeneous logs from Okta/IdPs, CloudTrail, CrowdStrike EDR, Firewalls, and AI agent executions into a uniform schema.
   - Provides filtering, searching, sorting, and pagination.

2. **AuthWatch (Identity Threat Analytics):**
   - Tracks synthetic accounts, department privileges, and authentication schedules.
   - Computes great-circle distances and implied physical travel velocities between consecutive logins using Haversine formulas.
   - Calculates transparent, documented risk scores based on observed deviations.

3. **CloudFence (Cloud Security Posture Analysis):**
   - Evaluates synthetic cloud resources (S3, IAM, Security Groups, RDS, CloudTrail).
   - Identifies non-compliant configurations against industry baselines.
   - Features an interactive Remediation Simulator that corrects local configurations, re-runs policy checks, and logs audit events.

4. **AgentGuard (AI Agent Security Evaluation):**
   - Isolates system instructions from untrusted user prompts and retrieved documents.
   - Defends against indirect prompt injection (OWASP LLM01), unauthorized tools (OWASP LLM07), and sensitive credential leakage (OWASP LLM06).

---

## 3. Strict UI Design System

- **Solid Colors Exclusively:** No gradients, neon glows, glassmorphism, or decorative particle canvas.
- **Light & Dark Mode:** Dynamic CSS variable switching with crisp text legibility and high contrast.
- **Top Right Developer Pill:** One-click developer modal spotlighting **Gurupadayya Odeyar** with direct links to GitHub, LinkedIn, and Email.

