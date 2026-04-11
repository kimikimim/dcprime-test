"""
입학테스트 스캔본 PDF → Supabase historical_students 적재 스크립트

폴더 구조:
  입학테스트 스캔본/
    배정확정/         → outcome = "배정확정"
    등록불가 및 포기/ → outcome = "등록불가"

필요 패키지:
  pip3 install pymupdf anthropic psycopg2-binary --break-system-packages
"""

import os
import json
import base64
import psycopg2
from psycopg2.extras import execute_values
from urllib.parse import urlparse
from pathlib import Path
import anthropic

# ── 설정 ──────────────────────────────────────────────────────────────────────
NAS_ROOT = os.path.expanduser("~/SynologyDrive/DCPRIME/3. 선생님/3. 선생님/원장/입학테스트 스캔본")
FOLDERS = {
    "배정 확정": "배정확정",
    "등록 불가 및 포기": "등록불가",
}

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres.kofiuihaklvscrabqaqc:dcprime0979!@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"
)
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

def build_prompt(filename: str) -> str:
    """파일명에서 힌트를 추출해 프롬프트 생성"""
    import re
    hint_parts = []

    # 날짜 제거 (앞의 숫자 8자리 또는 6자리)
    stem = re.sub(r'^\d{6,8}\s*', '', Path(filename).stem)
    # "완 " 같은 접두어 제거
    stem = re.sub(r'^완\s*', '', stem).strip()

    # 학년 추출 (고1~고3, 중1~중3, 초5~초6)
    grade_match = re.search(r'(고[1-3]|중[1-3]|초[5-6])', stem)
    hint_grade = grade_match.group(1) if grade_match else None

    # 과목 추출
    subject_map = {'수학': '수학', '영어': '영어', '국어': '국어', '과학': '과학'}
    hint_subject = next((v for k, v in subject_map.items() if k in stem), None)

    # 학교명 추출 (학년 앞 부분)
    school_match = re.search(r'([가-힣]+(?:고|중|초))', stem)
    hint_school = school_match.group(1) if school_match else None

    # 이름 추출: 학교+학년 뒤, 과목 앞의 한글 단어
    name_match = re.search(r'(?:고[1-3]|중[1-3]|초[5-6])\s+([가-힣]{2,4})', stem)
    hint_name = name_match.group(1) if name_match else None

    if hint_name:
        hint_parts.append(f"학생 이름: {hint_name}")
    if hint_grade:
        hint_parts.append(f"학년: {hint_grade}")
    if hint_school:
        hint_parts.append(f"학교: {hint_school}")
    if hint_subject:
        hint_parts.append(f"과목: {hint_subject}")

    hint_str = "\n".join(hint_parts) if hint_parts else "없음"

    return f"""이 이미지는 학원 입학테스트 답안지입니다. 아래 정보를 JSON으로 추출해주세요.

【파일명 기반 힌트 - 최우선 적용】
파일명: {filename}
{hint_str}

⚠️ 위 힌트 정보(이름/학년/학교/과목)는 파일명에서 가져온 것으로 가장 신뢰도가 높습니다.
   이미지에서 읽은 내용이 불분명하거나 다를 경우 파일명 힌트를 우선 사용하세요.

추출 항목:
- name: 학생 이름 (힌트 우선, 이미지에서 명확히 다른 경우만 이미지 기준)
- grade: 학년 (고1/고2/고3/중1/중2/중3/초5/초6 중 하나, 힌트 우선)
- school: 학교명 (힌트 우선)
- subject: 과목 (수학/영어/국어/과학 중 하나, 힌트 우선)
- score: 획득 점수 (숫자, 이미지에서만 확인 가능 — 없으면 null)
- total: 만점 (숫자, 이미지에서만 확인 가능 — 없으면 null)
- question_results: 문항별 정오답 {{"1": true/false, ...}}
  채점 방식은 두 가지 케이스가 있으니 이미지를 보고 판단하세요:

  [케이스 A] 맞은 것만 표시 (동그라미 O만 있음)
    - 빨간 동그라미(O) = true (정답)
    - 표시 없음 = false (오답)

  [케이스 B] 틀린 것만 표시 (빗금/X만 있음)
    - 빗금(/) 또는 X = false (오답)
    - 표시 없음 = true (정답)

  [케이스 C] 둘 다 표시
    - 빨간 동그라미(O) = true, 빗금(/) 또는 X = false

  ⚠️ 문항 번호 범위(1번~마지막 번호)를 먼저 파악한 뒤, 범위 내 모든 문항을 포함하세요.
     표시가 없더라도 범위 안의 문항이면 케이스에 따라 true/false로 채워주세요.

반드시 JSON만 반환하고 다른 텍스트는 쓰지 마세요.
예시: {{"name": "홍길동", "grade": "고1", "school": "능곡고", "subject": "수학", "score": 85, "total": 100, "question_results": {{"1": true, "2": false, "3": true}}}}
"""


