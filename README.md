# DCPRIME 입학테스트 관리 시스템

## 시놀로지 NAS 배포 방법

### 1. 프로젝트 파일 NAS에 복사
- File Station에서 `/docker/dcprime-test` 폴더 생성
- 전체 프로젝트 파일 업로드

### 2. Container Manager에서 실행
- Synology DSM → Container Manager → 프로젝트 → 생성
- docker-compose.yml 경로 지정: `/docker/dcprime-test/docker-compose.yml`
- 실행

### 3. 접속
- 프론트엔드: `http://NAS_IP:3000`
- API 문서: `http://NAS_IP:8000/docs`

---

## 로컬 개발 실행

```bash
docker compose up --build
```

---

## 환경변수 변경 (선택)

`docker-compose.yml`에서 DB 비밀번호 등을 변경할 수 있습니다:
```yaml
POSTGRES_PASSWORD: 원하는비밀번호
DATABASE_URL: postgresql://dcprime:원하는비밀번호@db:5432/dcprime
```

---

## 기능

| 메뉴 | 기능 |
|------|------|
| 학생 관리 | 학생 등록/조회/삭제, 학년·반 필터 |
| 테스트 관리 | 테스트 생성, 정답 등록 |
| 결과 입력 | 스캔본 보며 문항별 O/X 체크 |
| 분석 대시보드 | 문항별 오답률 차트, 반별 분포 |
| 반 배정 | 점수 구간 규칙 설정 → 자동 배정 추천 → 확정 |
