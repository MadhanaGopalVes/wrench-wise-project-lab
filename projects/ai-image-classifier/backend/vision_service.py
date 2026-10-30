"""
AI Vision Classification Service using ONNX Runtime.
Performs ImageNet preprocessing, deep learning CNN inference, Softmax scaling,
entropy uncertainty diagnostics, and top-k confidence ranking.
"""
import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import time
import json
import base64
import io
import numpy as np
from typing import Dict, Any, List, Optional
from PIL import Image
import onnxruntime as ort

MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", "squeezenet.onnx"))
CLASSES_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", "imagenet_classes.json"))
SAMPLES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample-images"))

# Standard ImageNet normalization coefficients
IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

class VisionClassificationService:
    def __init__(self, model_path: str = MODEL_PATH, classes_path: str = CLASSES_PATH):
        self.model_path = model_path
        self.classes_path = classes_path
        self.session: Optional[ort.InferenceSession] = None
        self.classes: List[str] = []
        self.input_name: str = "data"
        self.load_model_and_classes()

    def load_model_and_classes(self):
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"ONNX vision model not found at {self.model_path}")
        if not os.path.exists(self.classes_path):
            raise FileNotFoundError(f"ImageNet classes not found at {self.classes_path}")

        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 1
        opts.inter_op_num_threads = 1
        self.session = ort.InferenceSession(self.model_path, sess_options=opts)
        self.input_name = self.session.get_inputs()[0].name

        with open(self.classes_path, "r", encoding="utf-8") as f:
            self.classes = json.load(f)

    def preprocess_image(self, img: Image.Image) -> np.ndarray:
        """
        Converts PIL Image to normalized NCHW tensor (1, 3, 224, 224).
        """
        rgb_img = img.convert("RGB")
        resized = rgb_img.resize((224, 224), Image.Resampling.BILINEAR)
        arr = np.array(resized, dtype=np.float32) / 255.0

        # Channel-wise normalization
        arr = (arr - IMAGENET_MEAN) / IMAGENET_STD

        # HWC to CHW
        arr = np.transpose(arr, (2, 0, 1))

        # Add batch dimension -> NCHW
        return np.expand_dims(arr, axis=0)

    def classify_image(self, img: Image.Image, top_k: int = 5) -> Dict[str, Any]:
        """
        Runs deep learning inference and calculates diagnostic metrics.
        """
        if self.session is None:
            self.load_model_and_classes()

        tensor = self.preprocess_image(img)

        # Measure precise inference latency
        start_time = time.perf_counter()
        outputs = self.session.run(None, {self.input_name: tensor})
        inference_latency_ms = (time.perf_counter() - start_time) * 1000.0

        logits = outputs[0][0]

        # Numerically stable Softmax
        shift_logits = logits - np.max(logits)
        exps = np.exp(shift_logits)
        probs = exps / np.sum(exps)

        # Sort descending
        top_indices = np.argsort(probs)[::-1][:top_k]

        predictions = []
        for rank, idx in enumerate(top_indices, 1):
            prob = float(probs[idx])
            class_name = self.classes[idx] if idx < len(self.classes) else f"Class #{idx}"
            predictions.append({
                "rank": rank,
                "class_id": int(idx),
                "label": class_name,
                "confidence": round(prob, 4),
                "confidence_percent": round(prob * 100, 2)
            })

        # Calculate prediction entropy (Uncertainty measure in nats)
        # Low entropy = high certainty in a single class; High entropy = ambiguous image
        eps = 1e-12
        entropy = float(-np.sum(probs * np.log(probs + eps)))

        # Confidence margin between Top 1 and Top 2
        top1_conf = predictions[0]["confidence"] if len(predictions) > 0 else 0.0
        top2_conf = predictions[1]["confidence"] if len(predictions) > 1 else 0.0
        confidence_margin = round(top1_conf - top2_conf, 4)

        return {
            "status": "success",
            "model_architecture": "SqueezeNet 1.1 (Deep CNN)",
            "execution_mode": "REAL ONNX RUNTIME INFERENCE",
            "image_dimensions": {"width": img.width, "height": img.height},
            "top_prediction": predictions[0] if predictions else None,
            "predictions": predictions,
            "metrics": {
                "inference_time_ms": round(inference_latency_ms, 2),
                "confidence_margin": confidence_margin,
                "entropy_uncertainty": round(entropy, 3),
                "total_classes_evaluated": len(self.classes)
            }
        }

    def classify_sample_by_filename(self, filename: str, top_k: int = 5) -> Dict[str, Any]:
        safe_filename = os.path.basename(filename)
        sample_path = os.path.join(SAMPLES_DIR, safe_filename)
        if not os.path.exists(sample_path):
            raise FileNotFoundError(f"Sample image '{safe_filename}' not found.")
        
        with Image.open(sample_path) as img:
            result = self.classify_image(img, top_k=top_k)
            result["sample_filename"] = safe_filename
            return result

    def get_sample_images(self) -> List[Dict[str, Any]]:
        samples = []
        if not os.path.exists(SAMPLES_DIR):
            return samples

        for file in sorted(os.listdir(SAMPLES_DIR)):
            if file.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                filepath = os.path.join(SAMPLES_DIR, file)
                try:
                    with Image.open(filepath) as img:
                        w, h = img.size
                        # Generate thumbnail preview as base64
                        thumb = img.copy()
                        thumb.thumbnail((120, 120))
                        buffer = io.BytesIO()
                        thumb.save(buffer, format="JPEG", quality=75)
                        thumb_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

                        samples.append({
                            "filename": file,
                            "label": file.replace("_", " ").rsplit(".", 1)[0].title(),
                            "width": w,
                            "height": h,
                            "thumbnail_base64": f"data:image/jpeg;base64,{thumb_b64}"
                        })
                except Exception:
                    pass
        return samples
