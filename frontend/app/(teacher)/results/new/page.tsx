"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch, Student, Test } from "@/lib/api";

const inputCls = "border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500";

function ResultNewContent() {
  const searchParams = useSearchParams();
  const presetStudentId = searchParams.get("student_id") ?? "";
  const presetTestId = searchParams.get("test_id") ?? "";

  const [students, setStudents] = useState<Student[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [studentId, setStudentId] = useState(presetStudentId);
  const [testId, setTestId] = useState(presetTestId);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Student[]>("/students").then(setStudents).catch(() => {});
    apiFetch<Test[]>("/tests").then(setTests).catch(() => {});
  }, []);

  const selectedTest = tests.find((t) => t.id === Number(testId));

  // 테스트 선택 시 기존 답안 로드 (편집 모드), 없으면 전부 O로 초기화
  useEffect(() => {
    if (!selectedTest || !studentId) return;
    const init: Record<number, boolean> = {};
    for (let i = 1; i <= selectedTest.question_count; i++) init[i] = true;

    // 기존 결과가 있으면 로드
    type MatchRow = { id: number; student_id: number; test_id: number };
    apiFetch<MatchRow[]>(`/results?student_id=${studentId}&test_id=${testId}`)
      .then((arr) => {
        const match = arr.find((r) => r.student_id === Number(studentId) && r.test_id === Number(testId));
        if (match) {
          apiFetch<{ question_results: { question_no: number; is_correct: boolean }[] }>(`/results/${match.id}/detail`)
            .then((detail) => {
              const loaded: Record<number, boolean> = { ...init };
              for (const q of detail.question_results) loaded[q.question_no] = q.is_correct;
              setAnswers(loaded);
            }).catch(() => setAnswers(init));
        } else {
          setAnswers(init);
        }
      }).catch(() => setAnswers(init));
    setSaved(false);
  }, [testId, studentId]);

  const toggle = (no: number) =>
    setAnswers((prev) => ({ ...prev, [no]: !prev[no] }));

  const submit = async () => {
    setError("");
    if (!studentId || !testId) {
      setError("학생과 테스트를 선택해주세요");
      return;
    }
    const question_results = Object.entries(answers).map(([no, is_correct]) => ({
      question_no: Number(no),
      is_correct,
    }));
    try {
      await apiFetch("/results/", {
        method: "POST",
        body: JSON.stringify({
          student_id: Number(studentId),
          test_id: Number(testId),
          question_results,
        }),
      });
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "저장 실패");
    }
  };

  const filteredStudents = students.filter((s) =>
    s.name.includes(search) || s.grade.includes(search)
  );

  const score = Object.values(answers).filter(Boolean).length;
  const isEdit = !!(presetStudentId && presetTestId);

  return (
    <div>
      <h1 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        {isEdit ? "결과 수정" : "결과 입력"}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* 학생 선택 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3 text-gray-800 dark:text-gray-100">1. 학생 선택</h2>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="이름/학년 검색" className={inputCls + " w-full mb-2"} />
          <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
            {filteredStudents.map((s) => (
              <div
                key={s.id}
                onClick={() => setStudentId(String(s.id))}
                className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                  studentId === String(s.id)
                    ? "bg-indigo-100 dark:bg-indigo-900/50 font-semibold text-indigo-700 dark:text-indigo-300"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                }`}
              >
                {s.name} ({s.grade})
              </div>
            ))}
          </div>
        </div>

        {/* 테스트 선택 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3 text-gray-800 dark:text-gray-100">2. 테스트 선택</h2>
          <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
            {tests.map((t) => (
              <div
                key={t.id}
                onClick={() => setTestId(String(t.id))}
                className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                  testId === String(t.id)
                    ? "bg-indigo-100 dark:bg-indigo-900/50 font-semibold text-indigo-700 dark:text-indigo-300"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                }`}
              >
                {t.title} <span className="text-gray-400 dark:text-gray-500 text-xs">({t.test_date})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 문항별 O/X 입력 */}
      {selectedTest && studentId && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4 shadow-sm">
          <h2 className="font-semibold mb-1 text-gray-800 dark:text-gray-100">
            3. 문항별 정답 체크
            <span className="ml-2 text-indigo-600 dark:text-indigo-400 text-sm">
              ({score} / {selectedTest.question_count} 정답)
            </span>
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            스캔본을 보며 클릭해서 O(정답)/X(오답)를 표시하세요.
            {isEdit && <span className="text-amber-600 dark:text-amber-400 ml-1">기존 답안이 로드되었습니다.</span>}
          </p>
          <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-2">
            {Object.entries(answers).map(([no, correct]) => (
              <button
                key={no}
                onClick={() => toggle(Number(no))}
                className={`flex flex-col items-center justify-center rounded-lg border-2 py-2 text-sm font-bold transition-colors ${
                  correct
                    ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                }`}
              >
                <span className="text-xs text-gray-400 dark:text-gray-500">{no}번</span>
                <span className="text-lg">{correct ? "O" : "X"}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-red-500 dark:text-red-400 text-sm mb-2">{error}</p>}
      {saved && <p className="text-green-600 dark:text-green-400 text-sm mb-2">저장되었습니다!</p>}

      <button
        onClick={submit}
        disabled={!studentId || !testId}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 shadow-sm"
      >
        {isEdit ? "재저장" : "결과 저장"}
      </button>
    </div>
  );
}

export default function ResultNewPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 py-20 text-center">불러오는 중...</div>}>
      <ResultNewContent />
    </Suspense>
  );
}
