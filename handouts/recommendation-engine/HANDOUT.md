# Wrench Wise Project Lab · Technical Handout
## Project 06: Personalized Course Recommendation Engine

---

## 1. Project Objective & Industry Context

### 1.1 Objective
Design, build, and deploy an enterprise-grade Recommender System capable of:
1. Ingesting multivariate curriculum items (technical courses, descriptions, syllabus topics, difficulty levels) and student engagement ratings.
2. Constructing a **Content-Based Filtering** engine that vectorizes natural language course summaries via TF-IDF into high-dimensional semantic spaces and computes item-to-item and user-to-item cosine similarity matrices.
3. Constructing a **Collaborative Filtering** engine using User-User rating correlation matrices to recommend items favored by peer learners with matching historical taste.
4. Implementing a **Hybrid Weighted Recommender** governed by an adjustable blending factor ($\alpha \in [0.0, 1.0]$) that dynamically balances semantic content relevance against peer consensus.
5. Implementing **Cold-Start Fallback** mechanisms that provide meaningful, high-utility recommendations to brand-new learners with zero interaction history.
6. Generating transparent **Explainability Annotations** detailing *why* each recommendation was produced.
7. Supporting real-time interaction feedback loops where learner ratings immediately recalculate user preference vectors and update subsequent recommendations.

### 1.2 Industry Problem
Recommender systems drive over 35% of Amazon purchases, 75% of Netflix viewing time, and the majority of EdTech course completions. However, production deployments face three classic challenges:
- **Cold-Start Problem**: Pure collaborative filtering fails for new users or newly launched courses due to an absence of interaction signals.
- **Filter Bubbles / Over-Specialization**: Pure content-based systems repeatedly recommend nearly identical courses (e.g., only PyTorch courses) without exposing complementary prerequisites.
- **Explainability Gap**: Users distrust "black box" recommendations unless accompanied by transparent justifications (e.g. "Because you rated Building Production RAG Systems 5.0 stars").

---

## 2. System Architecture

```text
+--------------------------------------------------------------------------+
|                         STUDENT INTERACTIVE CLIENT                       |
|  - Learner Profile Selector (user_001 .. user_100, Cold-Start New User)   |
|  - Real-time Rating History Inspector (Starred course completions)       |
|  - Algorithm Engine Selector (Hybrid, Content-Based, Collaborative)      |
|  - Alpha Hybrid Blending Slider (0% Collab <-----> 100% Content)         |
|  - Interactive Rating Playground (Submit 1.0 - 5.0 stars and retrain)    |
|  - Feed Cards with Match % Badge, Component Breakdown & Explainability   |
+------------------------------------+-------------------------------------+
                                     |
                                     | HTTP REST (JSON)
                                     v
+--------------------------------------------------------------------------+
|                        FASTAPI APPLICATION SERVER                        |
|                                                                          |
|  [GET /api/catalog]                                                      |
|   - Serves 25 curriculum courses across 5 tech tracks                    |
|   - Serves list of active learner profiles                               |
|                                                                          |
|  [GET /api/user-ratings]                                                 |
|   - Retrieves history of courses and ratings for active user             |
|                                                                          |
|  [POST /api/rate]                                                        |
|   - Appends new user-item interaction record                             |
|   - Rebuilds User-Item interaction matrix on the fly                     |
|                                                                          |
|  [POST /api/recommend]                                                   |
|   - Content Engine: Builds weighted user preference vector from positive |
|     ratings (>= 3.5), computes cosine similarity against unrated items   |
|   - Collab Engine: Finds top-K similar users via User-User cosine        |
|     matrix, predicts unrated item scores via similarity-weighted ratings |
|   - Hybrid Fusion: Score = alpha * Content + (1 - alpha) * Collab        |
|   - Cold-Start Fallback: Uses Bayesian average rating for new students   |
|   - Emits structured recommendations with explainability tags            |
+--------------------------------------------------------------------------+
```

---

## 3. Mathematical Foundations

### 3.1 Content-Based TF-IDF Cosine Similarity

Given TF-IDF user preference vector $\mathbf{u}$ and candidate item vector $\mathbf{v}$:

$$\text{Sim}_{\text{content}}(\mathbf{u}, \mathbf{v}) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2} = \frac{\sum_{k=1}^D u_k v_k}{\sqrt{\sum_{k=1}^D u_k^2} \sqrt{\sum_{k=1}^D v_k^2}}$$

### 3.2 User-Based Collaborative Filtering

Given active user $u$, candidate unrated item $i$, and neighbor users $v \in \mathcal{N}_u$ who have rated item $i$:

$$\hat{r}_{u, i} = \frac{\sum_{v \in \mathcal{N}_u} \text{Sim}(u, v) \cdot r_{v, i}}{\sum_{v \in \mathcal{N}_u} |\text{Sim}(u, v)|}$$

Where $\text{Sim}(u, v)$ is the cosine similarity between the rating vectors of users $u$ and $v$.

### 3.3 Hybrid Linear Blending

$$S_{\text{hybrid}}(u, i) = \alpha \cdot \text{Score}_{\text{content}}(u, i) + (1 - \alpha) \cdot \text{Score}_{\text{collab}}(u, i)$$

Where $\alpha \in [0.0, 1.0]$. When $\alpha = 1.0$, the engine operates as pure content-based; when $\alpha = 0.0$, as pure collaborative filtering.

---

## 4. Practical Step-by-Step Lab Milestones

### Milestone 1: Inspect Learner Profiles
- Launch the Recommender Backend: `python projects/recommendation-engine/backend/main.py`.
- Open [http://localhost:8006](http://localhost:8006).
- Switch between different learner profiles (`user_001`, `user_002`) and inspect their completed courses and affinity categories.

### Milestone 2: Evaluate Content-Based Recommendations
- Switch strategy to `Content-Based (TF-IDF & Cosine Similarity)`.
- Click `Generate Personalized Recommendations`.
- Notice how the recommendations strictly match the semantic vocabulary (e.g. vector search, embeddings, prompt engineering) of courses the student rated positively.

### Milestone 3: Collaborative Filtering Discovery
- Switch strategy to `Collaborative Filtering`.
- Observe how the engine introduces serendipitous course discoveries that similar learners completed, even across different technical categories.

### Milestone 4: Alpha Weight Tuning
- Switch back to `Hybrid`. Adjust the $\alpha$ slider to $0.70$ (70% Content / 30% Collab).
- Compare the resulting recommendations and examine the component breakdown bars on each card.

### Milestone 5: Cold-Start & Live Feedback Adaptation
- Select `New Learner (Zero Past Ratings / Cold Start)`.
- Observe the automatic popularity fallback.
- In Section 3, rate `Building Production RAG Systems` with `5.0 stars`.
- Click `Submit Rating & Retrain`: Watch the recommendations instantly morph into a customized Generative AI learning path.

---

## 5. Automated Verification

Execute the complete 8-test Pytest suite:

```bash
pytest projects/recommendation-engine/tests/test_recommender.py -v
```
