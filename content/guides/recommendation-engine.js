'use strict';
// Recommendation Engine: guide content. `answer` fields are SERVER-ONLY (stripped by guides.publicGuide()).
module.exports = {
  id: 'recommendation-engine',
  mission: {
    problem: 'Digital streaming platforms and e-commerce stores offer tens of thousands of catalogue items. Without personalisation, users suffer decision fatigue and abandon the service.',
    build: 'You will build a hybrid recommendation engine. You will compute content-based item similarities using TF-IDF text embeddings, build a collaborative filtering user-item rating matrix, and blend them with an adjustable hybrid alpha parameter to solve the cold-start problem.',
    stats: [['25', 'catalogue items'], ['10', 'active user profiles'], ['50+', 'sparse ratings'], ['Hybrid', 'alpha blending']],
  },
  objective: [
    'You will compute content-based similarity scores using TF-IDF vectorization and cosine similarity over item metadata.',
    'You will build a user-item rating matrix and compute collaborative user-user similarity vectors.',
    'You will blend content and collaborative scores using a dynamic alpha slider and handle cold-start users.',
  ],
  prerequisites: [
    'Basic Python programming with dictionaries and arrays',
    'Understanding of dot products and vector similarity (cosine distance)',
    'Familiarity with tabular datasets and matrices',
    'A modern web browser for operating the interactive recommender lab',
    'Optional: Python 3.10+ with pandas, scikit-learn, and scipy installed locally',
  ],
  concepts: [
    { title: 'Content-Based Filtering', summary: 'Recommending items similar to what the user liked in the past.', detail: 'Items are represented as text metadata vectors (e.g., genre tags, directors, keywords). By computing the cosine similarity between item vectors, the engine finds catalogue items mathematically close to a user’s historical favorites.', example: 'If you liked "Inception", recommend "Interstellar" because both share Sci-Fi, Thriller, and Christopher Nolan attributes.', widget: 'fit-line' },
    { title: 'Collaborative Filtering', summary: 'Recommending items liked by users with similar taste.', detail: 'Constructs a sparse matrix where rows represent users and columns represent items. The algorithm computes correlation between rows to identify taste neighbors, then suggests items those neighbors rated highly.', example: 'User A and User B both gave 5 stars to "The Dark Knight" and "Pulp Fiction". If User B loved "Fight Club", recommend it to User A.' },
    { title: 'The Cold-Start Dilemma', summary: 'What to recommend when a user has zero rating history.', detail: 'Collaborative filtering fails completely for brand new users because their taste vector is empty. A robust recommender detects cold-start states and seamlessly falls back to popularity or content-based onboarding selections.', example: 'When signing up on Netflix, asking users to pick 3 favorite genres to bootstrap initial suggestions.' },
    { title: 'Hybrid Alpha Blending', summary: 'Combining content and collaborative signals dynamically.', detail: 'A hybrid model calculates the final score as S = alpha * S_collaborative + (1 - alpha) * S_content. Adjusting alpha lets operators tune the balance between serendipitous community recommendations and strict topic relevance.', example: 'Setting alpha = 0.5 balances user community signals equally with genre similarity.' },
  ],
  architecture: {
    nodes: [
      { id: 'cat', label: 'Item & Rating Data', desc: 'Item metadata (titles, genres, directors) and historical user ratings (1 to 5 stars).', resp: 'Provide ground-truth catalogue and interaction records.', tech: 'CSV / pandas DataFrames', io: 'In: items.csv, ratings.csv · Out: DataFrames' },
      { id: 'tfidf', label: 'Content Vectorizer', desc: 'Transforms genre and description text into sublinear TF-IDF vectors.', resp: 'Represent items in semantic feature space.', tech: 'TfidfVectorizer, cosine_similarity', io: 'In: text strings · Out: Item Similarity Matrix' },
      { id: 'matrix', label: 'User-Item Matrix', desc: 'Pivots user ratings into a sparse User-Item interaction matrix.', resp: 'Map user preferences into taste vectors.', tech: 'pandas.pivot_table, SciPy sparse', io: 'In: ratings DataFrame · Out: Matrix (Users x Items)' },
      { id: 'collab', label: 'Collaborative Scorer', desc: 'Computes cosine similarity between user rows and predicts unrated item scores.', resp: 'Calculate peer-driven recommendation scores.', tech: 'cosine_similarity(U, U)', io: 'In: User vector · Out: Collaborative Scores' },
      { id: 'blend', label: 'Hybrid Alpha Combiner', desc: 'Blends collaborative and content scores: Score = alpha*Collab + (1-alpha)*Content.', resp: 'Produce ranked recommendation lists.', tech: 'Linear Combination & Sorting', io: 'In: alpha, scores · Out: Top-K Recommendations' },
    ],
  },
  tools: [
    { name: 'Python', kind: 'Language', role: 'Data science and algorithm execution', why: 'Rich ecosystem for mathematical computation.' },
    { name: 'scikit-learn', kind: 'Library', role: 'TF-IDF vectorizer and pairwise cosine similarity', why: 'Fast and vectorized distance computations.' },
    { name: 'pandas', kind: 'Library', role: 'Matrix pivoting and DataFrame manipulation', why: 'Intuitive table transformations.' },
    { name: 'Browser Recommender Lab', kind: 'Interactive Lab', role: 'Live hybrid recommendation experimentation lab', why: 'Allows instant testing of alpha weights, new user ratings, and cold-start fallback.' },
  ],
  steps: [
    { title: 'Load catalogue and user rating matrices', objective: 'Inspect items, metadata genres, and rating sparsity.', explanation: 'Load items.csv (25 titles with genre descriptions) and ratings.csv (user-item star ratings). Inspect the sparsity percentage of the matrix.', code: { lang: 'python', text: "import pandas as pd\nitems = pd.read_csv('items.csv')\nratings = pd.read_csv('ratings.csv')\nprint(f'{len(items)} items, {len(ratings)} user ratings')\nprint(items[['title', 'genres']].head())" }, visual: { flow: ['Catalogue CSV', 'Ratings CSV', 'Metadata Inspection', 'Sparsity Analysis'] }, expected: 'Successfully loaded 25 catalogue items and 50+ user ratings with genre tags.', mistakes: ['Ignoring unrated items (treating missing values as 0-star ratings instead of unobserved)', 'Using item title instead of unique item_id'], checkpoint: 'I loaded catalogue and rating records and analyzed matrix sparsity.' },
    { title: 'Compute Content-Based TF-IDF similarities', objective: 'Build item-item cosine similarity matrix from text features.', explanation: 'Fit a TF-IDF vectorizer on combined genre and description text. Compute the 25x25 pairwise cosine similarity matrix between all items.', code: { lang: 'python', text: "from sklearn.feature_extraction.text import TfidfVectorizer\nfrom sklearn.metrics.pairwise import cosine_similarity\ntfidf = TfidfVectorizer(stop_words='english')\ntfidf_matrix = tfidf.fit_transform(items['metadata'])\ncontent_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)" }, visual: { flow: ['Item Metadata', 'TF-IDF Vectorizer', 'Feature Vectors', '25x25 Item Cosine Matrix'] }, expected: '25x25 symmetric cosine similarity matrix with 1.0 along the main diagonal.', mistakes: ['Fitting TF-IDF on short titles alone without rich genre tags', 'Recomputing pairwise similarities on every query instead of pre-vectorizing'], checkpoint: 'I computed item-item similarity vectors using TF-IDF.' },
    { title: 'Build User-Item matrix for Collaborative Filtering', objective: 'Pivot user interactions into user-user taste vectors.', explanation: 'Create a pivot table with users as rows and items as columns. Fill unrated entries with 0.0 and compute cosine similarity across user vectors.', code: { lang: 'python', text: "ui_matrix = ratings.pivot_table(index='user_id', columns='item_id', values='rating').fillna(0.0)\nuser_sim = cosine_similarity(ui_matrix)" }, visual: { flow: ['Ratings List', 'Pivot Table', 'User-Item Matrix', 'User-User Similarity'] }, expected: 'User-Item matrix with user rows and item columns populated by normalized ratings.', mistakes: ['Failing to handle users with only one rating', 'Assuming user similarity is high when they only co-rated a single common item'], checkpoint: 'I constructed the user-item matrix and computed user similarity.' },
    { title: 'Implement Hybrid Alpha blend', objective: 'Combine content and collaborative scoring functions.', explanation: 'Calculate final candidate scores using S = alpha * S_collab + (1 - alpha) * S_content. When alpha=1.0, recommendations are pure collaborative; when alpha=0.0, pure content-based.', code: { lang: 'python', text: "def get_hybrid_recommendations(user_id, alpha=0.5, top_k=5):\n    collab_scores = compute_collab(user_id)\n    content_scores = compute_content(user_id)\n    hybrid = alpha * collab_scores + (1 - alpha) * content_scores\n    return hybrid.sort_values(ascending=False).head(top_k)" }, visual: { flow: ['Collab Scores', 'Content Scores', 'Alpha Weighted Sum', 'Ranked Top-K Items'] }, expected: 'Ranked list of Top-K recommended item IDs with blended scores.', mistakes: ['Adding un-normalized scores from different scales together', 'Not filtering out items the user has already consumed'], checkpoint: 'I combined collaborative and content signals using alpha blending.' },
    { title: 'Handle cold-start onboarding & live rating updates', objective: 'Gracefully fall back when user has zero rating history.', explanation: 'Check if user has recorded ratings. If zero, fall back to top-rated items or category averages. When a user submits a new rating, dynamically recalculate recommendations.', code: { lang: 'python', text: "def recommend(user_id, alpha=0.5):\n    user_ratings = ratings[ratings['user_id'] == user_id]\n    if len(user_ratings) == 0:\n        return get_popularity_baseline() # Cold-start fallback\n    return get_hybrid_recommendations(user_id, alpha)" }, visual: { flow: ['Query User', 'History Check', 'Cold-Start Check', 'Dynamic Refresh'] }, expected: 'Meaningful recommendations returned for both established users and brand-new accounts.', mistakes: ['Returning empty lists for new users', 'Failing to invalidate cached matrix when new ratings arrive'], checkpoint: 'I implemented cold-start handling and live rating updates.' },
  ],
  experiments: [
    { id: 'rec-alpha-sweep', title: 'Hybrid alpha spectrum', desc: 'Adjust alpha from 0.0 (pure content) to 1.0 (pure collaborative) and observe recommendation shift.', button: 'Sweep Alpha Weights' },
    { id: 'rec-cold-start-test', title: 'Cold-start simulation', desc: 'Simulate a brand new subscriber and verify fallback to genre popularity baselines.', button: 'Test Cold-Start Fallback' },
  ],
  checks: [
    { id: 'chk-r1', kind: 'Algorithm', q: 'What is the primary advantage of a hybrid recommender over a pure collaborative filtering engine?', options: ['It can recommend items to new users using content metadata, avoiding the cold-start failure', 'It runs with zero RAM', 'It does not require item titles', 'It never uses math'], answer: 0, explain: 'Pure collaborative filtering cannot score items for a user with no rating history. Content-based metadata provides a reliable fallback.' },
    { id: 'chk-r2', kind: 'Math', q: 'If two movie vectors have a cosine similarity of 0.95, what does this indicate?', options: ['The movies are completely unrelated', 'The movies share nearly identical genre and keyword profiles', 'The movies have opposite themes', 'One movie is twice as long as the other'], answer: 1, explain: 'Cosine similarity of 1.0 indicates identical directional alignment in vector space; 0.95 indicates very high thematic similarity.' },
    { id: 'chk-r3', kind: 'Matrix', q: 'In an e-commerce platform with 100,000 products where each user buys ~5 items, what describes the user-item matrix?', options: ['Extremely dense', 'Highly sparse (over 99.9% zeros/unobserved)', 'Completely filled', 'Negative only'], answer: 1, explain: 'Most users only interact with a tiny fraction of total catalogue inventory, creating extreme matrix sparsity.' },
  ],
  challenge: {
    title: 'Hybrid Recommender Benchmark',
    brief: 'Generate personalized, deduplicated recommendations that balance serendipity and genre relevance with robust cold-start handling.',
    criteria: ['Top-5 recommendations computed in under 20ms', 'Handles both existing users and new cold-start user IDs gracefully', 'Dynamic alpha parameter shifts balance between content and peer signals'],
  },
  milestones: [
    { id: 'rec-explore', label: 'Explored catalogue and rating matrix' },
    { id: 'rec-content', label: 'Built TF-IDF content similarity model' },
    { id: 'rec-collab', label: 'Built user-item collaborative matrix' },
    { id: 'rec-hybrid', label: 'Generated hybrid recommendations' },
  ],
  quiz: [
    { q: 'What is the "cold-start" problem in recommendation systems?', options: ['A server taking time to boot up', 'The difficulty of recommending items to a new user or recommending a brand-new item with zero ratings', 'Compressing video files in cold storage', 'Matrix inversion failure'], answer: 1 },
    { q: 'In the formula Score = alpha * S_collab + (1 - alpha) * S_content, what does alpha = 0.0 produce?', options: ['Pure collaborative filtering', 'Pure content-based filtering', 'Equal 50/50 mix', 'Random guesses'], answer: 1 },
    { q: 'Why should already consumed/rated items generally be filtered out from recommendations?', options: ['Because users already know and watched those items, reducing recommendation utility', 'Because the algorithm crashes if they are included', 'Because their score is always zero', 'Because copyright forbids it'], answer: 0 },
    { q: 'Which distance metric is standard for comparing TF-IDF document vectors?', options: ['Manhattan distance', 'Cosine similarity', 'Hamming distance', 'Euclidean norm of square roots'], answer: 1 },
  ],
  outcomes: [
    'Design and build content-based filtering pipelines using TF-IDF and cosine similarity',
    'Construct sparse user-item interaction matrices for collaborative filtering',
    'Implement hybrid recommendation architectures with adjustable blending weights',
    'Mitigate the cold-start challenge for newly onboarded subscribers',
    'Deploy real-time recommendation APIs that dynamically incorporate new user ratings',
  ],
  expected: {
    points: [
      'A working hybrid recommendation engine operating on 25 catalogue items and user taste vectors',
      'TF-IDF content similarity matrix capturing genre and thematic affinities',
      'Collaborative filtering module identifying peer user preferences',
      'Adjustable alpha slider dynamically tuning content vs collaborative weightings',
      'Seamless cold-start fallback ensuring zero empty recommendation screens',
    ],
  },
  learningPath: [
    { label: 'This mini-project', desc: 'Hybrid content and collaborative filtering with Scikit-learn.' },
    { label: 'In the programme', desc: 'Matrix factorization (SVD, Alternating Least Squares) and implicit feedback modeling.' },
    { label: 'Advanced modules', desc: 'Two-tower deep retrieval networks and sequential transformer recommenders.' },
    { label: 'Capstone', desc: 'Real-time e-commerce or streaming recommendation engine with A/B testing.' },
  ],
  share: {
    hashtags: ['#RecommendationSystems', '#MachineLearning', '#DataScience', '#TFIDF', '#WrenchWise'],
    text: 'I just built a Hybrid Recommendation Engine with Wrench Wise! Blended TF-IDF content similarity with collaborative filtering matrices and solved the cold-start problem.',
  },
};
