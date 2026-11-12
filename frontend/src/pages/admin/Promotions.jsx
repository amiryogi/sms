import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUpRight, Repeat, GraduationCap, RotateCcw, Users, CheckCircle2, ArrowRight, X } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatCard from '../../components/common/StatCard';
import { Select, Button } from '../../components/common/FormElements';
import { PageHeader, Card, CardHeader, Badge, Tabs, IconButton, EmptyState, LoadingBlock, DialogActions, Alert, toast, confirmDialog } from '../../components/ui';
import { cn } from '../../lib/cn';
import { promotionService } from '../../api/promotionService';
import { academicService } from '../../api/academicService';
import { formatDate, fullName } from '../../utils/format';

const DECISIONS = [
  { value: 'promoted', label: 'Promote', icon: ArrowUpRight, active: 'bg-emerald-600 text-white', tone: 'success' },
  { value: 'detained', label: 'Detain', icon: Repeat, active: 'bg-amber-500 text-white', tone: 'warning' },
  { value: 'graduated', label: 'Graduate', icon: GraduationCap, active: 'bg-sky-600 text-white', tone: 'info' },
];
const toneOf = (status) => DECISIONS.find((d) => d.value === status)?.tone || 'neutral';
const labelOf = (status) => DECISIONS.find((d) => d.value === status)?.label || status;

