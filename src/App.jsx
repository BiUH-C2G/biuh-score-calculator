import { useEffect, useMemo, useState } from 'react';

const NMAX = 100;
const NMIN = 60;

const CREDIT_STANDARD = {
  language: 2.5,
  major: 5,
};

const CHINESE_CULTURE_OPTIONS = [
  { key: 'cc-1', label: 'Chinese Culture I', credit: 3 },
  { key: 'cc-2', label: 'Chinese Culture II', credit: 3 },
  { key: 'cc-3-1', label: 'Chinese Culture III-1', credit: 2 },
  { key: 'cc-3-2', label: 'Chinese Culture III-2', credit: 2 },
  { key: 'cc-3-3', label: 'Chinese Culture III-3', credit: 1 },
  { key: 'cc-4-1', label: 'Chinese Culture IV-1', credit: 2.5 },
  { key: 'cc-4-2', label: 'Chinese Culture IV-2', credit: 2.5 },
];

const CULTURE_MAP = CHINESE_CULTURE_OPTIONS.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {});

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createSemester = () => ({
  id: createId(),
  languageScores: { english: '', german: '' },
  majorCourses: [{ id: createId(), name: '', score: '' }],
  cultureCourse: { courseKey: CHINESE_CULTURE_OPTIONS[0].key, score: '' },
});

const parseNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
};

const isValidScore = (score) => score !== null && score >= 0 && score <= 100;
const isValidCredit = (credit) => credit !== null && credit > 0;

const germanGrade = (score) => {
  if (!isValidScore(score)) return null;
  if (score < NMIN) return 5;
  const value = 1 + 3 * ((NMAX - score) / (NMAX - NMIN));
  return Math.min(4, Math.max(1, value));
};

const evaluation = (score) => {
  if (!isValidScore(score)) return null;
  if (score >= 93) return { label: 'Very Good / 优秀', grade: 1 };
  if (score >= 80) return { label: 'Good / 良好', grade: 2 };
  if (score >= 67) return { label: 'Satisfactory / 尚可', grade: 3 };
  if (score >= 60) return { label: 'Sufficient / 及格', grade: 4 };
  return { label: 'Insufficient / 不及格', grade: 5 };
};

const formatNumber = (value, digits = 2) => {
  if (value === null || value === undefined) return '—';
  return Number(value).toFixed(digits);
};

const gpaFromPercentage = (score, scale) => {
  if (score === null || score === undefined || !Number.isFinite(score)) return null;
  const clamped = Math.min(NMAX, Math.max(0, score));
  return (clamped / NMAX) * scale;
};

const calculateTotals = (courses) => {
  const validCourses = courses.filter(
    (course) => isValidScore(course.score) && isValidCredit(course.credit)
  );
  const totalCredits = validCourses.reduce((sum, course) => sum + course.credit, 0);
  const weightedScore = validCourses.reduce(
    (sum, course) => sum + course.score * course.credit,
    0
  );
  const weightedGerman = validCourses.reduce(
    (sum, course) => sum + germanGrade(course.score) * course.credit,
    0
  );

  return {
    totalCredits,
    weightedScore: totalCredits ? weightedScore / totalCredits : null,
    weightedGerman: totalCredits ? weightedGerman / totalCredits : null,
    count: validCourses.length,
  };
};

