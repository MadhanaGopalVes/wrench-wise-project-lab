# Wrench Wise Project Lab (Interactive AI Project Ecosystem)

A production-grade, interactive learning and lead-capture platform built for **Wrench Wise**. Prospective learners discover practical AI/ML, Generative AI and Agentic AI mini-projects, register to unlock the experience, work through an immersive technical handout, interact with real runnable mini-apps and simulations, complete validated milestones, pass assessments and earn verifiable certificates.

---

## 1. Architecture Overview

- **Backend**: Node.js (>= v22.5) HTTP server with built-in SQLite (`node:sqlite` DatabaseSync) in WAL mode. Zero heavy third-party framework dependencies.
- **Frontend**: Clean Vanilla HTML5 / CSS3 / ES2022 JavaScript matching the Wrench Wise brand identity (Poppins font, `#08805A` primary green, `#EAFBF4` light tint, `#0F172A` text).
- **Security & Reliability**:
  - Content Security Policy (CSP), anti-clickjacking, strictly-typed request parsing.
  - Sliding-window rate limiting on general requests, writes and registrations.
  - Per-learner daily inference quotas.
  - Server-side cryptographic check-digit verification on certificate IDs.
  - Durable CRM outbox queue with exponential backoff retry.
  - Prompt-injection heuristic detection and strict privilege separation.
- **No Deceptive Demos**:
  - True mathematical ML models (Linear regression, Ridge regression, Decision tree regression, k-NN) implemented from scratch with actual training, residual calculations, MAE/MSE/R² and scatterplots.
  - Genuine TF-IDF vector embeddings and cosine similarity retrieval over document text.
  - Pure rule-based support agent tool runner over synthetic data with explicit human approval checkpoints for sensitive actions (refunds).
  - Explicit UI badges displaying **REAL EXECUTION**, **DEMO MODE**, or **LIVE LLM** so mock execution is never disguised as live AI.

---

## 2. Project Portfolio & Flagship Implementations

The project lab categorises technical mini-projects under three specialised lab domains:
1. **WISE ML LAB**
   - **ML Model Builder** (*Flagship - Live*): Train regression models on a synthetic housing dataset, evaluate MAE/MSE/R², inspect feature importances and diagnose overfitting/underfitting.
   - *Customer Churn Prediction*, *AI Image Classifier*, *Recommendation Engine* (*Phase 3 / Waitlist*).
2. **WISE GEN AI LAB**
   - **Build Your Own PDF Chatbot** (*Flagship - Live*): Upload/select a PDF, extract text streams, configure chunk size/overlap, build TF-IDF vector representations, retrieve top-$k$ matches by cosine similarity, inspect confidence thresholds, and observe refusal guardrails.
   - *AI Data Analyst*, *AI Document Intelligence* (*Phase 3 / Waitlist*).
3. **WISE AGENT LAB**
   - **AI Customer Support Agent** (*Flagship - Live*): Run support scenarios, inspect step-by-step observable execution traces (tools, inputs, outputs, next actions), test prompt-injection attacks, disable tools to test ablation, and intervene with a Human-in-the-Loop approval gate for financial refunds.
   - *Multi-Agent Research Assistant*, *AI Expense Auditor*, *Build Your Own Workflow Agent* (*Phase 3 / Waitlist*).

---

## 3. Quick Start & Execution

### Prerequisites
- Node.js version 22.5 or newer (`node -v`).

### Setup
1. Copy the example configuration:
   ```bash
   cp .env.example .env
   ```
2. Run the test suite:
   ```bash
   npm test
   ```
3. Start the application:
   ```bash
   npm start
   ```
4. Open your browser:
   - **Project Lab Catalogue**: [http://localhost:3000](http://localhost:3000)
   - **ML Model Builder**: [http://localhost:3000/project/ml-model-builder](http://localhost:3000/project/ml-model-builder)
   - **PDF Chatbot**: [http://localhost:3000/project/pdf-chatbot](http://localhost:3000/project/pdf-chatbot)
   - **Support Agent**: [http://localhost:3000/project/support-agent](http://localhost:3000/project/support-agent)
   - **Certificate Verification**: [http://localhost:3000/verify](http://localhost:3000/verify)
   - **Admin & Analytics Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 4. Assessment & Certificate Workflow

Certificates are issued **only** upon validated milestone completion:
1. **Guide Checkpoints**: All guided steps marked completed by the learner.
2. **Knowledge Checkpoints**: Concept questions answered correctly.
3. **Lab Milestones**: Real lab operations recorded in the database (e.g., training $\ge 2$ algorithms, asking questions with sources, handling human approval).
4. **Final Challenge**: Automatic verification of lab performance (e.g., beating test $R^2 \ge 0.90$ without using the noisy feature).
5. **Assessment Quiz**: Scoring at least 70% on the final technical evaluation.

Generated certificates include:
- Learner Name and Project Title
- Unique verification ID format: `WW-PL-[8-char-Base32]-[2-char-HMAC-checksum]`
- Cryptographic check digit preventing forgery.
- Verification URL and printable layout.

---

## 5. CRM & Marketing Analytics

The system logs marketing attribution and learning funnel events:
- `project_viewed`
- `registration_completed`
- `project_started`
- `first_checkpoint_completed`
- `handout_completed`
- `project_completed`
- `assessment_passed`
- `certificate_generated`
- `additional_project_started`
- `related_course_viewed`

### Outbox Pattern
All lead and event notifications are stored in an SQLite `outbox` table and flushed asynchronously via webhook or Zoho CRM API, ensuring zero user request delays or lost leads during network blips.