def pdf_to_images(pdf_path: str) -> list[bytes]:
    """PDF 각 페이지를 PNG bytes로 변환"""
    import fitz  # pymupdf
    doc = fitz.open(pdf_path)
    images = []
    for page in doc:
        mat = fitz.Matrix(3.0, 3.0)  # 3배 해상도
        pix = page.get_pixmap(matrix=mat)
        images.append(pix.tobytes("png"))
    doc.close()
    return images


def extract_with_claude(images: list[bytes], client: anthropic.Anthropic, filename: str) -> dict:
    """Claude Vision으로 답안지 정보 추출"""
    content = []
    for i, img_bytes in enumerate(images[:4]):  # 최대 4페이지
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/png",
                "data": base64.standard_b64encode(img_bytes).decode()
            }
        })
    content.append({"type": "text", "text": build_prompt(filename)})

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": content}]
    )
    raw = response.content[0].text.strip()
    # JSON 블록 파싱
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)


def main():
    if not ANTHROPIC_API_KEY:
        print("❌ ANTHROPIC_API_KEY 환경변수를 설정해주세요")
        return

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    p = urlparse(DATABASE_URL)
    conn = psycopg2.connect(
        host=p.hostname, port=p.port or 5432,
        dbname=p.path.lstrip("/"), user=p.username, password=p.password,
    )
    cur = conn.cursor()

    # 이미 처리된 파일 목록
    cur.execute("SELECT source_file FROM historical_students WHERE source_file IS NOT NULL")
    already_done = {row[0] for row in cur.fetchall()}
    print(f"이미 처리된 파일: {len(already_done)}개")

    total_ok = 0
    total_skip = 0
    total_err = 0

    for folder_name, outcome in FOLDERS.items():
        folder_path = Path(NAS_ROOT) / folder_name
        if not folder_path.exists():
            print(f"⚠️  폴더 없음: {folder_path}")
            continue

        import unicodedata
        pdfs = sorted([p for p in list(folder_path.glob("*.pdf")) + list(folder_path.glob("*.PDF")) if '수학' in unicodedata.normalize('NFC', p.name)])[:5]
        print(f"\n📂 {folder_name} ({outcome}): {len(pdfs)}개 (최대 5개, 수학만)")

        for pdf_path in pdfs:
            rel_name = str(pdf_path.name)

            if rel_name in already_done:
                print(f"  ⏭️  스킵: {rel_name}")
                total_skip += 1
                continue

            print(f"  🔍 처리중: {rel_name} ... ", end="", flush=True)
            try:
                images = pdf_to_images(str(pdf_path))
                data = extract_with_claude(images, client, rel_name)

                name = data.get("name") or rel_name
                grade = data.get("grade")
                school = data.get("school")
                subject = data.get("subject")
                score = data.get("score")
                total_q = data.get("total")
                score_pct = round(score / total_q * 100) if score and total_q else None
                q_results = data.get("question_results", {})

                cur.execute(
                    """INSERT INTO historical_students
                       (name, grade, school, subject, score, total, score_pct, outcome, source_file)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                    (name, grade, school, subject, score, total_q, score_pct, outcome, rel_name)
                )
                hs_id = cur.fetchone()[0]

                if q_results:
                    rows = [
                        (hs_id, int(qno), bool(is_correct))
                        for qno, is_correct in q_results.items()
                        if isinstance(is_correct, bool)
                    ]
                    execute_values(
                        cur,
                        "INSERT INTO historical_question_results (historical_student_id, question_no, is_correct) VALUES %s",
                        rows
                    )

                conn.commit()
                print(f"✓ {name} / {grade} / {subject} / {score}/{total_q} / 문항{len(q_results)}개")
                total_ok += 1

            except Exception as e:
                conn.rollback()
                print(f"❌ 오류: {e}")
                total_err += 1

    cur.close()
    conn.close()
    print(f"\n완료: 성공 {total_ok}개 | 스킵 {total_skip}개 | 오류 {total_err}개")


if __name__ == "__main__":
    main()
