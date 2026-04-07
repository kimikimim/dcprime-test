"use client";
import { useEffect, useState } from "react";
import { apiFetch, Test, Student, ResultSummary, ResultDetail } from "@/lib/api";
import Link from "next/link";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const selectCls = "border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function ResultsPage() {
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filterTestId, setFilterTestId] = useState("");
  const [filterStudentId, setFilterStudentId] = useState("");
  const [printData, setPrintData] = useState<{ summary: ResultSummary; detail: ResultDetail } | null>(null);

  const load = async () => {
    const params = new URLSearchParams();
    if (filterTestId) params.set("test_id", filterTestId);
    if (filterStudentId) params.set("student_id", filterStudentId);
    const q = params.toString() ? `?${params}` : "";
    const [r, t, s] = await Promise.all([
      apiFetch<ResultSummary[]>(`/results${q}`),
      apiFetch<Test[]>("/tests"),
      apiFetch<Student[]>("/students"),
    ]);
    setResults(r); setTests(t); setStudents(s);
  };

  useEffect(() => { load(); }, [filterTestId, filterStudentId]);

  const del = async (id: number) => {
    if (!confirm("이 결과를 삭제하시겠습니까?")) return;
    await apiFetch(`/results/${id}`, { method: "DELETE" });
    load();
  };

  const exportExcel = () => {
    const params = new URLSearchParams();
    if (filterTestId) params.set("test_id", filterTestId);
    if (filterStudentId) params.set("student_id", filterStudentId);
    const q = params.toString() ? `?${params}` : "";
    window.location.href = `${BASE}/api/results/export/excel${q}`;
  };

  const openPrint = async (summary: ResultSummary) => {
    const detail = await apiFetch<ResultDetail>(`/results/${summary.id}/detail`);
    setPrintData({ summary, detail });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">결과 조회</h1>
        <div className="flex gap-2">
          <button onClick={exportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
            엑셀 다운로드
          </button>
          <Link href="/results/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
            + 결과 입력
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">테스트</label>
          <select value={filterTestId} onChange={(e) => setFilterTestId(e.target.value)} className={selectCls}>
            <option value="">전체 테스트</option>
            {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">학생</label>
          <select value={filterStudentId} onChange={(e) => setFilterStudentId(e.target.value)} className={selectCls}>
            <option value="">전체 학생</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
          </select>
        </div>
        <div className="self-end">
          <button onClick={() => { setFilterTestId(""); setFilterStudentId(""); }}
            className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-2">
            초기화
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                {["학생","학년","테스트","과목","점수","점수율","시행일","","",""].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {results.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/students/${r.student_id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{r.student_name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.grade}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.test_title}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.subject}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{r.score}/{r.total}</td>
                  <td className="px-4 py-3">
                    {r.score_pct != null ? (
                      <span className={`font-semibold ${r.score_pct >= 80 ? "text-green-600 dark:text-green-400" : r.score_pct >= 60 ? "text-yellow-600 dark:text-yellow-400" : "text-red-500 dark:text-red-400"}`}>
                        {r.score_pct}%
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{r.test_date ?? "-"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openPrint(r)} className="text-xs text-blue-500 dark:text-blue-400 hover:underline font-medium">상세/인쇄</button>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/results/new?student_id=${r.student_id}&test_id=${r.test_id}`}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                      수정
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => del(r.id)} className="text-xs text-red-500 dark:text-red-400 hover:underline font-medium">삭제</button>
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">결과가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{results.length}건</p>

      {/* 상세/인쇄 모달 */}
      {printData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl my-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 print:hidden">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {printData.summary.student_name} — {printData.summary.test_title}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium">
                  인쇄
                </button>
                <button onClick={() => setPrintData(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none p-1">×</button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p><span className="font-medium">학생:</span> {printData.summary.student_name} ({printData.summary.grade})</p>
                <p><span className="font-medium">시험:</span> {printData.summary.test_title} | {printData.summary.subject}</p>
                <p><span className="font-medium">점수:</span>
                  <span className={`ml-1 font-bold ${(printData.summary.score_pct ?? 0) >= 80 ? "text-green-600" : (printData.summary.score_pct ?? 0) >= 60 ? "text-yellow-600" : "text-red-500"}`}>
                    {printData.summary.score}/{printData.summary.total} ({printData.summary.score_pct}%)
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                {printData.detail.question_results
                  .sort((a, b) => a.question_no - b.question_no)
                  .map((q) => (
                    <div key={q.question_no}
                      className={`flex flex-col items-center p-2 rounded-lg border ${q.is_correct ? "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800" : "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800"}`}>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{q.question_no}번</span>
                      <span className={`font-bold text-lg ${q.is_correct ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                        {q.is_correct ? "O" : "X"}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
