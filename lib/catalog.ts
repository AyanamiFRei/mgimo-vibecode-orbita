import type { PersonaKey, ProgramKey, Teacher } from "@/lib/types";

/** Public fictional catalog; safe to import into registration and timetable UI. */
export const personas: Record<
  PersonaKey,
  { name: string; firstName: string; avatarColor: string }
> = {
  alisa: { name: "Алиса Миронова", firstName: "Алиса", avatarColor: "lavender" },
  mark: { name: "Марк Северин", firstName: "Марк", avatarColor: "peach" },
  nika: { name: "Ника Яснова", firstName: "Ника", avatarColor: "mint" },
  lev: { name: "Лев Озёрный", firstName: "Лев", avatarColor: "blue" },
};

export const programs: Record<
  ProgramKey,
  { name: string; faculty: string; year: number; group: string; subjects: string[] }
> = {
  "business-informatics": {
    name: "Бизнес-информатика",
    faculty: "Факультет цифровой экономики",
    year: 3,
    group: "БИ-23-01",
    subjects: [
      "Анализ данных",
      "Проектирование цифровых продуктов",
      "Экономика платформ",
      "Английский язык",
      "Управление проектами",
      "Право в цифровой среде",
    ],
  },
  "international-relations": {
    name: "Международные отношения",
    faculty: "Факультет международных исследований",
    year: 2,
    group: "МО-24-02",
    subjects: [
      "Международные отношения",
      "Дипломатический протокол",
      "Мировая экономика",
      "Испанский язык",
      "История дипломатии",
      "Международное право",
    ],
  },
};

const names = [
  "Вера Лунова",
  "Даниил Рощин",
  "Елена Ветрова",
  "Анна Листова",
  "Олег Заречный",
  "Нина Полевая",
];
const departments = [
  "Кафедра аналитики и исследований",
  "Кафедра проектных практик",
  "Кафедра экономики",
  "Кафедра иностранных языков",
  "Кафедра управления",
  "Кафедра права",
];
export const teacherCatalog: Teacher[] = names.map((name, index) => ({
  id: `teacher-${index + 1}`,
  name,
  title: index % 2 === 0 ? "Доцент" : "Старший преподаватель",
  department: departments[index],
  subjects: Object.values(programs).map((program) => program.subjects[index]),
  avatarColor: ["lavender", "peach", "mint", "blue"][index % 4],
  office: `Главный корпус, ${210 + index}`,
  officeHours: ["Вт 15:00–16:00", "Чт 14:00–15:00", "Ср 16:00–17:00"][index % 3],
  bio: "Помогает разобраться в заданиях и подготовиться к занятиям. Можно задать вопрос о курсе или записаться на консультацию.",
  isFictional: true,
}));
