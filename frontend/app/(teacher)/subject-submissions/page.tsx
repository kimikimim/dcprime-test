"use client";
import { useEffect, useState } from "react";
import { apiFetch, apiHeaders } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const inputCls = "border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500";

interface MathTest {
  id: number;
  title: string;
  grade: string;
  num_questions: number;
  has_answers: boolean;
}

interface MathSubmission {
  id: number;
  student_name: string;
  math_test_id: number;
  test_title: string;
  score: number;
  total: number;
  subjective_score: number | null;
  subjective_max: number | null;
  status: "pending" | "graded" | "error";
  submitted_at: string;
}

interface AnswerDetail {
  question_no: number;
  student_answer: number | null;
  correct_answer: number;
  is_correct: boolean;
}

interface MathSubmissionDetail extends MathSubmission {
  items: AnswerDetail[];
}

export default function MathSubmissionsPage() {
  const [tests, setTests] = useState<MathTest[]>([]);
  const [submissions, setSubmissions] = useState<MathSubmission[]>([]);
  const [form, setForm] = useState({ student_name: "", test_id: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<MathSubmissionDetail | null>(null);
  const [filterTest, setFilterTest] = useState("");
  const [subjectiveEdits, setSubjectiveEdits] = useState<Record<number, string>>({});
  // 답안 수정 상태: { [question_no]: student_answer }
  const [answerEdits, setAnswerEdits] = useState<Record<number, number | null>>({});
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [answerSaveMsg, setAnswerSaveMsg] = useState<string | null>(null);

  const load = () => {
    apiFetch<MathTest[]>("/math-tests").then(setTests).catch(() => {});
    const q = filterTest ? `?test_id=${filterTest}` : "";
    apiFetch<MathSubmission[]>(`/math-submissions${q}`).then(setSubmissions).catch(() => {});
  };

  useEffect(() => { load(); }, [filterTest]); // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("student_name", form.student_name);
      formData.append("test_id", form.test_id);
      const res = await fetch(`${BASE}/api/math-submissions`, { method: "POST", body: formData, headers: apiHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "업로드 실패");
      setUploadMsg({ type: "success", msg: `✓ ${form.student_name} 제출 완료. AI 채점 중...` });
      setForm({ student_name: "", test_id: form.test_id });
      setFile(null);
      load();
    } catch (e: unknown) {
      setUploadMsg({ type: "error", msg: e instanceof Error ? e.message : "오류 발생" });
    } finally {
      setUploading(false);
    }
  };

  const toggleExpand = async (s: MathSubmission) => {
    if (expandedId === s.id) {
      setExpandedId(null);
      setDetail(null);
      setAnswerEdits({});
      setAnswerSaveMsg(null);
      return;
    }
    setExpandedId(s.id);
    setAnswerEdits({});
    setAnswerSaveMsg(null);
    try {
      const d = await apiFetch<MathSubmissionDetail>(`/math-submissions/${s.id}`);
      setDetail(d);
      // 초기값으로 현재 student_answer 세팅
      const init: Record<number, number | null> = {};
      d.items.forEach((a) => { init[a.question_no] = a.student_answer; });
      setAnswerEdits(init);
    } catch { setDetail(null); }
  };

  const deleteSubmission = async (id: number) => {
    if (!confirm("제출 기록을 삭제하시겠습니까?")) return;
    try {
      await apiFetch(`/math-submissions/${id}`, { method: "DELETE" });
    } catch (e: unknown) {
      if (!(e instanceof Error && e.message === "Not found")) {
        alert(e instanceof Error ? e.message : "삭제 실패");
      }
    }
    if (expandedId === id) { setExpandedId(null); setDetail(null); setAnswerEdits({}); }
    load();
  };

  const saveSubjective = async (id: number, val: string) => {
    const score = val.trim() === "" ? null : parseFloat(val);
    try {
      await apiFetch(`/math-submissions/${id}/subjective`, {
        method: "PATCH",
        body: JSON.stringify({ subjective_score: isNaN(score as number) ? null : score }),
      });
      load();
    } catch { /* silent */ }
  };

  const saveAnswers = async () => {
    if (!detail) return;
    setSavingAnswers(true);
    setAnswerSaveMsg(null);
    try {
      // { "1": 3, "2": null, ... }
      const payload: Record<string, number | null> = {};
      Object.entries(answerEdits).forEach(([q, v]) => { payload[q] = v; });
      const updated = await apiFetch<MathSubmission>(`/math-submissions/${detail.id}/answers`, {
        method: "PATCH",
        body: JSON.stringify({ answers: payload }),
      });
      // detail 갱신
      const newDetail = await apiFetch<MathSubmissionDetail>(`/math-submissions/${detail.id}`);
      setDetail(newDetail);
      const init: Record<number, number | null> = {};
      newDetail.items.forEach((a) => { init[a.question_no] = a.student_answer; });
      setAnswerEdits(init);
      setAnswerSaveMsg(`✓ 저장 완료 — ${updated.score}/${updated.total}점으로 재계산됨`);
      load();
    } catch (e: unknown) {
      setAnswerSaveMsg("⚠ 저장 실패: " + (e instanceof Error ? e.message : "오류"));
    } finally {
      setSavingAnswers(false);
    }
  };

  const statusBadge = (status: MathSubmission["status"]) => {
    if (status === "graded") return <span className="text-xs bg-green-50 dark:bg-green-900/40 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">채점완료</span>;
    if (status === "pending") return <span className="text-xs bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">채점중</span>;
    return <span className="text-xs bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">오류</span>;
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">과목별 OMR 채점</h1>

      {/* 업로드 폼 */}
      <form onSubmit={upload} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6 shadow-sm">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">OMR 답안지 업로드</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">학생 이름 *</label>
            <input required value={form.student_name} onChange={(e) => setForm({ ...form, student_name: e.target.value })}
              className={inputCls + " w-36"} placeholder="홍길동" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">시험 *</label>
            <select required value={form.test_id} onChange={(e) => setForm({ ...form, test_id: e.target.value })} className={inputCls + " w-52"}>
              <option value="">시험 선택...</option>
              {tests.filter((t) => t.has_answers).map((t) => (
                <option key={t.id} value={t.id}>{t.title} ({t.grade})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">OMR 이미지 *</label>
            <input required type="file" accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-indigo-50 dark:file:bg-indigo-900/40 file:text-indigo-600 dark:file:text-indigo-400 hover:file:bg-indigo-100" />
          </div>
          <button disabled={uploading || !file}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
            {uploading ? "업로드 중..." : "업로드"}
          </button>
        </div>
        {uploadMsg && (
          <p className={`text-xs mt-3 px-3 py-2 rounded-lg ${uploadMsg.type === "success" ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"}`}>
            {uploadMsg.msg}
          </p>
        )}
      </form>

      {/* 필터 */}
      <div className="flex gap-3 mb-4 items-center">
        <span className="text-sm text-gray-500 dark:text-gray-400">시험 필터:</span>
        <select value={filterTest} onChange={(e) => setFilterTest(e.target.value)} className={inputCls}>
          <option value="">전체</option>
          {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>

      {/* 제출 목록 */}
      <div className="space-y-2">
        {submissions.length === 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center text-gray-400 dark:text-gray-500 shadow-sm">
            제출된 답안이 없습니다
          </div>
        )}
        {submissions.map((s) => (
          <div key={s.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-4 px-5 py-3">
              <button onClick={() => toggleExpand(s)} className="flex-1 text-left flex items-center gap-3 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.student_name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{s.test_title}</span>
                {statusBadge(s.status)}
                {s.status === "graded" && (
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {s.subjective_max != null
                      ? `${s.score}pt + 서술형 ${s.subjective_score ?? "?"}pt`
                      : `${s.score}/${s.total}`}
                  </span>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{s.submitted_at}</span>
                <span className="text-xs text-indigo-400 dark:text-indigo-500">{expandedId === s.id ? "▲" : "▼"}</span>
              </button>
              {s.status === "graded" && s.subjective_max != null && (
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-pink-500 dark:text-pink-400 whitespace-nowrap">서술형 /{s.subjective_max}pt</span>
                  <input
                    type="number"
                    min={0}
                    max={s.subjective_max}
                    step={0.5}
                    value={subjectiveEdits[s.id] ?? (s.subjective_score != null ? String(s.subjective_score) : "")}
                    onChange={(e) => setSubjectiveEdits({ ...subjectiveEdits, [s.id]: e.target.value })}
                    onBlur={(e) => saveSubjective(s.id, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); } }}
                    placeholder="점수"
                    className="border border-pink-200 dark:border-pink-700 rounded px-2 py-0.5 text-xs w-16 text-center bg-pink-50 dark:bg-pink-900/20 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-pink-400"
                  />
                </div>
              )}
              <button onClick={() => deleteSubmission(s.id)} className="text-xs text-red-500 dark:text-red-400 hover:underline font-medium">삭제</button>
            </div>

            {expandedId === s.id && detail && detail.id === s.id && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-4 space-y-4">
                {/* 답안 수정 그리드 */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    답안 확인 / 수정 <span className="font-normal text-gray-400">(틀린 문항은 빨간색)</span>
                  </span>
                  <div className="flex items-center gap-3">
                    {answerSaveMsg && (
                      <span className={`text-xs ${answerSaveMsg.startsWith("✓") ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                        {answerSaveMsg}
                      </span>
                    )}
                    <button
                      onClick={saveAnswers}
                      disabled={savingAnswers}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      {savingAnswers ? "저장 중..." : "수정 저장 + 재채점"}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {detail.items.map((a) => {
                    const editVal = answerEdits[a.question_no];
                    const isCorrect = editVal != null && editVal > 0 && editVal === a.correct_answer;
                    return (
                      <div key={a.question_no} className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${isCorrect ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800"}`}>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{a.question_no}번</span>
                        <select
                          value={editVal ?? 0}
                          onChange={(e) => setAnswerEdits({ ...answerEdits, [a.question_no]: Number(e.target.value) || null })}
                          className={`text-sm font-bold w-full text-center rounded px-1 py-0.5 border-0 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${isCorrect ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"}`}
                        >
                          <option value={0}>-</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                        <span className="text-xs text-gray-400 dark:text-gray-500">정답:{a.correct_answer}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
