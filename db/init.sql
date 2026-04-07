-- 반 정보
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,        -- 예: "중1 수학 A반"
    grade VARCHAR(20) NOT NULL,       -- 예: "중1", "고2"
    subject VARCHAR(20) NOT NULL,     -- 예: "수학", "영어"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 학생
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    grade VARCHAR(20) NOT NULL,       -- 예: "초6", "중2", "고1"
    school VARCHAR(100),
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 테스트
CREATE TABLE tests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,      -- 예: "2025년 3월 고1 수학 입학테스트"
    grade VARCHAR(20) NOT NULL,
    subject VARCHAR(20) NOT NULL,
    question_count INTEGER NOT NULL CHECK (question_count BETWEEN 1 AND 100),
    answers JSONB NOT NULL,           -- 예: {"1": "3", "2": "1", ...} (객관식) 또는 {"1": "O"}
    test_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 응시 결과 (학생별 테스트 결과)
CREATE TABLE test_results (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,           -- 맞은 문항 수
    total INTEGER NOT NULL,           -- 전체 문항 수
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (student_id, test_id)
);

-- 문항별 O/X
CREATE TABLE question_results (
    id SERIAL PRIMARY KEY,
    result_id INTEGER NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
    question_no INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL
);

-- 반 배정 규칙
CREATE TABLE class_rules (
    id SERIAL PRIMARY KEY,
    test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    min_score INTEGER NOT NULL,
    max_score INTEGER NOT NULL
);

-- 인덱스
CREATE INDEX idx_test_results_test_id ON test_results(test_id);
CREATE INDEX idx_test_results_student_id ON test_results(student_id);
CREATE INDEX idx_question_results_result_id ON question_results(result_id);

-- 단어시험
CREATE TABLE word_tests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    grade VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('EN_KR','KR_EN')),
    test_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE word_test_items (
    id SERIAL PRIMARY KEY,
    word_test_id INTEGER NOT NULL REFERENCES word_tests(id) ON DELETE CASCADE,
    item_no INTEGER NOT NULL,
    question VARCHAR(200) NOT NULL,
    answer VARCHAR(200) NOT NULL,
    tag VARCHAR(50)
);

CREATE TABLE word_submissions (
    id SERIAL PRIMARY KEY,
    word_test_id INTEGER NOT NULL REFERENCES word_tests(id) ON DELETE CASCADE,
    student_name VARCHAR(50) NOT NULL,
    grade VARCHAR(20) NOT NULL,
    image_path VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'pending_manual',
    score INTEGER,
    total INTEGER,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE word_submission_items (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES word_submissions(id) ON DELETE CASCADE,
    item_no INTEGER NOT NULL,
    question VARCHAR(200),
    correct_answer VARCHAR(200),
    student_answer VARCHAR(200),
    is_correct BOOLEAN
);

CREATE INDEX idx_word_submissions_test_id ON word_submissions(word_test_id);
CREATE INDEX idx_word_submission_items_submission_id ON word_submission_items(submission_id);

-- 문항 유형 태그
CREATE TABLE test_question_tags (
    id SERIAL PRIMARY KEY,
    test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_no INTEGER NOT NULL,
    tag VARCHAR(100) NOT NULL,
    UNIQUE(test_id, question_no)
);
CREATE INDEX idx_test_question_tags_test_id ON test_question_tags(test_id);

-- 역대 입학테스트 이력 데이터
CREATE TABLE historical_students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    grade VARCHAR(20),
    school VARCHAR(100),
    subject VARCHAR(20),
    score INTEGER,
    total INTEGER,
    score_pct INTEGER,
    outcome VARCHAR(20) DEFAULT '배정확정',
    source_file VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE historical_question_results (
    id SERIAL PRIMARY KEY,
    historical_student_id INTEGER NOT NULL REFERENCES historical_students(id) ON DELETE CASCADE,
    question_no INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL
);

CREATE INDEX idx_historical_students_grade ON historical_students(grade);
CREATE INDEX idx_historical_students_subject ON historical_students(subject);

-- students에 historical_student_id FK 추가 (historical_students 테이블 생성 후)
ALTER TABLE students ADD COLUMN IF NOT EXISTS historical_student_id INTEGER REFERENCES historical_students(id) ON DELETE SET NULL;

-- word_tutoring_sessions
CREATE TABLE IF NOT EXISTS word_tutoring_sessions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    word_test_id INTEGER REFERENCES word_tests(id) ON DELETE SET NULL,
    session_date DATE NOT NULL,
    attempt1_total INTEGER,
    attempt1_wrong INTEGER,
    attempt2_total INTEGER,
    attempt2_wrong INTEGER,
    attempt3_total INTEGER,
    attempt3_wrong INTEGER,
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_word_tutoring_sessions_student ON word_tutoring_sessions(student_id);
