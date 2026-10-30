'use strict';
// AI Image Classifier: guide content. `answer` fields are SERVER-ONLY (stripped by guides.publicGuide()).
module.exports = {
  id: 'image-classifier',
  mission: {
    problem: 'Autonomous systems, medical diagnostics, and digital catalogues must identify visual objects in milliseconds. Hand-crafted rules fail on millions of pixel variations, requiring deep convolutional networks.',
    build: 'You will deploy an image classification pipeline powered by a deep convolutional network (MobileNetV2) in ONNX format. You will preprocess raw image pixels, run forward inference, normalise logits with Softmax, and extract Top-5 confidence rankings.',
    stats: [['1,000', 'object categories'], ['3.5M', 'network parameters'], ['224x224', 'input tensor'], ['<50ms', 'inference latency']],
  },
  objective: [
    'You will preprocess arbitrary input images into normalized 224x224x3 tensors for convolutional inference.',
    'You will run forward passes through a deep neural network (MobileNetV2) using ONNX Runtime.',
    'You will convert raw model logits into a calibrated Top-5 probability distribution with ImageNet label mapping.',
  ],
  prerequisites: [
    'Basic Python syntax and matrix concepts',
    'Understanding of RGB color channels and image resolution',
    'High-level familiarity with neural network layers and weights',
    'A modern web browser for running the interactive vision lab',
    'Optional: Python 3.10+ with Pillow and ONNX Runtime to execute locally',
  ],
  concepts: [
    { title: 'Convolutional Neural Networks', summary: 'Hierarchical visual feature extractors.', detail: 'CNNs apply sliding spatial filters across image channels. Lower layers capture edges and textures, intermediate layers detect motifs and shapes, while deeper layers recognize high-level semantics like animal faces or vehicle wheels.', example: 'Detecting the curve of a cat’s ear or the wheel arch of a sports car.', widget: 'fit-line' },
    { title: 'Image Normalization & Tensor Shapes', summary: 'Preparing pixels for neural network inputs.', detail: 'Networks require strict input shapes (such as 1x3x224x224) and standardized pixel values (usually subtracting mean and dividing by standard deviation) to match the statistical distributions learned during training.', example: 'Resizing a 4000x3000 smartphone photo to 224x224 and scaling pixel values to [-1.0, 1.0].' },
    { title: 'Logits & The Softmax Function', summary: 'Converting raw activation scores into valid probabilities.', detail: 'The final layer outputs 1,000 unconstrained numbers called logits. The Softmax function exponentiates each score and normalizes by the sum, producing a probability distribution where values sum to 1.0.', example: 'Softmax transforms logits [2.1, 0.4, -1.0] into [0.81, 0.15, 0.04].' },
    { title: 'ONNX (Open Neural Network Exchange)', summary: 'Cross-platform, high-performance model runtime.', detail: 'ONNX enables models trained in PyTorch or TensorFlow to be serialized into an open format and executed with optimized C++ kernels across CPUs, GPUs, and edge accelerators.', example: 'Deploying a PyTorch-trained vision model directly onto an edge device without PyTorch dependencies.' },
  ],
  architecture: {
    nodes: [
      { id: 'img', label: 'Input Image', desc: 'Raw JPEG or PNG image loaded from disk or user upload.', resp: 'Provide raw visual pixel data.', tech: 'PIL / Pillow Image', io: 'In: file / buffer · Out: PIL.Image' },
      { id: 'prep', label: 'Preprocessing Pipeline', desc: 'Resize to 224x224, convert to RGB, normalize channels, and transpose to NCHW.', resp: 'Create input tensor matching network signature.', tech: 'NumPy / PIL', io: 'In: PIL.Image · Out: float32 tensor (1,3,224,224)' },
      { id: 'onnx', label: 'ONNX Runtime Engine', desc: 'Executes optimized forward pass of MobileNetV2 architecture.', resp: 'Compute layer activations and output logits.', tech: 'onnxruntime.InferenceSession', io: 'In: Tensor · Out: 1,000 Logits' },
      { id: 'soft', label: 'Softmax Normalizer', desc: 'Converts raw logits into calibrated probability scores summing to 1.0.', resp: 'Provide mathematically valid class likelihoods.', tech: 'NumPy / SciPy', io: 'In: Logits · Out: Probabilities (1000)' },
      { id: 'rank', label: 'Top-5 Ranking & Labels', desc: 'Sorts probabilities and maps class IDs to human-readable ImageNet labels.', resp: 'Deliver visual classification results.', tech: 'ImageNet Class Dictionary', io: 'In: Probabilities · Out: Top-5 Predictions' },
    ],
  },
  tools: [
    { name: 'Python', kind: 'Language', role: 'Inference and pipeline coordination', why: 'Universal language for computer vision.' },
    { name: 'Pillow (PIL)', kind: 'Library', role: 'Image loading, resizing, and color conversions', why: 'Fast and reliable image manipulation.' },
    { name: 'ONNX Runtime', kind: 'Engine', role: 'High-performance model inference execution', why: 'Cross-platform runtime with zero heavy framework bloat.' },
    { name: 'Browser Vision Lab', kind: 'Interactive Lab', role: 'Real-time image classification interface', why: 'Runs instant image classifications with sample galleries and custom uploads.' },
  ],
  steps: [
    { title: 'Load and inspect sample image', objective: 'Verify image dimensions and RGB channels.', explanation: 'Load an image from the gallery (such as an African elephant or sports car). Inspect the image mode and original pixel dimensions.', code: { lang: 'python', text: "from PIL import Image\nimg = Image.open('sample_images/elephant.jpg')\nprint(f'Dimensions: {img.size}, Mode: {img.mode}')" }, visual: { flow: ['File System', 'Image Buffer', 'RGB Decoding', 'Pixel Inspection'] }, expected: 'Successfully decoded image in RGB mode with standard resolution.', mistakes: ['Treating grayscale or RGBA (4-channel) images without converting to 3-channel RGB', 'Assuming all input images share the same initial aspect ratio'], checkpoint: 'I loaded and inspected the source image.' },
    { title: 'Resize and center-crop to 224x224', objective: 'Match network spatial input dimensions.', explanation: 'Resize the image so its shortest side is 224 pixels, then perform a center crop to produce an exact 224x224 RGB image.', code: { lang: 'python', text: "img_resized = img.resize((224, 224), Image.Resampling.BILINEAR)" }, visual: { flow: ['Raw Image', 'Bilinear Interpolation', 'Spatial Rescaling', '224x224 Image'] }, expected: '224x224 RGB image ready for tensor conversion.', mistakes: ['Distorting aspect ratios without proper resizing strategy', 'Using nearest-neighbor interpolation which creates pixelation artifacts'], checkpoint: 'I rescaled the image to the 224x224 model input size.' },
    { title: 'Convert pixels to normalized NCHW tensor', objective: 'Standardize pixel range and channel ordering.', explanation: 'Convert the image into a NumPy float32 array, scale pixel values from [0, 255] to [0.0, 1.0], normalize by ImageNet mean/std, transpose from HWC to CHW, and add batch dimension N.', code: { lang: 'python', text: "import numpy as np\narr = np.array(img_resized, dtype=np.float32) / 255.0\nmean = np.array([0.485, 0.456, 0.406])\nstd = np.array([0.229, 0.224, 0.225])\narr = (arr - mean) / std\ntensor = np.transpose(arr, (2, 0, 1))[np.newaxis, :]" }, visual: { flow: ['HWC Array', 'Standardize Channels', 'Transpose to CHW', 'Batch Tensor (1,3,224,224)'] }, expected: 'NumPy array of shape (1, 3, 224, 224) and dtype float32.', mistakes: ['Passing HWC tensor to a model expecting NCHW format', 'Forgetting to normalize pixel values'], checkpoint: 'I prepared the normalized (1,3,224,224) input tensor.' },
    { title: 'Execute forward inference in ONNX Runtime', objective: 'Compute output logits across 1,000 ImageNet categories.', explanation: 'Feed the input tensor into the ONNX Runtime session and extract the output prediction tensor.', code: { lang: 'python', text: "import onnxruntime as ort\nsession = ort.InferenceSession('mobilenetv2-12.onnx')\ninput_name = session.get_inputs()[0].name\noutputs = session.run(None, {input_name: tensor})\nlogits = outputs[0][0]" }, visual: { flow: ['Input Tensor', 'ONNX Session', 'Layer Computations', '1,000 Output Logits'] }, expected: 'Vector of 1,000 float32 logit values.', mistakes: ['Mismatched input name in session feed dictionary', 'Attempting to run inference on unsupported tensor types'], checkpoint: 'I executed the forward pass and extracted logits.' },
    { title: 'Apply Softmax and extract Top-5 ranking', objective: 'Derive calibrated probabilities and map to category labels.', explanation: 'Compute the Softmax of the logits to obtain probability distribution summing to 1.0. Find the top 5 highest probabilities and look up class labels.', code: { lang: 'python', text: "exp = np.exp(logits - np.max(logits))\nprobs = exp / np.sum(exp)\ntop5_idx = np.argsort(probs)[-5:][::-1]\nfor idx in top5_idx:\n    print(f'{labels[idx]}: {probs[idx]*100:.2f}%')" }, visual: { flow: ['Raw Logits', 'Softmax Normalization', 'ArgSort Top-5', 'Human-Readable Labels'] }, expected: 'Top-5 classes with confidence percentages summing gracefully.', mistakes: ['Omitting numerical stability shift (subtracting max logit) before exponential', 'Interpreting raw un-normalized logits as probabilities'], checkpoint: 'I computed Softmax and extracted Top-5 ranked predictions.' },
  ],
  experiments: [
    { id: 'vision-sample-eval', title: 'Cross-category benchmark', desc: 'Evaluate vision classifier across vehicle, animal, aviation, and beverage sample images.', button: 'Classify Sample Gallery' },
    { id: 'vision-confidence-analysis', title: 'Top-1 confidence separation', desc: 'Measure the confidence margin between top-1 and top-2 predictions across challenging categories.', button: 'Analyze Confidence Margins' },
  ],
  checks: [
    { id: 'chk-v1', kind: 'Architecture', q: 'Why do deep convolutional networks like MobileNetV2 require an exact input dimension such as 224x224x3?', options: ['Because dense linear classification layers at the network head require fixed spatial feature map sizes', 'Because color images only exist at 224 pixels', 'Because larger images always crash memory', 'Because ONNX only supports squares'], answer: 0, explain: 'The final classification layer has fixed weight matrix dimensions tied to the flattened output of the convolutional backbone.' },
    { id: 'chk-v2', kind: 'Normalization', q: 'What is the primary function of the Softmax activation at the output of a classifier?', options: ['To amplify the smallest number to zero', 'To convert arbitrary real-valued logits into a valid probability distribution that sums to 1.0', 'To invert the image colors', 'To increase inference latency'], answer: 1, explain: 'Softmax exponentiates and scales output logits so that each class score is bounded between 0 and 1, with the total summing to 1.0.' },
    { id: 'chk-v3', kind: 'Format', q: 'In tensor notation (1, 3, 224, 224), what does the number 3 represent?', options: ['Batch size', 'Number of color channels (RGB)', 'Number of classes', 'Kernel height'], answer: 1, explain: 'The shape represents Batch (1), Channels (3: Red, Green, Blue), Height (224), and Width (224) - standard NCHW ordering.' },
  ],
  challenge: {
    title: 'Visual Classification Benchmark',
    brief: 'Classify multiple distinct image categories with high confidence and verify mathematical probability normalization.',
    criteria: ['Top-1 prediction accuracy on standard ImageNet test samples', 'Top-5 probability distribution sums to 1.000 (within floating point precision)', 'Sub-100ms inference latency on CPU'],
  },
  milestones: [
    { id: 'vision-explore', label: 'Inspected sample image gallery' },
    { id: 'vision-preprocess', label: 'Rescaled and normalized input tensor' },
    { id: 'vision-inference', label: 'Executed ONNX model forward pass' },
    { id: 'vision-classify', label: 'Extracted Top-5 probability ranking' },
  ],
  quiz: [
    { q: 'What does ONNX stand for in modern AI engineering?', options: ['Open Neural Network Exchange', 'Online Neural Network Execution', 'Optimized Network Node XML', 'Optical Neural Node Xenon'], answer: 0 },
    { q: 'Which color channel ordering is standard for Pillow and ONNX MobileNetV2?', options: ['BGR', 'RGB', 'CMYK', 'Grayscale'], answer: 1 },
    { q: 'If an image of an elephant produces a top logit of 12.4 and second logit of 4.1, what will Softmax do?', options: ['Give both classes equal 50% probability', 'Assign the elephant class overwhelmingly high probability (>99%)', 'Throw an out of bounds exception', 'Make both probabilities negative'], answer: 1 },
    { q: 'Why is ImageNet standard normalization (mean and std subtraction) required?', options: ['To match the input data distribution the neural network was trained on', 'To make files smaller on disk', 'To convert color photos into black and white', 'To encrypt the image'], answer: 0 },
  ],
  outcomes: [
    'Understand convolutional neural network architectures for visual recognition',
    'Build reliable image preprocessing and tensor normalization pipelines in Python',
    'Execute deep learning models efficiently using the ONNX Runtime engine',
    'Compute Softmax probabilities and inspect Top-K classification rankings',
    'Deploy lightweight computer vision models to edge devices and web APIs',
  ],
  expected: {
    points: [
      'A working computer vision inference pipeline running MobileNetV2 in ONNX',
      'Correct Top-1 and Top-5 class predictions for challenging visual subjects',
      'Calibrated probability distribution summing to 100%',
      'Support for both curated test galleries and arbitrary custom image uploads',
      'Fast CPU inference execution under 50 milliseconds',
    ],
  },
  learningPath: [
    { label: 'This mini-project', desc: 'Pretrained convolutional vision classification with MobileNetV2.' },
    { label: 'In the programme', desc: 'Transfer learning, custom CNN fine-tuning, and data augmentation with PyTorch.' },
    { label: 'Advanced modules', desc: 'Object detection (YOLO), semantic segmentation, and Vision Transformers (ViT).' },
    { label: 'Capstone', desc: 'End-to-end industrial visual defect detection or medical scan analysis system.' },
  ],
  share: {
    hashtags: ['#ComputerVision', '#DeepLearning', '#ONNX', '#MachineLearning', '#WrenchWise'],
    text: 'I just built an AI Image Classifier with Wrench Wise! Preprocessed image tensors, ran MobileNetV2 in ONNX Runtime, and extracted Top-5 probabilistic visual predictions in <50ms.',
  },
};
