export type Role = "student" | "staff";
export type RequestType = "study" | "scholarship" | "transcript" | "application";
export type RequestStatus = "submitted" | "processing" | "ready" | "rejected";

export interface User {
  id: string;
  login: string;
  role: Role;
  name: string;
  firstName: string;
  email: string;
  faculty: string;
  program: string;
  year: number;
  group: string;
  studentNumber: string;
  avatarColor: string;
}
export interface ClassItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  subject: string;
  type: "lecture" | "seminar" | "practice" | "exam";
  teacher: string;
  teacherId: string | null;
  semesterId?: SemesterId;
  room: string;
  building: string;
  changed: boolean;
  changeNote: string | null;
}
export interface Grade {
  id: string;
  subject: string;
  teacher: string;
  score: number;
  maxScore: number;
  grade: string;
  status: "in_progress" | "passed" | "exam";
  assessment: string;
  examDate: string | null;
  credits: number;
}
export interface RequestEvent {
  id: string;
  status: RequestStatus;
  note: string;
  createdAt: string;
}
export interface StudentRequest {
  id: string;
  number: string;
  type: RequestType;
  title: string;
  purpose: string;
  comment: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  dueAt: string;
  staffComment: string | null;
  events: RequestEvent[];
}
export interface Notification {
  id: string;
  title: string;
  body: string;
  kind: "schedule" | "request" | "deadline" | "news";
  read: boolean;
  createdAt: string;
  href: string | null;
}
export interface Deadline {
  id: string;
  title: string;
  subject: string;
  dueAt: string;
  kind: "assignment" | "exam" | "document";
}
export interface Workspace {
  user: User;
  classes: ClassItem[];
  grades: Grade[];
  requests: StudentRequest[];
  notifications: Notification[];
  deadlines: Deadline[];
  weekStart: string;
}
export interface QueueItem extends StudentRequest {
  student: Pick<User, "id" | "name" | "group">;
}
export interface PrintableDocument {
  request: StudentRequest;
  student: User;
}

export type ProgramKey = "business-informatics" | "international-relations";
export type PersonaKey = "alisa" | "mark" | "nika" | "lev";
export type SemesterId = "autumn-2026" | "spring-2027";
export interface Semester {
  id: SemesterId;
  name: string;
  startDate: string;
  endDate: string;
  teachingEndDate: string;
  examStartDate: string;
  examEndDate: string;
}
export interface CalendarDay {
  date: string;
  kind: "study" | "weekend" | "holiday" | "vacation" | "exam";
  label: string;
  sourceUrl?: string;
}
export interface ScheduleData {
  semesters: Semester[];
  semester: Semester;
  weekStart: string;
  classes: ClassItem[];
  days: CalendarDay[];
  notes: string[];
}
export interface Teacher {
  id: string;
  name: string;
  title: string;
  department: string;
  subjects: string[];
  avatarColor: string;
  office: string;
  officeHours: string;
  bio: string;
  isFictional: true;
}
export interface TeacherMessage {
  id: string;
  senderRole: "student" | "staff" | "system";
  senderName: string;
  body: string;
  createdAt: string;
  isSimulation: boolean;
}
export interface TeacherThread {
  id: string;
  teacherId: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: string;
  unreadCount: number;
}
export interface TeacherConversation {
  thread: TeacherThread;
  teacher: Teacher;
  messages: TeacherMessage[];
}
export interface StaffTeacherThread extends TeacherThread {
  student: Pick<User, "id" | "name" | "group">;
}
