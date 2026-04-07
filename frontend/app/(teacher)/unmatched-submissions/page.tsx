"use client";
import { useEffect, useState } from "react";
import { apiFetch, Student, WordSubmissionDetail } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface UnmatchedSummary {
  id: number;
  student_name: string;
  grade: string;
  status: string;
  score: number | null;
  total: number | null;
  submitted_at: string;
}

export default function UnmatchedSubmissionsPage() {
  const [submissions, setSubmissions] = useState<UnmatchedSummary[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<WordSubmissionDetail | null>(null);
  const [assignStudentId, setAssignStudentId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  const load = () => {
    apiFetch<UnmatchedSummary[]>("/word-submissions?status=unmatched")
      .then(setSubmissions)
      .catch(() => {});
    apiFetch<Student[]>("/students").then(setStudents).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (id: number) => {
    setSelectedId(id);
    setAssignStudentId("");
    setStudentSearch("");
    const d = await apiFetch<WordSubmissionDetail>(`/word-submissions/${id}`);
    setDetail(d);
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setAssignStudentId("");
    setStudentSearch("");
  };

  const assign = async () => {
    if (!selectedId || !assignStudentId) return;
    setAssigning(true);
    try {
      await apiFetch(`/word-submissions/${selectedId}/assign`, {
        method: "PUT",
        body: JSON.stringify({ student_id: Number(assignStudentId) }),
      });
      load();
      closeDetail();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "연결 실패");
    } finally {
      setAssigning(false);
    }
  };

  const delSubmission = async (id: number) => {
    if (!window.confirm("삭제하시겠습니까?")) return;
    await apiFetch(`/word-submissions/${id}`, { method: "DELETE" });
    load();
    if (selectedId === id) closeDetail();
  };

  const filteredStudents = students.filter((s) =>
    s.name.includes(studentSearch) || s.grade.includes(studentSearch)
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">매칭 불가 테스트 결과</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          자동채점 중 학생 매칭에 실패한 답안입니다. 올바른 학생을 찾아 연결하세요.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                {["제출일시", "인식된 이름", "반/학년", "점수", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {submissions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                    {new Date(s.submitted_at).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-4 py-3 font-medium text-orange-700 dark:text-orange-400">{s.student_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.grade || "-"}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {s.score !== null && s.total !== null
                      ? `${s.score}/${s.total} (${Math.round(s.score / s.total * 100)}%)`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap space-x-3">
                    <button onClick={() => openDetail(s.id)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-medium">
                      학생 연결
                    </button>
                    <a href={`${BASE}/api/word-submissions/${s.id}/image`} target="_blank" rel="noreferrer"
                      className="text-blue-500 dark:text-blue-400 hover:underline text-xs font-medium">
                      답안 보기
                    </a>
                    <button onClick={() => delSubmission(s.id)}
                      className="text-red-500 dark:text-red-400 hover:underline text-xs font-medium">
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">
                    매칭 불가 답안이 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 학생 연결 모달 */}
      {selectedId && detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl my-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  학생 연결 — 인식된 이름: <span className="text-orange-600 dark:text-orange-400">{detail.student_name}</span>
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  반/학년: {detail.grade || "미상"} | {new Date(detail.submitted_at).toLocaleString("ko-KR")}
                  {detail.score !== null && detail.total !== null && (
                    <span className="ml-3 font-medium text-indigo-600 dark:text-indigo-400">
                      점수: {detail.score}/{detail.total}
                    </span>
                  )}
                </p>
              </div>
              <button onClick={closeDetail} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none p-1">×</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-gray-700">
              {/* 답안 이미지 */}
              <div className="p-4">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">채점된 답안</p>
                <img
                  src={`${BASE}/api/word-submissions/${selectedId}/image`}
                  alt="답안"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 object-contain max-h-[500px]"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>

              {/* 학생 선택 */}
              <div className="p-4 flex flex-col gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">채점 결과 미리보기</p>
                  <div className="overflow-y-auto max-h-48 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-gray-500 dark:text-gray-400">No</th>
                          <th className="px-2 py-1.5 text-left text-gray-500 dark:text-gray-400">문제</th>
                          <th className="px-2 py-1.5 text-left text-gray-500 dark:text-gray-400">학생 답</th>
                          <th className="px-2 py-1.5 text-center text-gray-500 dark:text-gray-400">결과</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {detail.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-2 py-1.5 text-gray-400">{item.item_no}</td>
                            <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{item.question}</td>
                            <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{item.student_answer ?? "-"}</td>
                            <td className="px-2 py-1.5 text-center font-bold">
                              <span className={
                                item.is_correct === true ? "text-green-600 dark:text-green-400" :
                                item.is_correct === false ? "text-red-600 dark:text-red-400" :
                                "text-amber-500"
                              }>
                                {item.is_correct === true ? "O" : item.is_correct === false ? "X" : "△"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">학생 검색 후 연결</p>
                  <input
                    type="text"
                    placeholder="이름 또는 학년으로 검색..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                  />
                  <select
                    value={assignStudentId}
                    onChange={(e) => setAssignStudentId(e.target.value)}
                    size={8}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {filteredStudents.map((s) => (
                      <option key={s.id} value={s.id} className="px-3 py-1.5">
                        {s.name} ({s.grade})
                      </option>
                    ))}
                    {filteredStudents.length === 0 && (
                      <option disabled>검색 결과 없음</option>
                    )}
                  </select>
                  {assignStudentId && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                      선택됨: {students.find((s) => s.id === Number(assignStudentId))?.name}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 justify-end mt-auto pt-2">
                  <button onClick={closeDetail}
                    className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    취소
                  </button>
                  <button
                    onClick={assign}
                    disabled={!assignStudentId || assigning}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    {assigning ? "처리 중..." : "학생 연결 & 확정"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