export default function App() {
  const initialSemester = useMemo(() => createSemester(), []);
  const [semesters, setSemesters] = useState([initialSemester]);
  const [activeSemesterId, setActiveSemesterId] = useState(initialSemester.id);
  const [recentlyAddedCourse, setRecentlyAddedCourse] = useState(null);

  useEffect(() => {
    if (!recentlyAddedCourse) return;
    const timeout = setTimeout(() => {
      setRecentlyAddedCourse(null);
    }, 450);
    return () => clearTimeout(timeout);
  }, [recentlyAddedCourse]);

  const semesterViews = useMemo(
    () =>
      semesters.map((semester) => {
        const languageCourses = [
          {
            id: 'english',
            name: 'English / 英语',
            credit: CREDIT_STANDARD.language,
            score: parseNumber(semester.languageScores.english),
          },
          {
            id: 'german',
            name: 'German / 德语',
            credit: CREDIT_STANDARD.language,
            score: parseNumber(semester.languageScores.german),
          },
        ];

        const majorCourseRows = semester.majorCourses.map((course) => ({
          ...course,
          scoreValue: parseNumber(course.score),
        }));

        const cultureOption =
          CULTURE_MAP[semester.cultureCourse.courseKey] || CHINESE_CULTURE_OPTIONS[0];
        const cultureCourse = {
          courseKey: semester.cultureCourse.courseKey,
          score: semester.cultureCourse.score,
          name: cultureOption.label,
          credit: cultureOption.credit,
          scoreValue: parseNumber(semester.cultureCourse.score),
        };

        const allCourses = [
          ...languageCourses,
          ...majorCourseRows.map((course) => ({
            name: course.name,
            credit: CREDIT_STANDARD.major,
            score: course.scoreValue,
          })),
          {
            name: cultureCourse.name,
            credit: cultureCourse.credit,
            score: cultureCourse.scoreValue,
          },
        ];

        return {
          id: semester.id,
          languageCourses,
          majorCourseRows,
          cultureCourse,
          totals: calculateTotals(allCourses),
          allCourses,
        };
      }),
    [semesters]
  );

  const activeIndex = Math.max(
    0,
    semesters.findIndex((semester) => semester.id === activeSemesterId)
  );
  const activeSemester = semesters[activeIndex];
  const activeView = semesterViews[activeIndex];
  const activeLabel = `第${activeIndex + 1}学期`;

  const overallTotals = useMemo(() => {
    const allCourses = semesterViews.flatMap((view) => view.allCourses);
    return calculateTotals(allCourses);
  }, [semesterViews]);
  const overallGpa4 = gpaFromPercentage(overallTotals.weightedScore, 4);
  const overallGpa5 = gpaFromPercentage(overallTotals.weightedScore, 5);

  const updateSemester = (id, updater) => {
    setSemesters((prev) =>
      prev.map((semester) => (semester.id === id ? updater(semester) : semester))
    );
  };

  const addSemester = () => {
    const newSemester = createSemester();
    setSemesters((prev) => [...prev, newSemester]);
    setActiveSemesterId(newSemester.id);
  };

  const updateLanguageScore = (semesterId, field, value) => {
    updateSemester(semesterId, (semester) => ({
      ...semester,
      languageScores: {
        ...semester.languageScores,
        [field]: value,
      },
    }));
  };

  const updateMajorCourse = (semesterId, courseId, patch) => {
    updateSemester(semesterId, (semester) => ({
      ...semester,
      majorCourses: semester.majorCourses.map((course) =>
        course.id === courseId ? { ...course, ...patch } : course
      ),
    }));
  };

  const addMajorCourse = (semesterId) => {
    const newCourseId = createId();
    updateSemester(semesterId, (semester) => ({
      ...semester,
      majorCourses: [...semester.majorCourses, { id: newCourseId, name: '', score: '' }],
    }));
    setRecentlyAddedCourse({ semesterId, courseId: newCourseId });
  };

  const removeMajorCourse = (semesterId, courseId) => {
    updateSemester(semesterId, (semester) => ({
      ...semester,
      majorCourses: semester.majorCourses.filter((course) => course.id !== courseId),
    }));
  };

  const updateCultureCourse = (semesterId, patch) => {
    updateSemester(semesterId, (semester) => ({
      ...semester,
      cultureCourse: {
        ...semester.cultureCourse,
        ...patch,
      },
    }));
  };

  if (!activeSemester || !activeView) {
    return <div className="page">请先添加学期。</div>;
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__text">
          <p className="eyebrow">BIUH</p>
          <h1>BiUH GPA 计算器</h1>
          <p className="subtitle">
            根据 2026 年 1 月 30 号教务给笔者的 credit standard 编写。本网站为静态网站，开源在 GitHub 不会收集你的数据。
          </p>
        </div>
        <div className="hero__stats">
          <div className="stat">
            <span className="stat__label">已录入课程</span>
            <span className="stat__value">{overallTotals.count}</span>
          </div>
          <div className="stat">
            <span className="stat__label">总学分</span>
            <span className="stat__value">{formatNumber(overallTotals.totalCredits, 1)}</span>
          </div>
          <div className="stat">
            <span className="stat__label">总平均德国成绩</span>
            <span className="stat__value">{formatNumber(overallTotals.weightedGerman, 2)}</span>
          </div>
        </div>
      </header>

      <main className="content">
        <section className="panel" style={{ '--delay': 1 }}>
          <div className="panel__header">
            <h2>学期</h2>
            <p>点击切换学期，分别填写成绩</p>
          </div>
          <div className="tabs">
            {semesters.map((semester, index) => (
              <button
                type="button"
                key={semester.id}
                className={`tab ${semester.id === activeSemesterId ? 'tab--active' : ''}`}
                onClick={() => setActiveSemesterId(semester.id)}
              >
                第{index + 1}学期
              </button>
            ))}
            <button type="button" className="tab tab--add" onClick={addSemester}>
              + 添加学期
            </button>
          </div>
          <div className="summary summary--swap" key={activeSemesterId}>
            <div className="summary__card">
              <span className="summary__label">{activeLabel} 平均百分制</span>
              <span className="summary__value">
                {formatNumber(activeView.totals.weightedScore, 2)}
              </span>
            </div>
            <div className="summary__card">
              <span className="summary__label">{activeLabel} 平均德国成绩</span>
              <span className="summary__value">
                {formatNumber(activeView.totals.weightedGerman, 2)}
              </span>
            </div>
            <div className="summary__card">
              <span className="summary__label">{activeLabel} 学分</span>
              <span className="summary__value">{formatNumber(activeView.totals.totalCredits, 1)}</span>
            </div>
          </div>
        </section>

        <section className="panel" style={{ '--delay': 2 }} key={`${activeSemesterId}-language`}>
          <div className="panel__header">
            <h2>语言课</h2>
            <p>{activeLabel} · English & German，单科 2.5 学分</p>
          </div>
          <div className="table table--five">
            <div className="table__row table__row--head">
              <span>课程</span>
              <span>学分</span>
              <span>百分制成绩</span>
              <span>德国成绩</span>
              <span>评价</span>
            </div>
            {activeView.languageCourses.map((course) => {
              const scoreInvalid = course.score !== null && !isValidScore(course.score);
              const german = germanGrade(course.score);
              const evalInfo = evaluation(course.score);

              return (
                <div className="table__row" key={course.id}>
                  <span data-label="课程">{course.name}</span>
                  <span data-label="学分">{course.credit}</span>
                  <span data-label="百分制成绩">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={activeSemester.languageScores[course.id]}
                      onChange={(event) =>
                        updateLanguageScore(activeSemester.id, course.id, event.target.value)
                      }
                      className={scoreInvalid ? 'input input--invalid' : 'input'}
                      placeholder="0-100"
                    />
                  </span>
                  <span data-label="德国成绩">{formatNumber(german, 2)}</span>
                  <span data-label="评价">{evalInfo ? evalInfo.label : '—'}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel" style={{ '--delay': 3 }} key={`${activeSemesterId}-major`}>
          <div className="panel__header">
            <h2>专业课</h2>
            <p>{activeLabel} · 课程较多，可自行添加；专业课固定 5 学分</p>
          </div>
          <div className="table">
            <div className="table__row table__row--head">
              <span>课程名称</span>
              <span>学分</span>
              <span>百分制成绩</span>
              <span>德国成绩</span>
              <span>评价</span>
              <span></span>
            </div>
            {activeView.majorCourseRows.map((course) => {
              const scoreInvalid = course.scoreValue !== null && !isValidScore(course.scoreValue);
              const german = germanGrade(course.scoreValue);
              const evalInfo = evaluation(course.scoreValue);
              const isNewCourse =
                recentlyAddedCourse &&
                recentlyAddedCourse.semesterId === activeSemester.id &&
                recentlyAddedCourse.courseId === course.id;

              return (
                <div
                  className={`table__row ${isNewCourse ? 'table__row--enter' : ''}`}
                  key={course.id}
                >
                  <span data-label="课程名称">
                    <input
                      className="input"
                      value={course.name}
                      onChange={(event) =>
                        updateMajorCourse(activeSemester.id, course.id, { name: event.target.value })
                      }
                      placeholder="请输入课程名称"
                    />
                  </span>
                  <span data-label="学分">{CREDIT_STANDARD.major}</span>
                  <span data-label="百分制成绩">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={course.score}
                      onChange={(event) =>
                        updateMajorCourse(activeSemester.id, course.id, { score: event.target.value })
                      }
                      className={scoreInvalid ? 'input input--invalid' : 'input'}
                      placeholder="0-100"
                    />
                  </span>
                  <span data-label="德国成绩">{formatNumber(german, 2)}</span>
                  <span data-label="评价">{evalInfo ? evalInfo.label : '—'}</span>
                  <span data-label="操作">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => removeMajorCourse(activeSemester.id, course.id)}
                      disabled={activeView.majorCourseRows.length === 1}
                    >
                      删除
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="panel__actions">
            <button type="button" className="btn" onClick={() => addMajorCourse(activeSemester.id)}>
              + 添加专业课
            </button>
          </div>
        </section>

        <section className="panel" style={{ '--delay': 4 }} key={`${activeSemesterId}-culture`}>
          <div className="panel__header">
            <h2>中国文化课</h2>
            <p>{activeLabel} · 每学期只选一门课程，学分按课程自动填写</p>
          </div>
          <div className="table table--five">
            <div className="table__row table__row--head">
              <span>课程选择</span>
              <span>学分</span>
              <span>百分制成绩</span>
              <span>德国成绩</span>
              <span>评价</span>
            </div>
            {(() => {
              const scoreInvalid =
                activeView.cultureCourse.scoreValue !== null &&
                !isValidScore(activeView.cultureCourse.scoreValue);
              const german = germanGrade(activeView.cultureCourse.scoreValue);
              const evalInfo = evaluation(activeView.cultureCourse.scoreValue);

              return (
                <div className="table__row" key={activeSemester.id}>
                  <span data-label="课程选择">
                    <select
                      className="input"
                      value={activeView.cultureCourse.courseKey}
                      onChange={(event) =>
                        updateCultureCourse(activeSemester.id, { courseKey: event.target.value })
                      }
                    >
                      {CHINESE_CULTURE_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </span>
                  <span data-label="学分">{activeView.cultureCourse.credit}</span>
                  <span data-label="百分制成绩">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={activeView.cultureCourse.score}
                      onChange={(event) =>
                        updateCultureCourse(activeSemester.id, { score: event.target.value })
                      }
                      className={scoreInvalid ? 'input input--invalid' : 'input'}
                      placeholder="0-100"
                    />
                  </span>
                  <span data-label="德国成绩">{formatNumber(german, 2)}</span>
                  <span data-label="评价">{evalInfo ? evalInfo.label : '—'}</span>
                </div>
              );
            })()}
          </div>
        </section>

        <section className="panel" style={{ '--delay': 5 }} key={`${activeSemesterId}-gpa`}>
          <div className="panel__header">
            <h2>{activeLabel} GPA</h2>
            <p>按本学期已录入课程的学分加权计算</p>
          </div>
          <div className="summary">
            <div className="summary__card">
              <span className="summary__label">加权平均百分制</span>
              <span className="summary__value">{formatNumber(activeView.totals.weightedScore, 2)}</span>
            </div>
            <div className="summary__card">
              <span className="summary__label">加权平均德国成绩</span>
              <span className="summary__value">
                {formatNumber(activeView.totals.weightedGerman, 2)}
              </span>
            </div>
            <div className="summary__card">
              <span className="summary__label">学分</span>
              <span className="summary__value">{formatNumber(activeView.totals.totalCredits, 1)}</span>
            </div>
          </div>
        </section>

        <section className="panel panel--accent" style={{ '--delay': 6 }}>
          <div className="panel__header">
            <h2>总 GPA（本科全程）</h2>
            <p>按所有学期已录入课程的学分加权计算</p>
          </div>
          <div className="summary">
            <div className="summary__card">
              <span className="summary__label">加权平均百分制</span>
              <span className="summary__value">{formatNumber(overallTotals.weightedScore, 2)}</span>
            </div>
            <div className="summary__card">
              <span className="summary__label">加权平均德国成绩</span>
              <span className="summary__value">{formatNumber(overallTotals.weightedGerman, 2)}</span>
            </div>
            <div className="summary__card">
              <span className="summary__label">总 GPA（4 分制：美国/加拿大等）</span>
              <span className="summary__value">{formatNumber(overallGpa4, 2)}</span>
            </div>
            <div className="summary__card">
              <span className="summary__label">总 GPA（5 分制：中国/俄罗斯等）</span>
              <span className="summary__value">{formatNumber(overallGpa5, 2)}</span>
            </div>
            <div className="summary__card">
              <span className="summary__label">总学分</span>
              <span className="summary__value">{formatNumber(overallTotals.totalCredits, 1)}</span>
            </div>
          </div>
          <p className="summary__note">
            德国成绩换算采用修改后的巴伐利亚公式；未填写或无效成绩不会计入平均值。（备注：4 分制常见于美国/加拿大；5 分制常见于中国/俄罗斯等；4/5 分制按百分制线性换算）
          </p>
        </section>

        <section className="panel" style={{ '--delay': 7 }}>
          <div className="panel__header">
            <h2>德国成绩换算说明</h2>
            <p>单科成绩对应关系与公式</p>
          </div>
          <div className="formula">
            <div>
              <h3>公式</h3>
              <p>
                X = 1 + 3 × ((Nmax − Nd) / (Nmax − Nmin))
              </p>
              <p>
                X = 目标成绩，Nmax = 100，Nmin = 60，Nd = 实际成绩
              </p>
            </div>
            <div>
              <h3>等级参考</h3>
              <table className="scale">
                <thead>
                  <tr>
                    <th>百分制成绩</th>
                    <th>德国成绩</th>
                    <th>评价</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>93 - 100</td>
                    <td>1</td>
                    <td>Very Good / 优秀</td>
                  </tr>
                  <tr>
                    <td>80 - 92</td>
                    <td>2</td>
                    <td>Good / 良好</td>
                  </tr>
                  <tr>
                    <td>67 - 79</td>
                    <td>3</td>
                    <td>Satisfactory / 尚可</td>
                  </tr>
                  <tr>
                    <td>60 - 66</td>
                    <td>4</td>
                    <td>Sufficient / 及格</td>
                  </tr>
                  <tr>
                    <td>&lt; 60</td>
                    <td>5</td>
                    <td>Insufficient / 不及格</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="panel" style={{ '--delay': 8 }}>
          <div className="panel__header">
            <h2>Chinese Culture 对应表</h2>
            <p>Chinese Culture 课程编号与实际授课名称对照</p>
          </div>
          <table className="scale culture-map">
            <thead>
              <tr>
                <th>Chinese Culture 模块</th>
                <th>课程选项</th>
                <th>English Name</th>
                <th>中文名称</th>
              </tr>
            </thead>
            <tbody>
              <tr className="culture-map__row culture-map__row--i">
                <td>Chinese Culture I</td>
                <td>Chinese Culture I</td>
                <td>Entrepreneurship and Social Responsibilities</td>
                <td>中外企业精神与社会责任</td>
              </tr>
              <tr className="culture-map__row culture-map__row--ii">
                <td>Chinese Culture II</td>
                <td>Chinese Culture II</td>
                <td>Cross-Cultural Studies</td>
                <td>跨文化交流</td>
              </tr>
              <tr className="culture-map__row culture-map__row--iii">
                <td rowSpan={4}>Chinese Culture III</td>
                <td>Chinese Culture III</td>
                <td>Chinese Cultural Spirits</td>
                <td>中华人文精神与制度</td>
              </tr>
              <tr className="culture-map__row culture-map__row--sub">
                <td>Chinese Culture III-1</td>
                <td></td>
                <td>思想道德与法治</td>
              </tr>
              <tr className="culture-map__row culture-map__row--sub">
                <td>Chinese Culture III-2</td>
                <td></td>
                <td>马克思主义基本原理</td>
              </tr>
              <tr className="culture-map__row culture-map__row--sub">
                <td>Chinese Culture III-3</td>
                <td></td>
                <td>毛泽东思想及中国特色社会主义思想概论</td>
              </tr>
              <tr className="culture-map__row culture-map__row--iv">
                <td rowSpan={3}>Chinese Culture IV</td>
                <td>Chinese Culture IV</td>
                <td>Chinese Modern Society</td>
                <td>中国近现代变迁</td>
              </tr>
              <tr className="culture-map__row culture-map__row--sub">
                <td>Chinese Culture IV-1</td>
                <td></td>
                <td>中国近现代史纲要</td>
              </tr>
              <tr className="culture-map__row culture-map__row--sub">
                <td>Chinese Culture IV-2</td>
                <td></td>
                <td>习近平新时代中国特色社会主义思想概论</td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
