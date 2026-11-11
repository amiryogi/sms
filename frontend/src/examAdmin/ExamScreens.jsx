import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  BooleanField,
  FunctionField,
  ArrayField,
  Show,
  SimpleShowLayout,
  ShowButton,
  SearchInput,
  SelectInput,
  ReferenceInput,
  TopToolbar,
  useListContext,
  useNotify,
  useRecordContext,
  useRefresh,
} from "react-admin";
import { Button, Chip, Stack } from "@mui/material";
import { examService } from "../api/examService";

const STATUS = {
  DRAFT: { label: "Draft", color: "default" },
  PUBLISHED: { label: "Published", color: "success" },
  LOCKED: { label: "Locked", color: "warning" },
};
const TYPES = [
  { id: "unit_test", name: "Unit test" },
  { id: "midterm", name: "Midterm" },
  { id: "final", name: "Final" },
  { id: "board", name: "Board" },
];
const typeName = (id) => TYPES.find((t) => t.id === id)?.name || id;

const StatusChip = ({ status }) => {
  const s = STATUS[status] || { label: status, color: "default" };
  return <Chip size="small" label={s.label} color={s.color} variant={s.color === "default" ? "outlined" : "filled"} />;
};

/**
 * A dropdown filled from another resource. ReferenceInput waits for the
 * options before rendering the select, so a value from the URL is never
 * "out of range" while they load.
 */
const RefSelect = ({ source, reference, label, sort = { field: "name", order: "ASC" }, emptyText, ...rest }) => (
  <ReferenceInput source={source} reference={reference} sort={sort} perPage={200} {...rest}>
    <SelectInput label={label} optionText="name" emptyText={emptyText} />
  </ReferenceInput>
);

const examFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Search exams" />,
  <SelectInput key="status" source="status" alwaysOn choices={Object.entries(STATUS).map(([id, s]) => ({ id, name: s.label }))} />,
  <RefSelect key="year" source="academicYearId" reference="academic-years" label="Academic year" sort={{ field: "startDate", order: "DESC" }} emptyText="Current year" alwaysOn />,
  <SelectInput key="type" source="examType" label="Type" choices={TYPES} />,
];

/**
 * Lifecycle buttons. They call the same endpoints as the Exams page; the
 * backend enforces DRAFT -> PUBLISHED -> LOCKED and who may do it.
 */
