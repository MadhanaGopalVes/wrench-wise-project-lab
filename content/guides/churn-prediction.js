'use strict';
// Customer Churn Prediction: guide content. `answer` fields are SERVER-ONLY (stripped by guides.publicGuide()).
module.exports = {
  id: 'churn-prediction',
  mission: {
    problem: 'Telecom providers lose up to 30% of subscribers annually to competing networks. Identifying at-risk customers weeks before cancellation allows retention teams to intervene with targeted promotions.',
    build: 'You will build a customer churn classifier. You will explore customer profiles, engineer demographic and account features, train Random Forest and Logistic Regression models, and evaluate precision, recall, and ROC-AUC.',
    stats: [['2,500', 'customer accounts'], ['9', 'account features'], ['3', 'classification models'], ['86%', 'target ROC-AUC']],
  },
  objective: [
    'You will train a classification model that predicts subscriber churn probability from tenure, charges, contract, and support history.',
    'You will evaluate the model with Confusion Matrices, Precision, Recall, and ROC-AUC on an unseen test cohort.',
    'You will identify the key risk drivers and simulate proactive retention offers for high-risk accounts.',
  ],
  prerequisites: [
    'Basic Python syntax (functions, dictionaries, lists)',
    'Fundamental understanding of probabilities (0.0 to 1.0)',
    'Comfort reading classification tables and confusion matrices',
    'A modern web browser (no local setup required for the interactive lab)',
    'Optional: Python 3.10+ with pandas and scikit-learn to run code locally',
  ],
  concepts: [
    { title: 'Binary Classification', summary: 'Predicting a categorical outcome: churn (1) versus retain (0).', detail: 'Unlike regression which outputs continuous numbers, classification predicts discrete classes or probabilities. A decision threshold (typically 0.50) maps estimated risk probabilities into concrete action triggers.', example: 'Detecting spam emails, medical diagnosis, or credit default.', widget: 'fit-line' },
    { title: 'Confusion Matrix & Imbalance', summary: 'Distinguishing False Positives from False Negatives.', detail: 'Accuracy can be deceptive when classes are imbalanced. A confusion matrix reveals True Positives, False Positives, True Negatives, and False Negatives, enabling precision vs recall trade-offs.', example: 'Failing to predict a churning customer (False Negative) costs far more than sending an email to a loyal customer (False Positive).' },
    { title: 'Feature Importance in Trees', summary: 'Measuring which customer attributes drive cancellation.', detail: 'Tree ensembles calculate the reduction in Gini impurity brought by each feature. This reveals whether high monthly charges or month-to-month contracts are the dominant churn drivers.', example: 'Contract type and tenure consistently rank as the top churn indicators across telecom operators.' },
    { title: 'ROC-AUC Metric', summary: 'Evaluating risk discrimination across all probability thresholds.', detail: 'The Area Under the Receiver Operating Characteristic curve measures the model’s ability to rank churning customers above retained ones regardless of the chosen classification cutoff.', example: 'An AUC of 0.85 means there is an 85% chance the model scores a churning subscriber higher than a loyal subscriber.' },
  ],
  architecture: {
    nodes: [
      { id: 'data', label: 'Subscriber Records', desc: 'Historical customer billing, tenure, service, and churn flags.', resp: 'Provide ground-truth training and evaluation records.', tech: 'CSV / pandas DataFrame', io: 'In: telecom.csv · Out: DataFrame' },
      { id: 'prep', label: 'Encoding & Scaling', desc: 'One-hot encode categorical features and scale continuous billing fields.', resp: 'Transform raw data into a numerical feature matrix.', tech: 'StandardScaler, OneHotEncoder', io: 'In: DataFrame · Out: Matrix X' },
      { id: 'split', label: 'Stratified Split', desc: 'Partition rows into 80% train and 20% test sets preserving churn balance.', resp: 'Guarantee unbiased out-of-sample evaluation.', tech: 'train_test_split (stratified)', io: 'In: X, y · Out: X_train, X_test, y_train, y_test' },
      { id: 'train', label: 'Classifier Ensemble', desc: 'Train Logistic Regression, Decision Tree, and Random Forest models.', resp: 'Fit decision boundaries to minimize log-loss.', tech: 'RandomForestClassifier, LogisticRegression', io: 'In: X_train, y_train · Out: Fitted estimator' },
      { id: 'eval', label: 'Confusion Matrix & AUC', desc: 'Calculate Precision, Recall, F1, and plot the confusion matrix.', resp: 'Validate business performance.', tech: 'classification_report, roc_auc_score', io: 'In: y_test, y_pred · Out: Metrics report' },
      { id: 'score', label: 'Live Risk Scoring', desc: 'Score new customer profiles and trigger automated retention alerts.', resp: 'Generate production risk inferences.', tech: 'predict_proba()', io: 'In: customer profile · Out: Churn %' },
    ],
  },
  tools: [
    { name: 'Python', kind: 'Language', role: 'Data science and ML development', why: 'Standard language for machine learning pipelines.' },
    { name: 'scikit-learn', kind: 'Library', role: 'Classification algorithms, metrics, and splitting', why: 'Industry-standard toolkit for supervised classification.' },
    { name: 'pandas', kind: 'Library', role: 'Tabular customer data processing', why: 'Fast transformations and aggregation.' },
    { name: 'Browser Churn Lab', kind: 'Interactive Lab', role: 'Interactive server-side classification runner', why: 'Allows instant model training, evaluation, and live risk scoring.' },
  ],
  steps: [
    { title: 'Explore subscriber dataset', objective: 'Inspect churn distributions and feature ranges.', explanation: 'Load the 2,500 subscriber records. Examine the overall churn rate (28.6%) and inspect correlation between contract duration, tech support, monthly charges, and cancellation.', code: { lang: 'python', text: "import pandas as pd\ndf = pd.read_csv('telecom_churn.csv')\nprint(df['churn'].value_counts(normalize=True))\nprint(df.groupby('contract_type')['churn'].mean())" }, visual: { flow: ['Raw CSV', 'Class Distribution', 'Feature Correlation', 'Profile Insights'] }, expected: '2,500 customer rows; month-to-month contracts have over 40% churn rate.', mistakes: ['Ignoring class imbalance between churned and retained customers', 'Training without checking categorical cardinality'], checkpoint: 'I inspected subscriber records and identified the baseline churn rate.' },
    { title: 'Encode categorical features', objective: 'Convert text categories into numerical tensors.', explanation: 'One-hot encode contract_type, internet_service, tech_support, and payment_method into numeric dummy variables for classifier compatibility.', code: { lang: 'python', text: "categorical = ['contract_type', 'internet_service', 'tech_support', 'payment_method']\nX = pd.get_dummies(df.drop(columns=['customer_id', 'churn']), columns=categorical, drop_first=True)\ny = df['churn']" }, visual: { flow: ['Categorical Strings', 'One-Hot Encoders', 'Numeric Matrix X', 'Target Vector y'] }, expected: 'Feature matrix X expanded to 14 numeric columns with zero missing values.', mistakes: ['Retaining customer_id as an input feature (ID leakage)', 'Failing to drop target variable from features'], checkpoint: 'I converted categories to binary dummy features.' },
    { title: 'Stratified train/test split', objective: 'Create balanced holdout partitions.', explanation: 'Split data into 80% train and 20% test sets using stratified sampling to preserve the 28.6% churn ratio in both splits.', code: { lang: 'python', text: "from sklearn.model_selection import train_test_split\nX_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)" }, visual: { flow: ['Full Dataset', 'Stratify by Churn', '2,000 Train Rows', '500 Test Rows'] }, expected: 'Exactly 2,000 training samples and 500 test samples with matching churn proportions.', mistakes: ['Using a non-stratified split when the minority class is small', 'Evaluating on training data'], checkpoint: 'I separated training and holdout validation sets.' },
    { title: 'Train Random Forest classifier', objective: 'Fit an ensemble of decision trees.', explanation: 'Train a Random Forest classifier with 100 estimators. Each tree votes on whether a customer will churn based on randomized feature subsets.', code: { lang: 'python', text: "from sklearn.ensemble import RandomForestClassifier\nrf = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)\nrf.fit(X_tr, y_tr)" }, visual: { flow: ['X_train, y_train', 'Bootstrap Bagging', '100 Decision Trees', 'Ensemble Model'] }, expected: 'Fitted ensemble classifier achieving > 82% training accuracy.', mistakes: ['Allowing unlimited tree depth resulting in severe memorisation', 'Forgetting random seed'], checkpoint: 'I trained a Random Forest model in the lab.' },
    { title: 'Evaluate Confusion Matrix and ROC-AUC', objective: 'Measure precision, recall, and discrimination.', explanation: 'Generate predictions on the 500 test customers. Build a confusion matrix and compute precision, recall, F1, and ROC-AUC score.', code: { lang: 'python', text: "from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix\npreds = rf.predict(X_te)\nprobs = rf.predict_proba(X_te)[:, 1]\nprint(confusion_matrix(y_te, preds))\nprint('ROC-AUC:', roc_auc_score(y_te, probs))" }, visual: { flow: ['X_test', 'predict_proba()', 'Confusion Matrix', 'ROC-AUC Curve'] }, expected: 'ROC-AUC >= 0.82 on the unseen test set.', mistakes: ['Relying solely on accuracy when assessing churn risk', 'Confusing False Positive Rate with Recall'], checkpoint: 'I evaluated the model using Confusion Matrix and ROC-AUC.' },
    { title: 'Score live customer profiles', objective: 'Inference churn risk for new customer accounts.', explanation: 'Input new subscriber parameters into the trained model to calculate their probability of cancelling in the next 30 days and suggest retention discounts.', code: { lang: 'python', text: "sample_cust = {'tenure': 4, 'monthly_charges': 89.5, 'contract_type': 'Month-to-month'}\n# Live inference returns churn probability\nprob = rf.predict_proba(sample_vector)[0][1]\nprint(f'Churn Risk: {prob*100:.1f}%')" }, visual: { flow: ['New Account', 'Feature Transformation', 'Model Inference', 'Retention Trigger'] }, expected: 'Calculated churn probability percentage and risk classification label.', mistakes: ['Passing unscaled inputs or mismatched column ordering', 'Ignoring calibrated probabilities'], checkpoint: 'I evaluated live customer risk and triggered retention actions.' },
  ],
  experiments: [
    { id: 'churn-algo-compare', title: 'Classifier comparison', desc: 'Compare Logistic Regression, Decision Tree, and Random Forest on accuracy, recall, and ROC-AUC.', button: 'Compare Classifiers' },
    { id: 'churn-threshold-sweep', title: 'Decision threshold tuning', desc: 'Sweep the classification decision threshold from 0.20 to 0.80 and watch precision and recall trade off.', button: 'Sweep Thresholds' },
  ],
  checks: [
    { id: 'chk-c1', kind: 'Concept', q: 'In churn prediction, why is high Recall usually prioritized over high Precision?', options: ['Because missing an at-risk customer leads to permanent revenue loss', 'Because retaining customers is free', 'Because precision cannot be measured in classification', 'Because accuracy is always 100%'], answer: 0, explain: 'A false negative means an at-risk customer leaves without any retention attempt. Reaching out to a loyal customer (false positive) is far less costly.' },
    { id: 'chk-c2', kind: 'Metric', q: 'If a dataset has 90% loyal customers and 10% churners, what accuracy does a dummy model that predicts "Loyal" for everyone achieve?', options: ['10%', '50%', '90%', '0%'], answer: 2, explain: 'A naive model predicting the majority class scores 90% accuracy while failing to detect a single churning customer. This is why ROC-AUC and F1 score are essential.' },
    { id: 'chk-c3', kind: 'Feature', q: 'Which customer feature typically shows the strongest inverse correlation with churn?', options: ['Customer ID number', 'Tenure (length of subscription)', 'Paperless billing', 'Random noise'], answer: 1, explain: 'Long-term subscribers demonstrate high loyalty and switching resistance; tenure has a strong negative correlation with churn.' },
  ],
  challenge: {
    title: 'Customer Churn Benchmark',
    brief: 'Train a churn prediction classifier that accurately identifies at-risk subscribers while maintaining balanced discrimination.',
    criteria: ['Test ROC-AUC score of at least 0.80', 'Recall on churning customers of at least 0.65', 'Model trained without customer ID leakage'],
  },
  milestones: [
    { id: 'churn-explore', label: 'Explored subscriber dataset' },
    { id: 'churn-train', label: 'Trained a churn classifier' },
    { id: 'churn-compare', label: 'Compared classification algorithms' },
    { id: 'churn-predict', label: 'Scored live customer risk' },
  ],
  quiz: [
    { q: 'What does the ROC-AUC metric measure?', options: ['The area under the Receiver Operating Characteristic curve across all classification cutoffs', 'The ratio of training time to test time', 'The Mean Absolute Error of prices', 'The number of trees in a forest'], answer: 0 },
    { q: 'In a confusion matrix, what is a False Positive?', options: ['A churning customer who was correctly caught', 'A loyal customer incorrectly predicted to churn', 'A churning customer predicted to stay', 'A loyal customer predicted to stay'], answer: 1 },
    { q: 'Why should customer ID be excluded during training?', options: ['It has missing values', 'It is an arbitrary identifier that does not generalise to new customers', 'It causes division by zero', 'It is non-numeric'], answer: 1 },
    { q: 'What technique ensures both training and test sets have the same percentage of churning customers?', options: ['Stratified sampling', 'K-Means clustering', 'Principal Component Analysis', 'Min-max normalization'], answer: 0 },
  ],
  outcomes: [
    'Frame customer retention as a supervised binary classification problem',
    'Preprocess and one-hot encode mixed categorical subscriber features',
    'Train and tune tree-based and linear classification models',
    'Interpret confusion matrices, precision, recall, and ROC-AUC curves',
    'Deploy probabilistic churn scoring for automated retention workflows',
  ],
  expected: {
    points: [
      'A trained classification pipeline on 2,500 subscriber records',
      'Test ROC-AUC score exceeding 0.82 and F1 score above 0.70',
      'A confusion matrix distinguishing True Positives and False Alarms',
      'Feature importance rankings highlighting tenure and contract duration',
      'Live customer risk evaluation with recommended retention triggers',
    ],
  },
  learningPath: [
    { label: 'This mini-project', desc: 'Supervised classification for churn risk using Scikit-learn.' },
    { label: 'In the programme', desc: 'Customer lifetime value modeling, uplift modeling, and multi-class retention analytics.' },
    { label: 'Advanced modules', desc: 'Gradient boosted trees (XGBoost, LightGBM) and real-time inference microservices.' },
    { label: 'Capstone', desc: 'Production churn mitigation engine integrated into CRM workflows.' },
  ],
  share: {
    hashtags: ['#MachineLearning', '#ChurnPrediction', '#DataScience', '#WrenchWise', '#Python'],
    text: 'I just built a Customer Churn Prediction model with Wrench Wise! Trained a Random Forest classifier achieving >85% ROC-AUC on subscriber accounts and evaluated precision vs recall trade-offs.',
  },
};
