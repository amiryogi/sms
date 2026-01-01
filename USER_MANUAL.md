# K-12 School Management System - User Manual

This manual guides you through testing the core functionalities of the School Management System.

## 🚀 Getting Started

1.  **Access the System**: Open your browser (e.g., `http://localhost:5173`).
2.  **Login**: Use the demo credentials below to access different role-based dashboards.

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@demo-school.edu.np` | `password123` |
| **Teacher** | `teacher@demo-school.edu.np` | `password123` |
| **Student** | `student@demo-school.edu.np` | `password123` |
| **Parent** | `parent@demo-school.edu.np` | `password123` |

---

## 👨‍💼 Admin Workflow
*Full system control and configuration.*

**Key Actions:**
1.  **Dashboard**: View overview stats.
2.  **Academic Setup** (Order is important):
    *   **Academic Years**: Create/Manage years (e.g., "2024-2025"). Make one "Current".
    *   **Classes**: Define grades (e.g., Grade 1, Grade 10).
    *   **Sections**: Define divisions (A, B, C).
    *   **Subjects**: Create master subject list (Math, Science).
3.  **Assignments (Linking Data)**:
    *   **Class Subjects**: Assign subjects to a Class + Year (e.g., Grade 10 + Math).
    *   **Teacher Assignment**: Assign a teacher to a Class + Section + Subject.
4.  **User Management**: create Students and Teachers manually if needed.

---

## 👩‍🏫 Teacher Workflow
*Daily academic management.*

**Key Actions:**
1.  **Attendance**:
    *   Navigate to **Attendance**.
    *   Select Class & Section.
    *   Mark students Present/Absent/Late and Save.
2.  **Marks Entry**:
    *   Navigate to **Marks Entry**.
    *   Select Exam, Class & Subject.
    *   Enter theory/practical marks for students.
3.  **Assignments**:
    *   Go to **Assignments**.
    *   Create new homework with due dates and descriptions.
    *   Review submissions from students.

---

## 👨‍🎓 Student Workflow
*Learning and progress tracking.*

**Key Actions:**
1.  **Dashboard**: View attendance summary and recent notices.
2.  **Assignments**:
    *   View pending homework.
    *   Submit work (text or file).
3.  **Results**:
    *   View marks sheet for published exams.
4.  **Report Card**:
    *   Download/View final report cards.

---

## 👪 Parent Workflow
*Monitoring child's performance.*

**Key Actions:**
1.  **Dashboard**: Overview of child's activity.
2.  **Attendance**: Check daily attendance records.
3.  **Results**: View exam performance and grades.

---

## 🛠 Troubleshooting / Notes
*   **Data Visibility**: Data is scoped to the **Active Academic Year**. If you don't see data, ensure the correct year is active.
*   **Teacher Access**: Teachers can only see classes/subjects they are explicitly assigned to by the Admin.
*   **Exam Results**: Results must be **Published** by the Admin/Teacher to be visible to Students/Parents.
