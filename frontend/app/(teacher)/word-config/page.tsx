"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface WordTest {
  id: number;
  title: string;
  grade: string;
  direction: string;
}

interface TeacherConfig {
  teacher_name: string;
  word_test_id: number | null;
  word_test_title: string | null;
  day_start: number | null;
  day_end: number | null;
}

interface ClassConfig {
  id: number;
  name: string;
  grade: string;
  word_test_id: number | null;
  word_test_title: string | null;
  word_day_start: number | null;
  word_day_end: number | null;
}

interface TeacherRow extends TeacherConfig {
  dirty: boolean;
  saving: boolean;
}

interface ClassRow extends ClassConfig {
  dirty: boolean;
  saving: boolean;
}

export default function WordConfigPage() {
  const [wordTests, setWordTests] = useState<WordTest[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<WordTest[]>("/word-tests"),
      apiFetch<TeacherConfig[]>("/word-config/teachers"),
      apiFetch<ClassConfig[]>("/word-config/classes"),
    ])
      .then(([wt, tc, cc]) => {
        setWordTests(wt);
        setTeachers(tc.map((t) => ({ ...t, dirty: false, saving: false })));
        setClasses(cc.map((c) => ({ ...c, dirty: false, saving: false })));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const updateTeacher = (name: string, patch: Partial<TeacherRow>) => {
    setTeachers((prev) =>
      prev.map((t) => (t.teacher_name === name ? { ...t, ...patch, dirty: true } : t))
    );
  };

  const saveTeacher = async (t: TeacherRow) => {
    setTeachers((prev) =>
      prev.map((r) => (r.teacher_name === t.teacher_name ? { ...r, saving: true } : r))
    );
    try {
      await apiFetch(`/word-config/teachers/${encodeURIComponent(t.teacher_name)}`, {
        method: "PUT",
        body: JSON.stringify({
          word_test_id: t.word_test_id || null,
          day_start: t.day_start ? Number(t.day_start) : null,
          day_end: t.day_end ? Number(t.day_end) : null,
        }),
      });
      setTeachers((prev) =>
        prev.map((r) =>
          r.teacher_name === t.teacher_name ? { ...r, dirty: false, saving: false } : r
        )
      );
    } catch (e: unknown) {
      alert((e as Error).message);
      setTeachers((prev) =>
        prev.map((r) => (r.teacher_name === t.teacher_name ? { ...r, saving: false } : r))
      );
    }
  };

  const updateClass = (id: number, patch: Partial<ClassRow>) => {
    setClasses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch, dirty: true } : c))
    );
  };

  const saveClass = async (c: ClassRow) => {
    setClasses((prev) =>
      prev.map((r) => (r.id === c.id ? { ...r, saving: true } : r))
    );
    try {
      await apiFetch(`/word-config/classes/${c.id}`, {
        method: "PUT",
        body: JSON.stringify({
          word_test_id: c.word_test_id || null,
          word_day_start: c.word_day_start ? Number(c.word_day_start) : null,
          word_day_end: c.word_day_end ? Number(c.word_day_end) : null,
        }),
      });
      setClasses((prev) =>
        prev.map((r) => (r.id === c.id ? { ...r, dirty: false, saving: false } : r))
      );
    } catch (e: unknown) {
      alert((e as Error).message);
      setClasses((prev) =>
        prev.map((r) => (r.id === c.id ? { ...r, saving: false } : r))
      );
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-500">불러오는 중...</div>
      </div>
    );
  if (error)
    return (
      <div className="p-6 text-red-600 bg-red-50 rounded-lg">오류: {error}</div>
    );

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold text-gray-800">채점 설정</h1>

      {/* 선생님별 설정 */}
      <section>
        <h2 className="text-lg font-semibold text-indigo-700 mb-3 pb-1 border-b border-indigo-200">
          선생님별 기본 설정
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          선생님마다 기본 단어장과 DAY 범위를 설정합니다. 반별 설정이 있으면 반 설정이 우선 적용됩니다.
        </p>
        {teachers.length === 0 ? (
          <p className="text-gray-400 text-sm">등록된 선생님이 없습니다. 학생에 선생님 정보를 입력하세요.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-indigo-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-indigo-800">선생님</th>
                  <th className="px-4 py-3 text-left font-semibold text-indigo-800">단어장</th>
                  <th className="px-4 py-3 text-left font-semibold text-indigo-800">DAY 시작</th>
                  <th className="px-4 py-3 text-left font-semibold text-indigo-800">DAY 끝</th>
                  <th className="px-4 py-3 text-left font-semibold text-indigo-800">저장</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {teachers.map((t) => (
                  <tr key={t.teacher_name} className={t.dirty ? "bg-yellow-50" : ""}>
                    <td className="px-4 py-3 font-medium text-gray-700">{t.teacher_name}</td>
                    <td className="px-4 py-3">
                      <select
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full max-w-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                        value={t.word_test_id ?? ""}
                        onChange={(e) =>
                          updateTeacher(t.teacher_name, {
                            word_test_id: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      >
                        <option value="">-- 미설정 --</option>
                        {wordTests.map((wt) => (
                          <option key={wt.id} value={wt.id}>
                            {wt.title} ({wt.grade})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-20 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                        value={t.day_start ?? ""}
                        placeholder="예: 1"
                        onChange={(e) =>
                          updateTeacher(t.teacher_name, {
                            day_start: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-20 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                        value={t.day_end ?? ""}
                        placeholder="예: 5"
                        onChange={(e) =>
                          updateTeacher(t.teacher_name, {
                            day_end: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={!t.dirty || t.saving}
                        onClick={() => saveTeacher(t)}
                        className="px-3 py-1 rounded text-sm font-medium transition-colors
                          disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                          enabled:bg-indigo-600 enabled:text-white enabled:hover:bg-indigo-700"
                      >
                        {t.saving ? "저장 중..." : "저장"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 반별 설정 */}
      <section>
        <h2 className="text-lg font-semibold text-indigo-700 mb-3 pb-1 border-b border-indigo-200">
          반별 설정 (오버라이드)
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          반별로 단어장과 DAY 범위를 설정하면 선생님 설정보다 우선 적용됩니다. 비워두면 선생님 설정을 따릅니다.
        </p>
        {classes.length === 0 ? (
          <p className="text-gray-400 text-sm">등록된 반이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-indigo-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-indigo-800">반 이름</th>
                  <th className="px-4 py-3 text-left font-semibold text-indigo-800">학년</th>
                  <th className="px-4 py-3 text-left font-semibold text-indigo-800">단어장</th>
                  <th className="px-4 py-3 text-left font-semibold text-indigo-800">DAY 시작</th>
                  <th className="px-4 py-3 text-left font-semibold text-indigo-800">DAY 끝</th>
                  <th className="px-4 py-3 text-left font-semibold text-indigo-800">저장</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {classes.map((c) => (
                  <tr key={c.id} className={c.dirty ? "bg-yellow-50" : ""}>
                    <td className="px-4 py-3 font-medium text-gray-700">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500">{c.grade}</td>
                    <td className="px-4 py-3">
                      <select
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full max-w-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                        value={c.word_test_id ?? ""}
                        onChange={(e) =>
                          updateClass(c.id, {
                            word_test_id: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      >
                        <option value="">-- 선생님 설정 따름 --</option>
                        {wordTests.map((wt) => (
                          <option key={wt.id} value={wt.id}>
                            {wt.title} ({wt.grade})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-20 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                        value={c.word_day_start ?? ""}
                        placeholder="예: 1"
                        onChange={(e) =>
                          updateClass(c.id, {
                            word_day_start: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-20 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                        value={c.word_day_end ?? ""}
                        placeholder="예: 5"
                        onChange={(e) =>
                          updateClass(c.id, {
                            word_day_end: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={!c.dirty || c.saving}
                        onClick={() => saveClass(c)}
                        className="px-3 py-1 rounded text-sm font-medium transition-colors
                          disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                          enabled:bg-indigo-600 enabled:text-white enabled:hover:bg-indigo-700"
                      >
                        {c.saving ? "저장 중..." : "저장"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
