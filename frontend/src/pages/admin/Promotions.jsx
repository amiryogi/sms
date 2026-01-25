import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowRight, GraduationCap, AlertCircle, CheckCircle, RotateCcw, Users } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { Select, Button, FormRow, Input } from '../../components/common/FormElements';
import { promotionService } from '../../api/promotionService';
import { academicService } from '../../api/academicService';

const Promotions = () => {
  // State for source selection
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // State for eligible students
  const [eligibleData, setEligibleData] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // State for target selection
  const [targetClass, setTargetClass] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [targetYear, setTargetYear] = useState('');
  const [targetSections, setTargetSections] = useState([]);

  // History view
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 20, total: 0 });

  // Stats
  const [stats, setStats] = useState(null);

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [classesRes, yearsRes] = await Promise.all([
        academicService.getClasses(),
        academicService.getAcademicYears(),
      ]);
      setClasses(classesRes.data || []);
      setAcademicYears(yearsRes.data || []);

      // Auto-select current year
      const currentYear = (yearsRes.data || []).find(y => y.isCurrent);
      if (currentYear) {
        setSelectedYear(currentYear.id.toString());
      }

      // Fetch stats
      const statsRes = await promotionService.getStats();
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const handleClassChange = async (classId) => {
    setSelectedClass(classId);
    setSelectedSection('');
    setSections([]);
    setEligibleData(null);
    setSelectedStudents(new Map());

    if (classId) {
      try {
        const response = await academicService.getSections(classId);
        setSections(response.data || []);
      } catch (error) {
        console.error('Error fetching sections:', error);
      }
    }
  };

  const handleTargetClassChange = async (classId) => {
    setTargetClass(classId);
    setTargetSection('');
    setTargetSections([]);

    if (classId) {
      try {
        const response = await academicService.getSections(classId);
        setTargetSections(response.data || []);
      } catch (error) {
        console.error('Error fetching target sections:', error);
      }
    }
  };

  const fetchEligibleStudents = async () => {
    if (!selectedClass || !selectedYear) {
      alert('Please select a class and academic year');
      return;
    }

    setLoading(true);
    try {
      const response = await promotionService.getEligibleStudents(
        parseInt(selectedClass),
        parseInt(selectedYear),
        selectedSection ? parseInt(selectedSection) : null
      );
      setEligibleData(response.data);
      setSelectedStudents(new Map());

      // Auto-select next class and year
      if (response.data.nextClasses?.length > 0) {
        const currentGrade = response.data.currentClass.gradeLevel;
        const nextClass = response.data.nextClasses.find(c => c.gradeLevel === currentGrade + 1);
        if (nextClass) {
          setTargetClass(nextClass.id.toString());
          setTargetSections(nextClass.sections || []);
          if (nextClass.sections?.length > 0) {
            setTargetSection(nextClass.sections[0].id.toString());
          }
        }
      }

      // Auto-select next academic year
      if (response.data.academicYears?.length > 1) {
        const nextYear = response.data.academicYears.find(y => y.id !== parseInt(selectedYear));
        if (nextYear) {
          setTargetYear(nextYear.id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching eligible students:', error);
      alert(error.response?.data?.message || 'Error fetching students');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelection = (studentId, status) => {
    const newSelection = new Map(selectedStudents);
    if (status === null) {
      newSelection.delete(studentId);
    } else {
      newSelection.set(studentId, { status, remarks: '' });
    }
    setSelectedStudents(newSelection);
  };

  const handleSelectAll = (status) => {
    if (!eligibleData?.students) return;

    const newSelection = new Map();
    eligibleData.students
      .filter(s => !s.alreadyPromoted)
      .forEach(s => {
        newSelection.set(s.studentId, { status, remarks: '' });
      });
    setSelectedStudents(newSelection);
  };

  const handleClearSelection = () => {
    setSelectedStudents(new Map());
  };

  const handleBulkPromote = async () => {
    if (selectedStudents.size === 0) {
      alert('Please select at least one student');
      return;
    }

    if (!targetClass || !targetYear) {
      alert('Please select target class and academic year');
      return;
    }

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

      alert(`Successfully processed ${students.length} promotion(s)`);
      setConfirmModal(false);
      fetchEligibleStudents();
      fetchInitialData(); // Refresh stats
    } catch (error) {
      console.error('Error processing promotions:', error);
      alert(error.response?.data?.message || 'Error processing promotions');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchHistory = async (page = 1) => {
    setHistoryLoading(true);
    try {
      const response = await promotionService.getHistory({
        page,
        limit: historyPagination.limit,
        fromAcademicYearId: selectedYear || undefined,
      });
      setHistory(response.data || []);
      if (response.pagination) {
        setHistoryPagination(prev => ({ ...prev, ...response.pagination }));
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleUndoPromotion = async (promotionId) => {
    if (!confirm('Are you sure you want to undo this promotion? This will restore the student to their previous class.')) {
      return;
    }

    try {
      await promotionService.undoPromotion(promotionId);
      alert('Promotion undone successfully');
      fetchHistory(historyPagination.page);
      fetchInitialData();
    } catch (error) {
      console.error('Error undoing promotion:', error);
      alert(error.response?.data?.message || 'Error undoing promotion');
    }
  };

  const toggleHistory = () => {
    if (!showHistory) {
      fetchHistory();
    }
    setShowHistory(!showHistory);
  };

  const getStatusBadge = (status) => {
    const badges = {
      promoted: 'badge-success',
      detained: 'badge-warning',
      graduated: 'badge-info',
    };
    return badges[status] || 'badge-secondary';
  };

  const historyColumns = [
    {
      header: 'Student',
      render: (row) => (
        <div>
          <div className="font-medium">{row.student?.user?.firstName} {row.student?.user?.lastName}</div>
          <div className="text-muted text-sm">{row.student?.admissionNumber}</div>
        </div>
      ),
    },
    {
      header: 'From',
      render: (row) => (
        <div>
          <div>{row.fromClass?.name}</div>
          <div className="text-muted text-sm">{row.fromAcademicYear?.name}</div>
        </div>
      ),
    },
    {
      header: 'To',
      render: (row) => (
        <div>
          <div>{row.toClass?.name || 'N/A'}</div>
          <div className="text-muted text-sm">{row.toAcademicYear?.name}</div>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <span className={`badge ${getStatusBadge(row.status)}`}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </span>
      ),
    },
    {
      header: 'Processed By',
      render: (row) => (
        <div>
          <div>{row.processedByUser?.firstName} {row.processedByUser?.lastName}</div>
          <div className="text-muted text-sm">{new Date(row.processedAt).toLocaleDateString()}</div>
        </div>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <Button
          variant="outline"
          size="small"
          onClick={() => handleUndoPromotion(row.id)}
          title="Undo promotion"
        >
          <RotateCcw size={14} />
        </Button>
      ),
    },
  ];

  return (
    <div className="promotions-page">
      <div className="page-header">
        <h1>Student Promotions</h1>
        <Button variant="outline" onClick={toggleHistory}>
          {showHistory ? 'Back to Promotions' : 'View History'}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon bg-success">
              <ArrowUpRight size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.summary?.promoted || 0}</div>
              <div className="stat-label">Promoted</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-warning">
              <AlertCircle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.summary?.detained || 0}</div>
              <div className="stat-label">Detained</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-info">
              <GraduationCap size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.summary?.graduated || 0}</div>
              <div className="stat-label">Graduated</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-primary">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.summary?.total || 0}</div>
              <div className="stat-label">Total Processed</div>
            </div>
          </div>
        </div>
      )}

      {showHistory ? (
        /* History View */
        <div className="card">
          <div className="card-header">
            <h3>Promotion History</h3>
          </div>
          <DataTable
            columns={historyColumns}
            data={history}
            loading={historyLoading}
            emptyMessage="No promotion records found"
          />
          {historyPagination.total > historyPagination.limit && (
            <div className="pagination">
              <Button
                variant="outline"
                disabled={historyPagination.page <= 1}
                onClick={() => fetchHistory(historyPagination.page - 1)}
              >
                Previous
              </Button>
              <span>Page {historyPagination.page}</span>
              <Button
                variant="outline"
                disabled={historyPagination.page * historyPagination.limit >= historyPagination.total}
                onClick={() => fetchHistory(historyPagination.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Promotion Process View */
        <>
          {/* Source Selection */}
          <div className="card">
            <div className="card-header">
              <h3>Select Students to Promote</h3>
            </div>
            <div className="card-body">
              <FormRow columns={4}>
                <Select
                  label="From Class"
                  value={selectedClass}
                  onChange={(e) => handleClassChange(e.target.value)}
                  options={[
                    { value: '', label: 'Select Class' },
                    ...classes.map(c => ({ value: c.id, label: c.name })),
                  ]}
                />
                <Select
                  label="Section (Optional)"
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  options={[
                    { value: '', label: 'All Sections' },
                    ...sections.map(s => ({ value: s.id, label: s.name })),
                  ]}
                  disabled={!selectedClass}
                />
                <Select
                  label="Academic Year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  options={[
                    { value: '', label: 'Select Year' },
                    ...academicYears.map(y => ({ value: y.id, label: y.name })),
                  ]}
                />
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Button onClick={fetchEligibleStudents} disabled={loading}>
                    {loading ? 'Loading...' : 'Load Students'}
                  </Button>
                </div>
              </FormRow>
            </div>
          </div>

          {eligibleData && (
            <>
              {/* Target Selection */}
              <div className="card">
                <div className="card-header">
                  <h3>Promotion Target</h3>
                </div>
                <div className="card-body">
                  <FormRow columns={3}>
                    <Select
                      label="To Class"
                      value={targetClass}
                      onChange={(e) => handleTargetClassChange(e.target.value)}
                      options={[
                        { value: '', label: 'Select Class' },
                        ...(eligibleData.nextClasses || []).map(c => ({
                          value: c.id,
                          label: `${c.name} (Grade ${c.gradeLevel})`,
                        })),
                      ]}
                    />
                    <Select
                      label="To Section"
                      value={targetSection}
                      onChange={(e) => setTargetSection(e.target.value)}
                      options={[
                        { value: '', label: 'Default Section' },
                        ...targetSections.map(s => ({ value: s.id, label: s.name })),
                      ]}
                      disabled={!targetClass}
                    />
                    <Select
                      label="To Academic Year"
                      value={targetYear}
                      onChange={(e) => setTargetYear(e.target.value)}
                      options={[
                        { value: '', label: 'Select Year' },
                        ...(eligibleData.academicYears || [])
                          .filter(y => y.id !== parseInt(selectedYear))
                          .map(y => ({ value: y.id, label: y.name })),
                      ]}
                    />
                  </FormRow>
                </div>
              </div>

              {/* Students List */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3>Students ({eligibleData.students?.length || 0})</h3>
                    <p className="text-muted">
                      {eligibleData.eligibleCount} eligible, {eligibleData.alreadyPromotedCount} already processed
                    </p>
                  </div>
                  <div className="header-actions">
                    <Button variant="outline" size="small" onClick={() => handleSelectAll('promoted')}>
                      Select All (Promote)
                    </Button>
                    <Button variant="outline" size="small" onClick={() => handleSelectAll('detained')}>
                      Select All (Detain)
                    </Button>
                    <Button variant="ghost" size="small" onClick={handleClearSelection}>
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="card-body">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Roll</th>
                        <th>Name</th>
                        <th>Section</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eligibleData.students?.map((student) => (
                        <tr key={student.studentId} className={student.alreadyPromoted ? 'row-disabled' : ''}>
                          <td>{student.rollNumber || '-'}</td>
                          <td>
                            <div>{student.firstName} {student.lastName}</div>
                            <div className="text-muted text-sm">{student.admissionNumber}</div>
                          </td>
                          <td>{student.section?.name}</td>
                          <td>
                            {student.alreadyPromoted ? (
                              <span className={`badge ${getStatusBadge(student.existingPromotion?.status)}`}>
                                {student.existingPromotion?.status} → {student.existingPromotion?.toAcademicYear?.name}
                              </span>
                            ) : selectedStudents.has(student.studentId) ? (
                              <span className={`badge ${getStatusBadge(selectedStudents.get(student.studentId).status)}`}>
                                {selectedStudents.get(student.studentId).status}
                              </span>
                            ) : (
                              <span className="badge badge-secondary">Pending</span>
                            )}
                          </td>
                          <td>
                            {!student.alreadyPromoted && (
                              <div className="btn-group">
                                <Button
                                  variant={selectedStudents.get(student.studentId)?.status === 'promoted' ? 'primary' : 'outline'}
                                  size="small"
                                  onClick={() => handleStudentSelection(student.studentId, 'promoted')}
                                  title="Promote"
                                >
                                  <ArrowUpRight size={14} />
                                </Button>
                                <Button
                                  variant={selectedStudents.get(student.studentId)?.status === 'detained' ? 'warning' : 'outline'}
                                  size="small"
                                  onClick={() => handleStudentSelection(student.studentId, 'detained')}
                                  title="Detain"
                                >
                                  <ArrowRight size={14} />
                                </Button>
                                <Button
                                  variant={selectedStudents.get(student.studentId)?.status === 'graduated' ? 'info' : 'outline'}
                                  size="small"
                                  onClick={() => handleStudentSelection(student.studentId, 'graduated')}
                                  title="Graduate"
                                >
                                  <GraduationCap size={14} />
                                </Button>
                                {selectedStudents.has(student.studentId) && (
                                  <Button
                                    variant="ghost"
                                    size="small"
                                    onClick={() => handleStudentSelection(student.studentId, null)}
                                    title="Clear"
                                  >
                                    ×
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="card-footer">
                  <div className="selection-summary">
                    <strong>Selected: {selectedStudents.size}</strong>
                    {selectedStudents.size > 0 && (
                      <span className="text-muted">
                        {' '}
                        ({Array.from(selectedStudents.values()).filter(s => s.status === 'promoted').length} promote,
                        {' '}{Array.from(selectedStudents.values()).filter(s => s.status === 'detained').length} detain,
                        {' '}{Array.from(selectedStudents.values()).filter(s => s.status === 'graduated').length} graduate)
                      </span>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleBulkPromote}
                    disabled={selectedStudents.size === 0 || submitting}
                  >
                    <CheckCircle size={16} />
                    Process Promotions
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Confirm Bulk Promotion"
      >
        <div className="modal-body">
          <p>You are about to process <strong>{selectedStudents.size}</strong> student(s):</p>
          <ul>
            <li>
              <strong>{Array.from(selectedStudents.values()).filter(s => s.status === 'promoted').length}</strong> will be promoted
            </li>
            <li>
              <strong>{Array.from(selectedStudents.values()).filter(s => s.status === 'detained').length}</strong> will be detained
            </li>
            <li>
              <strong>{Array.from(selectedStudents.values()).filter(s => s.status === 'graduated').length}</strong> will be marked as graduated
            </li>
          </ul>
          <p>
            Target: <strong>{classes.find(c => c.id.toString() === targetClass)?.name}</strong>
            {' → '}
            <strong>{academicYears.find(y => y.id.toString() === targetYear)?.name}</strong>
          </p>
          <p className="text-warning">This action can be undone from the History view.</p>
        </div>
        <div className="modal-footer">
          <Button variant="outline" onClick={() => setConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmBulkPromote} disabled={submitting}>
            {submitting ? 'Processing...' : 'Confirm'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Promotions;
