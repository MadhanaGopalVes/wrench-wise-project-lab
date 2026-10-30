'use strict';
// ML Model Builder: guide content. `answer` fields are SERVER-ONLY (stripped by guides.publicGuide()).
module.exports = {
  id: 'ml-model-builder',
  mission: {
    problem: 'A property platform wants an instant price estimate for every listing. Valuers cannot price thousands of homes by hand, but past sales contain the pattern: bigger, newer, better-located homes sell for more.',
    build: 'You will teach a model that pattern. You will explore data, pick features, train a regression model and judge honestly whether it will generalise to homes it has never seen.',
    stats: [['400', 'synthetic homes'], ['8', 'candidate features'], ['4', 'algorithms'], ['3', 'quality metrics']],
  },
  objective: [
    'You will train a regression model that predicts a house price from its size, age, location and amenities.',
    'You will evaluate it with MAE, MSE and R² on data it has never seen, and read an actual-versus-predicted report.',
    'You will finish by diagnosing underfitting and overfitting and beating a quality target on your own.',
  ],
  prerequisites: ['Basic Python (variables, lists, functions)', 'High-school algebra: the equation of a line', 'Comfort reading simple tables and charts', 'A modern browser. No installation needed for the lab', 'Optional: Python 3.10+ with pandas and scikit-learn to run the code in the guide'],
  concepts: [
    { title: 'Regression', summary: 'Predicting a number (a price) rather than a category.', detail: 'A regression model learns a function from input features to a continuous target. Unlike classification, an answer of 412.3 is not "right" or "wrong". It is close or far, so we measure the size of the error.', example: 'Estimating delivery time in minutes, a flat’s rent, or tomorrow’s demand are all regression problems.', widget: 'fit-line' },
    { title: 'Features and the target', summary: 'Features are the inputs; the target is what we predict.', detail: 'Good features carry signal about the target. Useless features add noise that a flexible model can memorise. The lab includes a deliberately useless "random number" feature so you can see this for yourself.', example: 'Floor area strongly predicts price. A random number should not.' },
    { title: 'Train / test split', summary: 'Hold back data so we can test on homes the model never saw.', detail: 'A model scored on its own training data looks better than it really is. We train on about 75% of the rows and report metrics on the remaining 25%. The test score is your honest estimate of real-world performance.', example: 'Like practising with past papers but being graded on a new exam.' },
    { title: 'Metrics: MAE, MSE, R²', summary: 'Three lenses on error.', detail: 'MAE is the average absolute error in the target’s units. MSE squares errors, so big misses hurt more. R² compares your model to simply predicting the average: 1 is perfect, 0 is no better than the average, below 0 is worse.', example: 'MAE of 20 means your price estimates are off by about $20k on average.' },
    { title: 'Overfitting and underfitting', summary: 'Too simple misses the pattern; too flexible memorises noise.', detail: 'Underfitting shows poor scores on both train and test. Overfitting shows excellent training scores but noticeably worse test scores. The gap between the two is your warning light.', example: 'A decision tree with unlimited depth can give every training house its own leaf, and fail on new ones.' },
  ],
  architecture: {
    nodes: [
      { id: 'data', label: 'Dataset', desc: 'Rows of homes with features and a known sale price.', resp: 'Provide the examples the model learns from.', tech: 'CSV / pandas DataFrame', io: 'In: file · Out: table' },
      { id: 'features', label: 'Feature Selection', desc: 'Choose which columns the model may use and scale them.', resp: 'Give the model signal and remove noise.', tech: 'pandas, StandardScaler', io: 'In: table · Out: matrix X, target y' },
      { id: 'split', label: 'Train / Test Split', desc: 'Randomly separate rows for learning and for honest testing.', resp: 'Prevent self-grading.', tech: 'train_test_split', io: 'In: X, y · Out: X_train, X_test…' },
      { id: 'model', label: 'Model Training', desc: 'An algorithm adjusts its internal numbers to reduce prediction error.', resp: 'Learn the feature-to-price mapping.', tech: 'LinearRegression, Ridge, DecisionTree, kNN', io: 'In: X_train, y_train · Out: fitted model' },
      { id: 'eval', label: 'Evaluation', desc: 'Predict on the test set and compare with the real prices.', resp: 'Quantify real-world quality.', tech: 'MAE, MSE, R²', io: 'In: model, X_test · Out: metrics, report' },
      { id: 'predict', label: 'Prediction', desc: 'Use the trained model on a brand-new home.', resp: 'Deliver value to users.', tech: 'model.predict()', io: 'In: new features · Out: price estimate' },
    ],
  },
  tools: [
    { name: 'Python', kind: 'Language', role: 'Glue for data science work', why: 'The industry default for ML, with the richest library ecosystem.' },
    { name: 'pandas', kind: 'Library', role: 'Load, inspect and clean tables', why: 'DataFrames make exploring and selecting columns concise.' },
    { name: 'scikit-learn', kind: 'Library', role: 'Models, splits and metrics', why: 'A consistent fit/predict API across algorithms.' },
    { name: 'Matplotlib', kind: 'Library', role: 'Plot actual vs predicted', why: 'Charts reveal patterns that metrics hide.' },
    { name: 'Browser ML lab', kind: 'This project', role: 'Runs the same algorithms on the server so you can experiment instantly', why: 'Real training on a real dataset, with no setup.' },
  ],
  steps: [
    { title: 'Load and explore the dataset', objective: 'Understand what data you have before modelling.', explanation: 'Open the lab’s Dataset tab and review the 400 homes. Check each feature’s range and its correlation with price. Note which features look informative.', code: { lang: 'python', text: "import pandas as pd\n\ndf = pd.read_csv('housing.csv')\nprint(df.shape)            # (400, 9)\nprint(df.describe())       # ranges, means\nprint(df.corr()['price_k_usd'].sort_values())" }, visual: { flow: ['CSV file', 'DataFrame', 'Summary stats', 'Correlations'] }, expected: 'Shape (400, 9); sqft shows the strongest positive correlation with price.', mistakes: ['Skipping exploration and training on columns you have not inspected', 'Confusing correlation with causation'], checkpoint: 'I can name the two features most correlated with price.' },
    { title: 'Choose your features', objective: 'Select inputs that carry signal.', explanation: 'Tick the features you want the model to use in the lab. Start with sqft, bedrooms, bathrooms, age, distance, garage and school score. Leave out the random-number column and observe later what happens if you include it.', code: { lang: 'python', text: "features = ['sqft','bedrooms','bathrooms','age',\n            'distance_km','garage','school_score']\nX = df[features]\ny = df['price_k_usd']" }, visual: { flow: ['All columns', 'Pick signal', 'Drop noise', 'X and y'] }, expected: 'X has 7 columns and y has 400 values.', mistakes: ['Including the target column inside X (data leakage)', 'Adding every column "just in case"'], checkpoint: 'I selected features and can justify each one.' },
    { title: 'Split into training and test sets', objective: 'Reserve unseen data for honest evaluation.', explanation: 'Hold out 25% of the rows as a test set using a fixed random seed. Train only on the other 75%. Never tune on the test set.', code: { lang: 'python', text: "from sklearn.model_selection import train_test_split\n\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.25, random_state=7)" }, visual: { flow: ['400 rows', '300 train', '100 test'] }, expected: '300 training rows and 100 test rows.', mistakes: ['Evaluating on the training data', 'Forgetting random_state, so results change every run'], checkpoint: 'I can explain why the test set must stay unseen.' },
    { title: 'Train a first model', objective: 'Fit a baseline Linear Regression.', explanation: 'Select Linear Regression in the lab and press Train. The model finds one weight per feature that minimises squared error. Linear models are fast and easy to interpret, making them an ideal baseline.', code: { lang: 'python', text: "from sklearn.linear_model import LinearRegression\n\nmodel = LinearRegression()\nmodel.fit(X_train, y_train)\nprint(dict(zip(features, model.coef_.round(2))))" }, visual: { flow: ['X_train, y_train', 'fit()', 'Learned weights'] }, expected: 'Test R² around 0.97 with the main features.', mistakes: ['Not scaling features before comparing coefficients', 'Treating coefficients as causal'], checkpoint: 'I trained a model in the lab and noted its test R².' },
    { title: 'Evaluate with MAE, MSE and R²', objective: 'Quantify how good the model really is.', explanation: 'Read the metrics for both the training and the test sets. Compare them: a big gap signals overfitting. Study the actual-versus-predicted chart, where points on the diagonal are perfect predictions.', code: { lang: 'python', text: "from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score\n\npred = model.predict(X_test)\nprint('MAE', mean_absolute_error(y_test, pred))\nprint('MSE', mean_squared_error(y_test, pred))\nprint('R2 ', r2_score(y_test, pred))" }, visual: { flow: ['X_test', 'predict()', 'Compare to y_test', 'MAE · MSE · R²'] }, expected: 'MAE near 18, R² above 0.9 on the test set.', mistakes: ['Reporting only the training score', 'Reading R² without looking at the chart'], checkpoint: 'I compared train and test metrics and read the chart.' },
    { title: 'Compare algorithms and tune', objective: 'Learn how model choice and settings change results.', explanation: 'Try Ridge, a Decision Tree and kNN. Change tree depth and k and watch the train–test gap. Pick the model with the best test score and a small gap.', code: { lang: 'python', text: "from sklearn.tree import DecisionTreeRegressor\n\nfor depth in (2, 4, 8, 12):\n    m = DecisionTreeRegressor(max_depth=depth).fit(X_train, y_train)\n    print(depth, m.score(X_train, y_train), m.score(X_test, y_test))" }, visual: { flow: ['Linear', 'Ridge', 'Tree', 'kNN', 'Best test R²'] }, expected: 'Deep trees show high train R² but lower test R².', mistakes: ['Choosing the model that wins on training data', 'Tuning on the test set repeatedly'], checkpoint: 'I trained at least two different algorithms.' },
    { title: 'Predict a new house and report', objective: 'Use the model and summarise findings.', explanation: 'Enter a new home’s details and request a prediction. Write a short report stating the chosen features, algorithm, test metrics and one limitation. This report is your project deliverable.', code: { lang: 'python', text: "new_home = pd.DataFrame([{ 'sqft': 1800, 'bedrooms': 3, 'bathrooms': 2,\n  'age': 15, 'distance_km': 12, 'garage': 1, 'school_score': 7 }])\nprint(model.predict(new_home))" }, visual: { flow: ['New home', 'Model', 'Price estimate'] }, expected: 'A price estimate in US$ thousand, such as about 311 for the default home.', mistakes: ['Predicting with columns in a different order from training', 'Presenting the estimate without any error range'], checkpoint: 'I generated a prediction and can state the model’s typical error.' },
  ],
  experiments: [
    { id: 'algo-compare', title: 'Algorithm showdown', desc: 'Train all four algorithms on your selected features and compare test R², MAE and the train–test gap side by side.', button: 'Run all four algorithms', preset: { features: ['sqft', 'bedrooms', 'bathrooms', 'age', 'distance_km', 'garage', 'school_score'] } },
    { id: 'noise-feature', title: 'The useless feature', desc: 'Train the same Decision Tree with and without the random-number feature. Does adding a meaningless column help, hurt, or do nothing?', button: 'Run with and without noise' },
    { id: 'depth-sweep', title: 'Tree depth sweep', desc: 'Sweep the tree depth from 1 to 12 and watch training R² keep rising while test R² stalls or drops: the signature of overfitting.', button: 'Sweep tree depth' },
  ],
  checks: [
    { id: 'c1', kind: 'Concept', q: 'Your model scores R² = 0.99 on training data and 0.62 on test data. What is the most likely issue?', options: ['Underfitting', 'Overfitting', 'The metric is broken', 'The test set is too small to matter'], answer: 1, explain: 'A large train–test gap is the classic overfitting signature.' },
    { id: 'c2', kind: 'Prediction', q: 'You add a column of random numbers as a feature to a Linear Regression. What do you expect?', options: ['Test R² rises sharply', 'Test R² stays about the same or drops slightly', 'The model refuses to train', 'MAE becomes zero'], answer: 1, explain: 'Random noise carries no signal. The model may fit a little noise on training data but cannot improve real accuracy.' },
    { id: 'c3', kind: 'Debugging', q: 'This code leaks information. What is wrong?', code: "X = df[['sqft','age','price_k_usd']]\ny = df['price_k_usd']", options: ['sqft and age are not numeric', 'The target price_k_usd is also in X', 'y should be a DataFrame', 'Nothing, this is fine'], answer: 1, explain: 'Including the target as a feature gives the model the answer, so evaluation will look unrealistically perfect.' },
  ],
  challenge: {
    title: 'Beat the benchmark',
    brief: 'Train a model that generalises well without relying on noise. This is checked automatically from your lab runs.',
    criteria: ['Test R² of at least 0.90', 'Do NOT include the random_noise feature', 'Train R² minus test R² no greater than 0.08'],
  },
  milestones: [
    { id: 'explore', label: 'Explored the dataset in the lab' },
    { id: 'train', label: 'Trained a model' },
    { id: 'compare', label: 'Trained two different algorithms' },
    { id: 'predict', label: 'Generated a prediction for a new home' },
  ],
  quiz: [
    { q: 'Which metric tells you how much better your model is than always predicting the average price?', options: ['MAE', 'MSE', 'R²', 'Correlation'], answer: 2 },
    { q: 'Why do we evaluate on a held-out test set?', options: ['It makes training faster', 'To estimate performance on unseen data', 'Because the training set is too large', 'To remove outliers'], answer: 1 },
    { q: 'A decision tree with max depth 12 shows train R² 0.99 and test R² 0.78. What should you try first?', options: ['Increase max depth to 20', 'Reduce max depth', 'Add more random features', 'Evaluate on the training set instead'], answer: 1 },
    { q: 'Which statement about MSE vs MAE is true?', options: ['MSE penalises large errors more heavily', 'MAE penalises large errors more heavily', 'They are always equal', 'MAE is in squared units'], answer: 0 },
    { q: 'Including the target column as a feature is an example of…', options: ['Regularisation', 'Data leakage', 'Feature scaling', 'Cross-validation'], answer: 1 },
    { q: 'Which is a regression task?', options: ['Spam or not spam', 'Predicting a flat’s monthly rent', 'Identifying the species of a flower', 'Grouping customers into segments'], answer: 1 },
  ],
  outcomes: ['Frame a prediction problem as supervised regression', 'Explore a dataset and choose informative features', 'Train, compare and tune several algorithms', 'Evaluate models honestly with MAE, MSE, R² and a held-out set', 'Diagnose overfitting and underfitting from train–test gaps'],
  expected: { points: ['A trained regression model on 7 meaningful features', 'Test R² above 0.90 with MAE around 18 (US$ thousand)', 'An actual-versus-predicted chart close to the diagonal', 'A comparison of four algorithms with a justified choice', 'Predictions for new homes you define'], videoNote: 'Demo walkthrough' },
  learningPath: [
    { label: 'This mini-project', desc: 'Regression with one dataset and four algorithms.' },
    { label: 'In the programme', desc: 'Classification, clustering, feature engineering, cross-validation and pipelines.' },
    { label: 'Advanced modules', desc: 'Deep learning, NLP, model deployment and MLOps.' },
    { label: 'Capstone', desc: 'An end-to-end ML product reviewed by industry mentors.' },
  ],
  share: { hashtags: ['#MachineLearning', '#WrenchWise', '#Python', '#DataScience'], text: 'I just trained my first machine learning model with Wrench Wise! I explored a housing dataset, compared four algorithms and evaluated them with MAE, MSE and R².' },
};