const LifecycleButtons = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [busy, setBusy] = React.useState(false);
  if (!record) return null;

  const run = (label, action) => async (event) => {
    event.stopPropagation();
    setBusy(true);
    try {
      await action(record.id);
      notify(`${record.name}: ${label}`, { type: "success" });
      refresh();
    } catch (error) {
      notify(error.response?.data?.message || `Could not ${label.toLowerCase()}`, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack direction="row" spacing={1} justifyContent="flex-end">
      {record.status === "DRAFT" && <Button size="small" variant="outlined" disabled={busy} onClick={run("published", examService.publishExam)}>Publish</Button>}
      {record.status === "PUBLISHED" && <Button size="small" variant="outlined" disabled={busy} onClick={run("locked", examService.lockExam)}>Lock</Button>}
      {record.status === "LOCKED" && <Button size="small" disabled={busy} onClick={run("unlocked", examService.unlockExam)}>Unlock</Button>}
      <ShowButton label="Subjects" />
    </Stack>
  );
};

const ExamListActions = () => (
  <TopToolbar>
    <Button component={RouterLink} to="/admin/exams" size="small">Create or edit exams</Button>
  </TopToolbar>
);

export const ExamList = () => (
  <List filters={examFilters} actions={<ExamListActions />} sort={{ field: "startDate", order: "DESC" }} perPage={10} title="Examinations" exporter={false} empty={false}>
    <Datagrid bulkActionButtons={false} rowClick="show">
      <TextField source="name" label="Examination" />
      <FunctionField label="Type" source="examType" render={(r) => typeName(r.examType)} />
      <TextField source="academicYear.name" label="Year" />
      <DateField source="startDate" label="Starts" />
      <DateField source="endDate" label="Ends" />
      <NumberField source="subjectCount" label="Subjects" />
      <FunctionField label="Status" source="status" render={(r) => <StatusChip status={r.status} />} />
      <LifecycleButtons />
    </Datagrid>
  </List>
);

export const ExamShow = () => (
  <Show title="Examination subjects" actions={false}>
    <SimpleShowLayout>
      <TextField source="name" label="Examination" />
      <FunctionField label="Status" render={(r) => <StatusChip status={r.status} />} />
      <TextField source="academicYear.name" label="Academic year" />
      <FunctionField
        label="Marks structure"
        render={() => "Copied from the class subjects when the exam was created. Later changes to a class subject do not change this exam."}
      />
      <ArrayField source="examSubjects" label="Subjects">
        <Datagrid bulkActionButtons={false} rowClick={false} sort={{ field: "classSubject.class.name", order: "ASC" }}>
          <TextField source="classSubject.class.name" label="Class" />
          <TextField source="classSubject.subject.name" label="Subject" />
          <NumberField source="fullMarks" label="Full marks" />
          <NumberField source="passMarks" label="Pass marks" />
          <NumberField source="theoryFullMarks" label="Theory" />
          <BooleanField source="hasPractical" label="Practical" />
          <NumberField source="practicalFullMarks" label="Practical marks" />
          <DateField source="examDate" label="Date" emptyText="—" />
        </Datagrid>
      </ArrayField>
    </SimpleShowLayout>
  </Show>
);

// ---- results -----------------------------------------------------------------

const resultFilters = [
  <RefSelect key="exam" source="examId" label="Examination" reference="exams" sort={{ field: "startDate", order: "DESC" }} alwaysOn />,
  <RefSelect key="class" source="classId" label="Class" reference="classes" sort={{ field: "gradeLevel", order: "ASC" }} alwaysOn />,
  <RefSelect key="section" source="sectionId" label="Section" reference="sections" alwaysOn />,
  <SearchInput key="q" source="q" alwaysOn placeholder="Student or roll no." />,
  <SelectInput key="outcome" source="outcome" label="Result" choices={[{ id: "passed", name: "Passed" }, { id: "failed", name: "Failed" }]} />,
  <SelectInput
    key="card"
    source="cardStatus"
    label="Report card"
    choices={[{ id: "none", name: "Not generated" }, { id: "generated", name: "Generated" }, { id: "published", name: "Published" }]}
  />,
];

const CARD = {
  none: { label: "Not generated", color: "default" },
  generated: { label: "Generated", color: "info" },
  published: { label: "Published", color: "success" },
};

const ResultGrid = () => {
  const { filterValues } = useListContext();
  const ready = filterValues.examId && filterValues.classId && filterValues.sectionId;
  if (!ready) {
    return <p className="px-4 py-10 text-center text-sm text-slate-500">Choose an examination, a class and a section to see results.</p>;
  }
  return (
    <Datagrid bulkActionButtons={false} rowClick={false} empty={<p className="px-4 py-10 text-center text-sm text-slate-500">No students match.</p>}>
      <NumberField source="rollNumber" label="Roll" />
      <TextField source="name" label="Student" />
      <NumberField source="subjectsWithMarks" label="Subjects with marks" />
      <FunctionField label="Total" source="totalObtained" render={(r) => `${r.totalObtained} / ${r.totalFull}`} />
      <NumberField source="percentage" label="%" options={{ maximumFractionDigits: 2 }} />
      <NumberField source="gpa" label="GPA" options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
      <TextField source="overallGrade" label="Grade" />
      <FunctionField
        label="Result"
        source="isPassed"
        render={(r) => <Chip size="small" label={r.isPassed ? "Passed" : "Failed"} color={r.isPassed ? "success" : "error"} variant="outlined" />}
      />
      <NumberField source="classRank" label="Rank" emptyText="—" />
      <FunctionField
        label="Report card"
        source="cardStatus"
        render={(r) => <Chip size="small" label={CARD[r.cardStatus].label} color={CARD[r.cardStatus].color} variant={r.cardStatus === "none" ? "outlined" : "filled"} />}
      />
    </Datagrid>
  );
};

const ResultListActions = () => (
  <TopToolbar>
    <Button component={RouterLink} to="/admin/report-cards" size="small">Generate, publish or print</Button>
  </TopToolbar>
);

export const ResultList = () => (
  <List
    resource="results"
    filters={resultFilters}
    actions={<ResultListActions />}
    sort={{ field: "rollNumber", order: "ASC" }}
    perPage={25}
    title="Results"
    exporter={false}
    empty={false}
    disableSyncWithLocation={false}
  >
    <ResultGrid />
  </List>
);
