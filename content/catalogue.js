'use strict';
const programmes = require('./programmes');

// Project catalogue. Card limits from the content template: title <= 50 chars, summary <= 100 chars.
// status: 'live' (guide + lab built) | 'coming_soon' (Phase 3: built on the same engine; shows waitlist).
const CATEGORIES = [
  { id: 'software', label: 'Software Development' },
  { id: 'ml', label: 'AI/ML' },
  { id: 'genai', label: 'Generative AI' },
  { id: 'agentic', label: 'Agentic AI' },
];
const LABS = { ml: 'WISE ML LAB', genai: 'WISE GEN AI LAB', agentic: 'WISE AGENT LAB' };
const LABEL = { ml: 'AI/ML', genai: 'Generative AI', agentic: 'Agentic AI' };

const P = (o) => ({ ...o, lab: LABS[o.category], categoryLabel: LABEL[o.category], programme: programmes[o.category], status: o.status || 'coming_soon' });

const PROJECTS = [
  P({ id: 'ml-model-builder', title: 'ML Model Builder', category: 'ml', difficulty: 'Beginner', time: '60 min', status: 'live', flagship: true,
    summary: 'Train a regression model on housing data and read its performance report.',
    tagline: 'Train Your First Machine Learning Model.', icon: 'chart',
    overview: 'Predict house prices with a regression model you train yourself. Explore a synthetic housing dataset, choose features and an algorithm, train the model for real and judge it with MAE, MSE and R².',
    inside: ['Interactive dataset explorer', 'Real model training in the browser lab', 'Actual-vs-predicted performance report', 'Experiments on overfitting and feature choice', 'Knowledge checks, assessment and certificate'],
    outcome: 'A trained regression model and a performance report.' }),
  P({ id: 'churn-prediction', title: 'Customer Churn Prediction', category: 'ml', difficulty: 'Moderate', time: '75 min', status: 'live', flagship: true,
    summary: 'Predict which customers are likely to leave using classification and a confusion matrix.',
    tagline: 'Predict Which Customers Are Likely to Leave.', icon: 'users',
    overview: 'Build a customer retention model using telecom subscriber records. Train Logistic Regression and Random Forest classifiers, evaluate precision and recall, and score live account risk.',
    inside: ['Subscriber dataset explorer with 2,500 records', 'Real model training in the browser lab', 'Confusion matrix and ROC-AUC evaluation', 'Decision threshold tuning experiments', 'Knowledge checks, assessment and certificate'],
    outcome: 'A working churn classifier with live subscriber risk scoring.' }),
  P({ id: 'image-classifier', title: 'AI Image Classifier', category: 'ml', difficulty: 'Moderate', time: '90 min', status: 'live', flagship: true,
    summary: 'Teach a machine to recognise images, then analyse where it gets them wrong.',
    tagline: 'Teach a Machine to Recognise Images.', icon: 'image',
    overview: 'Deploy a deep learning image classification pipeline with MobileNetV2 in ONNX. Preprocess image pixels, run forward passes, and evaluate Top-5 confidence rankings.',
    inside: ['Curated test image gallery across vehicle, animal and object classes', 'Live ONNX Runtime inference in the browser lab', 'Top-5 probability distribution with Softmax', 'Confidence margin and misclassification experiments', 'Knowledge checks, assessment and certificate'],
    outcome: 'A high-performance visual classification pipeline.' }),
  P({ id: 'recommendation-engine', title: 'Recommendation Engine', category: 'ml', difficulty: 'Moderate', time: '75 min', status: 'live', flagship: true,
    summary: 'Build a similarity-based recommender that personalises suggestions from user preferences.',
    tagline: 'Build Your Own Recommendation System.', icon: 'star',
    overview: 'Create a hybrid recommendation engine. Compute content similarity vectors with TF-IDF, construct collaborative filtering rating matrices, and solve the cold-start problem.',
    inside: ['Interactive item catalogue and sparse rating matrix', 'TF-IDF content similarity and collaborative filtering', 'Dynamic hybrid alpha blending slider', 'Cold-start onboarding and dynamic rating updates', 'Knowledge checks, assessment and certificate'],
    outcome: 'A hybrid recommendation engine with real-time preference updates.' }),
  P({ id: 'pdf-chatbot', title: 'Build Your Own PDF Chatbot', category: 'genai', difficulty: 'Moderate', time: '90 min', status: 'live', flagship: true,
    summary: 'Turn any document into an AI assistant that answers with source references.',
    tagline: 'Turn Any Document into an Intelligent AI Assistant.', icon: 'doc',
    overview: 'Build a Retrieval-Augmented Generation (RAG) chatbot. Upload or choose a PDF, extract and chunk its text, embed it, retrieve the right passages and answer with sources, then test what happens with questions the document cannot answer.',
    inside: ['Upload your own PDF or use a sample document', 'Live chunking, embedding and retrieval explorer', 'Chatbot with source references and a refusal guardrail', 'Experiments on chunk size, top-k and thresholds', 'Knowledge checks, assessment and certificate'],
    outcome: 'A working document-based chatbot.' }),
  P({ id: 'ai-data-analyst', title: 'AI Data Analyst', category: 'genai', difficulty: 'Moderate', time: '90 min',
    summary: 'Ask questions about business data in plain English and get SQL, charts and insights.',
    tagline: 'Ask Questions About Data Using Natural Language.', icon: 'db', outcome: 'An interactive AI business intelligence assistant.' }),
  P({ id: 'document-intelligence', title: 'AI Document Intelligence', category: 'genai', difficulty: 'Expert', time: '90 min',
    summary: 'Extract structured, validated JSON from invoices and detect missing fields.',
    tagline: 'Build an AI System That Understands Documents.', icon: 'scan', outcome: 'An AI document extraction application.' }),
  P({ id: 'support-agent', title: 'AI Customer Support Agent', category: 'agentic', difficulty: 'Moderate', time: '90 min', status: 'live', flagship: true,
    summary: 'Build an agent that understands, decides and acts, with a full execution trace.',
    tagline: 'Build an AI Agent That Can Understand, Decide and Act.', icon: 'bot',
    overview: 'Build a customer support agent that classifies enquiries, searches a knowledge base, looks up orders and picks the right action, including pausing for human approval on sensitive refunds. Every tool call is visible in an execution trace.',
    inside: ['Six runnable customer scenarios plus free-text enquiries', 'Observable execution trace: tool, input, output, next action', 'Human-approval gate for refunds and escalation rules', 'Experiments on tool permissions and prompt injection', 'Knowledge checks, assessment and certificate'],
    outcome: 'A functional support agent with observable execution logs.' }),
  P({ id: 'multi-agent-research', title: 'Multi-Agent Research Assistant', category: 'agentic', difficulty: 'Expert', time: '2 hrs',
    summary: 'Coordinate Research, Analyst and Reviewer agents to produce an evidence-backed report.',
    tagline: 'Build a Team of AI Agents That Work Together.', icon: 'team', outcome: 'A multi-agent research report with execution trace.' }),
  P({ id: 'expense-auditor', title: 'AI Expense Auditor', category: 'agentic', difficulty: 'Moderate', time: '90 min',
    summary: 'Automate expense reviews: extract receipts, check policy and flag suspicious claims.',
    tagline: 'Automate Business Expense Reviews Using AI.', icon: 'receipt', outcome: 'An automated expense auditing experience.' }),
  P({ id: 'workflow-agent', title: 'Build Your Own Workflow Agent', category: 'agentic', difficulty: 'Expert', time: '2 hrs',
    summary: 'Create an agent that completes multi-step tasks with conditions, retries and logs.',
    tagline: 'Create an AI Agent That Completes Multi-Step Tasks.', icon: 'flow', outcome: 'An executable workflow agent.' }),
];

const byId = (id) => PROJECTS.find((p) => p.id === id);
const card = (p) => ({ id: p.id, title: p.title, category: p.category, categoryLabel: p.categoryLabel, lab: p.lab, difficulty: p.difficulty, summary: p.summary, time: p.time, status: p.status, icon: p.icon, flagship: !!p.flagship });
module.exports = { CATEGORIES, LABS, PROJECTS, byId, card };