const Promotions = () => {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const [eligibleData, setEligibleData] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [targetClass, setTargetClass] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [targetYear, setTargetYear] = useState('');
  const [targetSections, setTargetSections] = useState([]);

  const [view, setView] = useState('promote');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const [stats, setStats] = useState(null);
  const [confirmModal, setConfirmModal] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [classesRes, yearsRes] = await Promise.all([academicService.getClasses(), academicService.getAcademicYears()]);
      setClasses(classesRes.data || []);
      setAcademicYears(yearsRes.data || []);
      const currentYear = (yearsRes.data || []).find((y) => y.isCurrent);
      if (currentYear) setSelectedYear((prev) => prev || currentYear.id.toString());
      const statsRes = await promotionService.getStats();
      setStats(statsRes.data);
    } catch {
      // Stats are optional; the rest of the page still works.
    }
  };

  const handleClassChange = async (classId) => {
    setSelectedClass(classId);
    setSelectedSection('');
    setSections([]);
    setEligibleData(null);
    setSelectedStudents(new Map());
    if (!classId) return;
    try {
      const response = await academicService.getSections(classId);
      setSections(response.data || []);
    } catch {
      setSections([]);
    }
  };

  const handleTargetClassChange = async (classId) => {
    setTargetClass(classId);
    setTargetSection('');
    setTargetSections([]);
    if (!classId) return;
    try {
      const response = await academicService.getSections(classId);
      setTargetSections(response.data || []);
    } catch {
      setTargetSections([]);
    }
  };

  const fetchEligibleStudents = async () => {
    if (!selectedClass || !selectedYear) {
      toast.info('Choose a class and academic year first.');
      return;
    }
    setLoading(true);
    try {
      const response = await promotionService.getEligibleStudents(
        parseInt(selectedClass),
        parseInt(selectedYear),
        selectedSection ? parseInt(selectedSection) : null,
      );
      const data = response.data;
      setEligibleData(data);
      setSelectedStudents(new Map());

      // Targets suggested by the backend (next grade, next academic year).
      const next = (data.nextClasses || []).find((c) => c.id === data.suggestedNextClassId);
      if (next) {
        setTargetClass(next.id.toString());
        setTargetSections(next.sections || []);
        setTargetSection(next.sections?.[0]?.id?.toString() || '');
      }
      if (data.suggestedAcademicYearId) setTargetYear(data.suggestedAcademicYearId.toString());
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load students');
    } finally {
      setLoading(false);
    }
  };

  const decide = (studentId, status) => {
    setSelectedStudents((prev) => {
      const next = new Map(prev);
      if (status === null || prev.get(studentId)?.status === status) next.delete(studentId);
      else next.set(studentId, { status, remarks: '' });
      return next;
    });
  };

  const decideAll = (status) => {
    if (!eligibleData?.students) return;
    const next = new Map();
    eligibleData.students.filter((s) => !s.alreadyPromoted).forEach((s) => next.set(s.studentId, { status, remarks: '' }));
    setSelectedStudents(next);
  };

  const counts = useMemo(() => {
    const c = { promoted: 0, detained: 0, graduated: 0 };
    selectedStudents.forEach((v) => {
      c[v.status] += 1;
    });
    return c;
  }, [selectedStudents]);

  const handleBulkPromote = () => {
    if (!selectedStudents.size) return toast.info('Choose what happens to at least one student.');
    if (!targetClass || !targetYear) return toast.info('Choose the target class and academic year.');
    setConfirmModal(true);
  };

  const confirmBulkPromote = async () => {
    setSubmitting(true);
    try {
      const students = Array.from(selectedStudents.entries()).map(([studentId, data]) => ({
        studentId,
        status: data.status,
        remarks: data.remarks || null,
        rollNumber: null,
      }));
      await promotionService.bulkPromote({
        fromClassId: parseInt(selectedClass),
        fromSectionId: selectedSection ? parseInt(selectedSection) : null,
        fromAcademicYearId: parseInt(selectedYear),
        toClassId: parseInt(targetClass),
        toSectionId: targetSection ? parseInt(targetSection) : null,
        toAcademicYearId: parseInt(targetYear),
        students,
      });
      toast.success(`Processed ${students.length} student${students.length === 1 ? '' : 's'}`);
      setConfirmModal(false);
      fetchEligibleStudents();
      fetchInitialData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not process the promotions');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchHistory = async (page = 1) => {
    setHistoryLoading(true);
    try {
      const response = await promotionService.getHistory({ page, limit: historyPagination.limit, fromAcademicYearId: selectedYear || undefined });
      setHistory(response.data || []);
      if (response.pagination) {
        setHistoryPagination((prev) => ({
          ...prev,
          ...response.pagination,
          totalPages: response.pagination.totalPages || Math.ceil((response.pagination.total || 0) / prev.limit) || 1,
        }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleUndoPromotion = async (row) => {
    const ok = await confirmDialog({
      title: 'Undo this promotion?',
      message: `${fullName(row.student?.user)} goes back to ${row.fromClass?.name} (${row.fromAcademicYear?.name}).`,
      confirmLabel: 'Undo',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await promotionService.undoPromotion(row.id);
      toast.success('Promotion undone');
      fetchHistory(historyPagination.page);
      fetchInitialData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not undo the promotion');
    }
  };

  const switchView = (next) => {
    setView(next);
    if (next === 'history') fetchHistory();
  };

  const historyColumns = [
    {
      header: 'Student',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{fullName(row.student?.user)}</p>
          <p className="font-mono text-xs text-slate-500">{row.student?.admissionNumber}</p>
        </div>
      ),
    },
    {
      header: 'Move',
      render: (row) => (
        <span className="inline-flex items-center gap-2 text-sm">
          <span>{row.fromClass?.name} <span className="text-slate-400">{row.fromAcademicYear?.name}</span></span>
          <ArrowRight size={14} className="text-slate-300" aria-hidden="true" />
          <span>{row.toClass?.name || '—'} <span className="text-slate-400">{row.toAcademicYear?.name}</span></span>
        </span>
      ),
    },
    { header: 'Decision', render: (row) => <Badge tone={toneOf(row.status)}>{labelOf(row.status)}</Badge> },
    {
      header: 'By',
      render: (row) => (
        <div className="text-sm">
          <p>{fullName(row.processedByUser)}</p>
          <p className="text-xs text-slate-500">{formatDate(row.processedAt)}</p>
        </div>
      ),
    },
    {
      header: <span className="sr-only">Undo</span>,
      width: '56px',
      render: (row) => (
        <div className="flex justify-end">
          <IconButton icon={RotateCcw} label="Undo promotion" onClick={() => handleUndoPromotion(row)} />
        </div>
      ),
    },
  ];

  const yearName = (id) => academicYears.find((y) => y.id.toString() === id)?.name;
  const className = (id) => (eligibleData?.nextClasses || classes).find((c) => c.id.toString() === id)?.name;

  return (
    <div className={cn('mx-auto max-w-6xl space-y-6', selectedStudents.size > 0 && view === 'promote' && 'pb-24')}>
      <PageHeader
        icon={ArrowUpRight}
        title="Promotions"
        description="Move students into next year's classes at the end of the academic year."
      />

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Promoted" value={stats.summary?.promoted || 0} icon={ArrowUpRight} color="success" />
          <StatCard title="Detained" value={stats.summary?.detained || 0} icon={Repeat} color="warning" />
          <StatCard title="Graduated" value={stats.summary?.graduated || 0} icon={GraduationCap} color="info" />
          <StatCard title="Processed" value={stats.summary?.total || 0} icon={Users} color="primary" />
        </div>
      )}

      <Tabs
        value={view}
        onChange={switchView}
        tabs={[
          { value: 'promote', label: 'Promote students' },
          { value: 'history', label: 'History' },
        ]}
      />

      {view === 'history' ? (
        <DataTable
          columns={historyColumns}
          data={history}
          loading={historyLoading}
          pagination={historyPagination.total > historyPagination.limit ? historyPagination : null}
          onPageChange={(page) => fetchHistory(page)}
          emptyMessage="No promotions recorded yet"
          emptyIcon={RotateCcw}
        />
      ) : (
        <>
          <Card>
            <CardHeader title="1. Students to promote" description="The class and year they are finishing." />
            <div className="grid items-end gap-x-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
              <Select
                label="Class"
                name="fromClass"
                value={selectedClass}
                onChange={(e) => handleClassChange(e.target.value)}
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Select class"
              />
              <Select
                label="Section"
                name="fromSection"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                options={sections.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="All sections"
                disabled={!selectedClass}
              />
              <Select
                label="Academic year"
                name="fromYear"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                options={academicYears.map((y) => ({ value: y.id, label: y.name }))}
                placeholder="Select year"
              />
              <Button onClick={fetchEligibleStudents} loading={loading} className="mb-4">Load students</Button>
            </div>
          </Card>

          {loading && <LoadingBlock text="Loading students…" />}

          {eligibleData && !loading && (
            <>
              <Card>
                <CardHeader title="2. Where they go" description="Promoted students are enrolled here. Detained students repeat their class in the new year." />
                <div className="grid gap-x-4 sm:grid-cols-3">
                  <Select
                    label="Class"
                    name="toClass"
                    value={targetClass}
                    onChange={(e) => handleTargetClassChange(e.target.value)}
                    options={(eligibleData.nextClasses || []).map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="Select class"
                  />
                  <Select
                    label="Section"
                    name="toSection"
                    value={targetSection}
                    onChange={(e) => setTargetSection(e.target.value)}
                    options={targetSections.map((s) => ({ value: s.id, label: s.name }))}
                    placeholder="Default section"
                    disabled={!targetClass}
                  />
                  <Select
                    label="Academic year"
                    name="toYear"
                    value={targetYear}
                    onChange={(e) => setTargetYear(e.target.value)}
                    options={(eligibleData.academicYears || []).filter((y) => y.id !== parseInt(selectedYear)).map((y) => ({ value: y.id, label: y.name }))}
                    placeholder="Select year"
                  />
                </div>
                {!(eligibleData.academicYears || []).some((y) => y.id !== parseInt(selectedYear)) && (
                  <Alert tone="warning">Create next year on the Academic Years page before promoting students.</Alert>
                )}
              </Card>

              <div className="overflow-hidden rounded-card border border-slate-200/80 bg-white shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Students ({eligibleData.students?.length || 0})</h2>
                    <p className="text-xs text-slate-500">
                      {eligibleData.eligibleCount} to decide · {eligibleData.alreadyPromotedCount} already processed
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" icon={ArrowUpRight} onClick={() => decideAll('promoted')}>Promote all</Button>
                    <Button size="sm" variant="secondary" icon={Repeat} onClick={() => decideAll('detained')}>Detain all</Button>
                    {selectedStudents.size > 0 && (
                      <Button size="sm" variant="ghost" icon={X} onClick={() => setSelectedStudents(new Map())}>Clear</Button>
                    )}
                  </div>
                </div>
                {eligibleData.students?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                        <tr>
                          <th className="col-roll px-4 py-2.5 text-left">Roll</th>
                          <th className="col-name px-4 py-2.5 text-left">Student</th>
                          <th className="px-4 py-2.5 text-left">Section</th>
                          <th className="px-4 py-2.5 text-left">Decision</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {eligibleData.students.map((s) => {
                          const current = selectedStudents.get(s.studentId)?.status;
                          return (
                            <tr key={s.studentId} className={cn(s.alreadyPromoted && 'bg-slate-50/60 text-slate-400')}>
                              <td className="col-roll px-4 py-3 tabular-nums">{s.rollNumber || '—'}</td>
                              <td className="col-name px-4 py-3">
                                <p className={cn('font-medium', s.alreadyPromoted ? 'text-slate-500' : 'text-slate-900')}>{fullName(s)}</p>
                                <p className="font-mono text-xs text-slate-500">{s.admissionNumber}</p>
                              </td>
                              <td className="px-4 py-3">{s.section?.name}</td>
                              <td className="px-4 py-2.5">
                                {s.alreadyPromoted ? (
                                  <Badge tone={toneOf(s.existingPromotion?.status)}>
                                    {labelOf(s.existingPromotion?.status)} · {s.existingPromotion?.toAcademicYear?.name}
                                  </Badge>
                                ) : (
                                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="radiogroup" aria-label={`Decision for ${s.firstName}`}>
                                    {DECISIONS.map((d) => (
                                      <button
                                        key={d.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={current === d.value}
                                        onClick={() => decide(s.studentId, d.value)}
                                        className={cn(
                                          'inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                                          current === d.value ? d.active : 'text-slate-600 hover:bg-white hover:text-slate-900',
                                        )}
                                      >
                                        <d.icon size={13} aria-hidden="true" /> {d.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState icon={Users} title="No students in this class" />
                )}
              </div>
            </>
          )}

          {!eligibleData && !loading && (
            <Card>
              <EmptyState icon={GraduationCap} title="Load a class to begin" description="Choose the class and year students are finishing, then load them." />
            </Card>
          )}
        </>
      )}

      {/* Sticky action bar */}
      {view === 'promote' && selectedStudents.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-slate-900">{selectedStudents.size} selected</span>
              <span className="text-slate-500"> · {counts.promoted} promote · {counts.detained} detain · {counts.graduated} graduate</span>
            </p>
            <Button icon={CheckCircle2} onClick={handleBulkPromote} disabled={submitting}>Process promotions</Button>
          </div>
        </div>
      )}

      <Modal isOpen={confirmModal} onClose={() => setConfirmModal(false)} title="Process promotions?" size="sm">
        <ul className="space-y-2 text-sm">
          {DECISIONS.map((d) => (
            <li key={d.value} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="inline-flex items-center gap-2 text-slate-700"><d.icon size={15} aria-hidden="true" /> {d.label}</span>
              <span className="font-semibold text-slate-900 tabular-nums">{counts[d.value]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-600">
          Into <span className="font-medium text-slate-900">{className(targetClass)}</span> for{' '}
          <span className="font-medium text-slate-900">{yearName(targetYear)}</span>. You can undo any of these from History.
        </p>
        <DialogActions>
          <Button variant="secondary" onClick={() => setConfirmModal(false)}>Cancel</Button>
          <Button onClick={confirmBulkPromote} loading={submitting}>Process {selectedStudents.size}</Button>
        </DialogActions>
      </Modal>
    </div>
  );
};

export default Promotions;
