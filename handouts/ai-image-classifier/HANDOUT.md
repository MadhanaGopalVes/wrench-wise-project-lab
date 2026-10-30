# Wrench Wise Project Lab · Technical Handout
## Project 05: AI Image Classifier & Computer Vision Engine

---

## 1. Project Objective & Industry Context

### 1.1 Objective
Design, build, and deploy an end-to-end Computer Vision inference pipeline capable of:
1. Ingesting arbitrary image formats (JPEG, PNG, WebP) via browser file uploads or benchmark datasets.
2. Executing standardized computer vision preprocessing: bilinear resizing to 224x224 pixels, floating-point scaling $[0.0, 1.0]$, channel-wise normalization with ImageNet dataset statistics ($\mu, \sigma$), and memory transposition to the $NCHW$ tensor layout $(1, 3, 224, 224)$.
3. Executing deep learning convolutional neural network (CNN) inference using **ONNX Runtime** with hardware thread containment.
4. Applying numerically stable Softmax transformations over 1,000 ImageNet logit outputs.
5. Computing epistemic uncertainty diagnostics: Top-1 vs. Top-2 Confidence Margin and Shannon Information Entropy ($H$).
6. Providing an interactive, responsive diagnostic visualizer with real-time class probability distributions and latency metrics.

### 1.2 Industry Problem
In real-world computer vision deployments (autonomous vehicles, automated warehouse parcel inspection, biomedical diagnostics):
- **OOD (Out-of-Distribution) Inputs**: Raw neural networks frequently output falsely confident predictions on corrupted or novel inputs.
- **Latency Constraints**: Edge systems require sub-50ms inference times without exhausting device memory or overheating CPU threads.
- **Explainability**: Systems must output multi-candidate probability rankings so downstream safety controllers can trigger human review when classification confidence margin is low.

---

## 2. System Architecture

```text
+--------------------------------------------------------------------------+
|                         STUDENT INTERACTIVE CLIENT                       |
|  - Drag-and-Drop Image Uploader / Benchmark Photo Gallery                |
|  - Active Image Preview with Dimension & Tensor Inspection               |
|  - Top-K Prediction Slider (3 to 10) & Min Confidence Threshold          |
|  - Winning Class Hero Banner with Probability Gauge                      |
|  - Ranked Softmax Probability Distribution Bar Chart                     |
|  - Diagnostic Telemetry: Latency (ms), Margin (%), Shannon Entropy (nats)|
+------------------------------------+-------------------------------------+
                                     |
                                     | HTTP Multipart / Form-Data (JSON)
                                     v
+--------------------------------------------------------------------------+
|                        FASTAPI APPLICATION SERVER                        |
|                                                                          |
|  [GET /api/samples]                                                      |
|   - Inspects sample-images/ directory                                    |
|   - Generates base64 thumbnail previews for instant selection            |
|                                                                          |
|  [POST /api/classify]                                                    |
|   - Accepts raw uploaded bytes or sample filename                        |
|   - Pillow Preprocessing: PIL RGB conversion, 224x224 bilinear resize    |
|   - Tensor Formatting: (arr - mean) / std -> Transpose (2,0,1) -> NCHW  |
|   - ONNX Runtime: Runs SqueezeNet 1.1 Deep CNN inference                 |
|   - Softmax: probs = exp(logits - max(logits)) / sum(exp)                |
|   - Diagnostics: Calculates Top-K ranking, Entropy, and Confidence Margin|
|   - Emits structured JSON response                                       |
+--------------------------------------------------------------------------+
```

---

## 3. Mathematical Foundations

### 3.1 ImageNet Preprocessing & Channel Normalization

Given an input pixel channel $C \in \{R, G, B\}$:

$$x_{\text{norm}}(c, h, w) = \frac{\frac{x(c, h, w)}{255.0} - \mu_c}{\sigma_c}$$

Where:
$$\mu = [0.485, 0.456, 0.406], \quad \sigma = [0.229, 0.224, 0.225]$$

### 3.2 Softmax Output Scaling

$$P(y = k \mid \mathbf{x}) = \frac{e^{z_k - \max(\mathbf{z})}}{\sum_{j=1}^{1000} e^{z_j - \max(\mathbf{z})}}$$

Subtracting $\max(\mathbf{z})$ guarantees numerical stability against floating-point overflow.

### 3.3 Epistemic Uncertainty: Information Entropy

$$H(\mathbf{p}) = -\sum_{i=1}^{1000} p_i \ln(p_i + \epsilon)$$

- **Low Entropy ($H \approx 0.5$ to $1.5$ nats)**: High model certainty (one dominant peak class).
- **High Entropy ($H > 3.0$ nats)**: High model confusion / ambiguous visual features across multiple classes.

---

## 4. Practical Step-by-Step Lab Milestones

### Milestone 1: Start Server & Benchmark Gallery Verification
- Launch the Vision Backend: `python projects/ai-image-classifier/backend/main.py`.
- Open [http://localhost:8005](http://localhost:8005).
- Verify the benchmark gallery loads sample photos (Golden Retriever, Sports Car, Coffee Cup, Cat, Astronaut).

### Milestone 2: Object Recognition & Latency Profiling
- Click on `Golden Retriever`.
- Observe real ONNX inference execution in under 15 milliseconds.
- Verify top prediction is `golden retriever` with confidence $> 35\%$.

### Milestone 3: Multimodal Vehicle Classification
- Click on `Sports Car`.
- Inspect the top 5 distribution bars: Observe related semantic classes (`sports car`, `convertible`, `racer`).

### Milestone 4: Entropy Uncertainty Analysis
- Compare the Entropy score between the clear `Sports Car` photo and the complex `Astronaut` scene.
- Notice how visual ambiguity directly increases Shannon Entropy.

### Milestone 5: Custom Image Testing
- Drag-and-drop a photo from your computer into the drop zone.
- Observe instant resizing, tensor normalization, and inference.

---

## 5. Automated Verification

Execute the complete 7-test Pytest suite:

```bash
pytest projects/ai-image-classifier/tests/test_vision.py -v
```
