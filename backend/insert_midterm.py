"""
2026 중간고사 데이터 삽입 스크립트
실행 방법:
  docker compose exec backend python insert_midterm.py
  또는
  python insert_midterm.py  (백엔드 디렉토리에서)
"""
import sys
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text
from config import DATABASE_URL

# ? 또는 미기재 → 0 으로 표현 (DB 저장 시 NULL, 오답 처리)
TESTS = [
    {
        "title": "대치프라임_중간고사_수학_중2",
        "grade": "중2",
        "answers": [3,5,2,2,4,3,4,1,5,4,3,5,2,4,5,3,2,5,5,4],
        "students": [
            ("김세민", [3,5,2,2,4,3,4,1,5,4,3,5,2,4,5,3,0,0,0,0]),
        ],
    },
    {
        "title": "대치프라임_중간고사_수학_초5",
        "grade": "초5",
        "answers": [2,5,5,1,1,3,4,4,3,5,3,2,2,4,4,3,4,5,3,4],
        "students": [
            ("김민찬", [3,5,5,1,1,3,4,4,4,1,3,3,2,4,1,5,1,5,2,4]),
        ],
    },
    {
        "title": "대치프라임_중간고사_국어_중3",
        "grade": "중3",
        "answers": [2,2,4,4,4,2,1,3,5,2,5,5,2,2,3,3],
        "students": [
            ("박서인", [5,5,1,5,1,5,4,3,1,2,4,3,4,3,5,2]),
        ],
    },
    {
        "title": "대치프라임_중간고사_국어_중1",
        "grade": "중1",
        "answers": [5,5,1,4,1,5,4,3,1,2,4,5,4,4,5,2,3,2,2,1],
        "students": [
            ("박상현", [5,5,1,2,1,5,4,3,1,2,4,3,4,4,5,2,3,2,2,5]),
            ("김아림",  [5,5,1,2,1,5,4,3,1,2,4,3,4,4,5,2,3,2,2,1]),
        ],
    },
    {
        "title": "대치프라임_중간고사_과학_중3",
        "grade": "중3",
        "answers": [5,3,5,5,4,5,3,4,1,1,3,4,3,4,5,4],
        "students": [
            ("박서인", [5,4,5,5,5,5,3,4,1,3,5,5,5,3,0,0]),
        ],
    },
    {
        "title": "대치프라임_중간고사_과학_중1",
        "grade": "중1",
        "answers": [2,1,4,3,3,4,4,5,2,5,4,5,2,4,3,5,2,4,1,5,1],
        "students": [
            ("박상현", [2,4,5,4,4,4,3,5,4,3,3,5,2,1,5,2,2,4,3,4,5]),
            ("김아림",  [2,1,4,3,3,4,4,5,2,5,2,5,2,4,3,5,2,4,1,5,1]),
        ],
    },
    {
        "title": "대치프라임_중간고사_영어_초5",
        "grade": "초5",
        "answers": [3,3,5,2,3,5,4,2,4,3,5,4,4,3,5,5,4,5,3,5,5,2,5,5,1,2,4,3,5,4,3,4],
        "students": [
            ("김민찬", [4,3,1,2,3,3,4,2,4,3,5,1,1,5,3,3,4,1,4,2,3,3,5,1,1,4,2,5,2,4,3,4]),
            ("정윤호", [2,4,1,0,5,3,2,2,5,1,3,4,3,3,3,1,2,1,4,1,3,2,3,3,5,1,3,2,5,1,3,4]),
        ],
    },
    {
        "title": "대치프라임_중간고사_영어_중2",
        "grade": "중2",
        "answers": [5,3,2,2,5,5,3,5,3,2,3,5,4,3,4,4,3],
        "students": [
            ("김세민", [2,3,2,2,1,1,4,5,3,3,3,5,4,3,2,4,3]),
            ("김서현", [1,5,3,4,2,1,4,5,1,4,3,5,4,3,4,4,2]),
            ("김서영", [5,4,4,2,5,5,2,3,3,2,3,5,2,3,2,1,4]),
        ],
    },
]


def run():
    import json
    engine = create_engine(DATABASE_URL)
    print(f"[insert] DB 연결: {DATABASE_URL}\n")

    with engine.connect() as conn:
        for t in TESTS:
            title   = t["title"]
            grade   = t["grade"]
            answers = t["answers"]
            n       = len(answers)

            # 시험 중복 체크
            existing = conn.execute(
                text("SELECT id FROM math_tests WHERE title = :title"),
                {"title": title}
            ).fetchone()

            if existing:
                tid = existing[0]
                print(f"[insert] SKIP  {title} (이미 존재 id={tid})")
            else:
                row = conn.execute(
                    text("""
                        INSERT INTO math_tests(title, grade, test_date, num_questions, answers)
                        VALUES(:title, :grade, CURRENT_DATE, :n, :answers)
                        RETURNING id
                    """),
                    {"title": title, "grade": grade, "n": n, "answers": json.dumps(answers)},
                ).fetchone()
                conn.commit()
                tid = row[0]
                print(f"[insert] OK    {title} (id={tid})")

            # 학생별 제출 삽입
            for name, stu in t["students"]:
                # 학생 id 조회
                sid_row = conn.execute(
                    text("SELECT id FROM students WHERE name = :name LIMIT 1"),
                    {"name": name}
                ).fetchone()
                sid = sid_row[0] if sid_row else None

                # 점수 계산
                score = sum(
                    1 for i, (s, a) in enumerate(zip(stu, answers))
                    if s and s > 0 and s == a
                )

                sub_row = conn.execute(
                    text("""
                        INSERT INTO math_submissions(math_test_id, student_id, student_name, status, score, total)
                        VALUES(:tid, :sid, :name, 'graded', :score, :total)
                        RETURNING id
                    """),
                    {"tid": tid, "sid": sid, "name": name, "score": score, "total": n},
                ).fetchone()
                conn.commit()
                sub_id = sub_row[0]

                # 문항별 삽입
                for q, (s_ans, c_ans) in enumerate(zip(stu, answers), start=1):
                    conn.execute(
                        text("""
                            INSERT INTO math_submission_items
                              (submission_id, question_no, student_answer, correct_answer, is_correct)
                            VALUES(:sub_id, :q,
                              CASE WHEN :s = 0 THEN NULL ELSE :s END,
                              :c,
                              :s > 0 AND :s = :c)
                        """),
                        {"sub_id": sub_id, "q": q, "s": s_ans or 0, "c": c_ans},
                    )
                conn.commit()
                print(f"  → {name}: {score}/{n}")

    print("\n[insert] 완료.")


if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        print(f"[insert] 에러: {e}", file=sys.stderr)
        sys.exit(1)
