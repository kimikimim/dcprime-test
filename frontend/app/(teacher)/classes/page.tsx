"use client";
import { useEffect, useState } from "react";
import { apiFetch, Class, Test, ClassRule, AssignmentRow } from "@/lib/api";

const GRADES = ["초1","초2","초3","초4","초5","초6","중1","중2","중3","고1","고2","고3"];
const SUBJECTS = ["수학","영어","국어","과학","사회"];
const inputCls = "border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500";
const selectCls = inputCls;

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [classForm, setClassForm] = useState({ name: "", grade: "중1", subject: "수학" });
  const [ruleTestId, setRuleTestId] = useState("");
  const [rules, setRules] = useState<ClassRule[]>([]);
  const [ruleForm, setRuleForm] = useState({ class_id: "", min_score: "", max_score: "" });
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [overrides, setOverrides] = useState<Record<number, number>>({});
  const [assignTestId, setAssignTestId] = useState("");
  const [confirmDone, setConfirmDone] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
  const [memberCache, setMemberCache] = useState<Record<number, { id: number; name: string; grade: string; school: string }[]>>({});

  const loadClasses = () => apiFetch<Class[]>("/classes").then(setClasses).catch(() => {});
  const loadTests = () => apiFetch<Test[]>("/tests").then(setTests).catch(() => {});

  useEffect(() => { loadClasses(); loadTests(); }, []);

  useEffect(() => {
    if (!ruleTestId) return;
    apiFetch<ClassRule[]>(`/classes/rules/${ruleTestId}`).then(setRules).catch(() => {});
  }, [ruleTestId]);

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch("/classes", { method: "POST", body: JSON.stringify(classForm) });
    setClassForm({ name: "", grade: "중1", subject: "수학" });
    loadClasses();
  };

  const toggleMembers = async (id: number) => {
    if (expandedClassId === id) { setExpandedClassId(null); return; }
    setExpandedClassId(id);
    if (!memberCache[id]) {
      const data = await apiFetch<{ students: { id: number; name: string; grade: string; school: string }[] }>(`/classes/${id}/members`);
      setMemberCache((prev) => ({ ...prev, [id]: data.students }));
    }
  };

  const deleteClass = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await apiFetch(`/classes/${id}`, { method: "DELETE" });
    loadClasses();
  };

  const createRule = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch("/classes/rules", {
      method: "POST",
      body: JSON.stringify({
        test_id: Number(ruleTestId),
        class_id: Number(ruleForm.class_id),
        min_score: Number(ruleForm.min_score),
        max_score: Number(ruleForm.max_score),
      }),
    });
    setRuleForm({ class_id: "", min_score: "", max_score: "" });
    apiFetch<ClassRule[]>(`/classes/rules/${ruleTestId}`).then(setRules).catch(() => {});
  };

  const deleteRule = async (id: number) => {
    await apiFetch(`/classes/rules/${id}`, { method: "DELETE" });
    apiFetch<ClassRule[]>(`/classes/rules/${ruleTestId}`).then(setRules).catch(() => {});
  };

  const loadAssignment = () => {
    if (!assignTestId) return;
    apiFetch<{ assignments: AssignmentRow[] }>(`/analytics/assign/${assignTestId}`)
      .then((d) => { setAssignments(d.assignments); setOverrides({}); setConfirmDone(false); })
      .catch(() => {});
  };

  const confirmAssign = async () => {
    await apiFetch(`/analytics/assign/${assignTestId}/confirm`, {
      method: "POST",
      body: JSON.stringify(overrides),
    });
    setConfirmDone(true);
    loadClasses();
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">반 배정</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 반 등록 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold mb-3 text-gray-800 dark:text-gray-100">반 등록</h2>
          <form onSubmit={createClass} className="flex flex-wrap gap-2 items-end mb-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">반 이름</label>
              <input required value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                className={inputCls + " w-36"} placeholder="중1 수학 A반" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">학년</label>
              <select value={classForm.grade} onChange={(e) => setClassForm({ ...classForm, grade: e.target.value })} className={selectCls}>
                {GRADES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">과목</label>
              <select value={classForm.subject} onChange={(e) => setClassForm({ ...classForm, subject: e.target.value })} className={selectCls}>
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm">추가</button>
          </form>
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
            {classes.map((c) => (
              <div key={c.id}>
                <div className="flex justify-between items-center px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <button onClick={() => toggleMembers(c.id)} className="text-left flex-1">
                    <span className="font-medium text-gray-800 dark:text-gray-100">{c.name}</span>
                    <span className="text-gray-400 dark:text-gray-500 ml-1">({c.grade} · {c.subject})</span>
                    <span className="text-indigo-500 dark:text-indigo-400 ml-2 text-xs">{expandedClassId === c.id ? "▲" : "▼"} 멤버</span>
                  </button>
                  <button onClick={() => deleteClass(c.id)} className="text-red-500 dark:text-red-400 text-xs hover:underline font-medium ml-3">삭제</button>
                </div>
                {expandedClassId === c.id && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 px-4 py-3 border-t border-indigo-100 dark:border-indigo-900/30">
                    {(memberCache[c.id] ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {(memberCache[c.id] ?? []).map((s) => (
                          <span key={s.id} className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full px-2.5 py-1 text-gray-700 dark:text-gray-300">
                            {s.name} <span className="text-gray-400">({s.grade})</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500">멤버가 없습니다</p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {classes.length === 0 && <p className="px-3 py-4 text-center text-gray-400 dark:text-gray-500 text-sm">반이 없습니다</p>}
          </div>
        </div>

        {/* 배정 규칙 설정 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold mb-3 text-gray-800 dark:text-gray-100">배정 규칙 설정</h2>
          <div className="mb-3">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">테스트 선택</label>
            <select value={ruleTestId} onChange={(e) => setRuleTestId(e.target.value)} className={selectCls + " w-full"}>
              <option value="">-- 선택 --</option>
              {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          {ruleTestId && (
            <>
              <form onSubmit={createRule} className="flex flex-wrap gap-2 items-end mb-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">반</label>
                  <select required value={ruleForm.class_id} onChange={(e) => setRuleForm({ ...ruleForm, class_id: e.target.value })} className={selectCls}>
                    <option value="">선택</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">최소점수(%)</label>
                  <input required type="number" min={0} max={100} value={ruleForm.min_score}
                    onChange={(e) => setRuleForm({ ...ruleForm, min_score: e.target.value })}
                    className={inputCls + " w-20"} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">최대점수(%)</label>
                  <input required type="number" min={0} max={100} value={ruleForm.max_score}
                    onChange={(e) => setRuleForm({ ...ruleForm, max_score: e.target.value })}
                    className={inputCls + " w-20"} />
                </div>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm">추가</button>
              </form>
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden text-sm divide-y divide-gray-100 dark:divide-gray-700">
                {rules.map((r) => (
                  <div key={r.id} className="flex justify-between items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="text-gray-700 dark:text-gray-300">{r.class_name} — {r.min_score}% ~ {r.max_score}%</span>
                    <button onClick={() => deleteRule(r.id)} className="text-red-500 dark:text-red-400 text-xs hover:underline font-medium">삭제</button>
                  </div>
                ))}
                {rules.length === 0 && <p className="px-3 py-4 text-center text-gray-400 dark:text-gray-500">규칙이 없습니다</p>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 자동 배정 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
        <h2 className="font-semibold mb-3 text-gray-800 dark:text-gray-100">자동 배정 추천 & 확정</h2>
        <div className="flex gap-3 mb-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">테스트 선택</label>
            <select value={assignTestId} onChange={(e) => setAssignTestId(e.target.value)} className={selectCls + " w-72"}>
              <option value="">-- 선택 --</option>
              {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          <button onClick={loadAssignment} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
            자동 배정 조회
          </button>
        </div>

        {assignments.length > 0 && (
          <>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">반 셀렉트를 변경하면 해당 학생만 수동 조정됩니다.</p>
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">학생</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">점수</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">정답률</th>
                    <th className="px-4 py-3 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">추천 반</th>
                    <th className="px-4 py-3 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">최종 반</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {assignments.map((a) => (
                    <tr key={a.student_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{a.student_name}</td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{a.score}/{a.total}</td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{a.score_pct}%</td>
                      <td className="px-4 py-2 text-center">
                        <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full px-2 py-0.5 text-xs font-medium">
                          {a.recommended_class_name}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={overrides[a.student_id] ?? a.recommended_class_id ?? ""}
                          onChange={(e) =>
                            setOverrides({ ...overrides, [a.student_id]: Number(e.target.value) })
                          }
                          className={selectCls + " w-full"}
                        >
                          <option value="">미배정</option>
                          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {confirmDone && <p className="text-green-600 dark:text-green-400 text-sm mb-2">반 배정이 확정되었습니다!</p>}
            <button onClick={confirmAssign}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
              배정 확정
            </button>
          </>
        )}
      </div>
    </div>
  );
}
