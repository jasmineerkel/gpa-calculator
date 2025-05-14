import { gradeValues } from "@shared/schema";

export type GradeOption = {
  value: string;
  label: string;
};

export const gradeOptions: GradeOption[] = [
  { value: "4.0", label: "A / A+ (4.0)" },
  { value: "3.7", label: "A- (3.7)" },
  { value: "3.3", label: "B+ (3.3)" },
  { value: "3.0", label: "B (3.0)" },
  { value: "2.7", label: "B- (2.7)" },
  { value: "2.3", label: "C+ (2.3)" },
  { value: "2.0", label: "C (2.0)" },
  { value: "1.7", label: "C- (1.7)" },
  { value: "1.3", label: "D+ (1.3)" },
  { value: "1.0", label: "D (1.0)" },
  { value: "0.7", label: "D- (0.7)" },
  { value: "0.0", label: "F (0.0)" }
];

export type CourseData = {
  id?: number;
  name: string;
  creditHours: number;
  grade: string;
  gradeValue: number;
  gradePoints: number;
};

export function calculateGradePoints(creditHours: number, gradeValue: number): number {
  return creditHours * gradeValue;
}

export function calculateCumulativeGPA(courses: CourseData[]): {
  gpa: number;
  totalCreditHours: number;
  totalGradePoints: number;
} {
  if (courses.length === 0) {
    return { gpa: 0, totalCreditHours: 0, totalGradePoints: 0 };
  }

  let totalCreditHours = 0;
  let totalGradePoints = 0;

  courses.forEach(course => {
    totalCreditHours += course.creditHours;
    totalGradePoints += course.gradePoints;
  });

  const gpa = totalGradePoints / totalCreditHours;

  return {
    gpa,
    totalCreditHours,
    totalGradePoints
  };
}

export function getLetterGrade(gpaValue: number): string {
  if (gpaValue >= 4.0) return "A/A+";
  if (gpaValue >= 3.7) return "A-";
  if (gpaValue >= 3.3) return "B+";
  if (gpaValue >= 3.0) return "B";
  if (gpaValue >= 2.7) return "B-";
  if (gpaValue >= 2.3) return "C+";
  if (gpaValue >= 2.0) return "C";
  if (gpaValue >= 1.7) return "C-";
  if (gpaValue >= 1.3) return "D+";
  if (gpaValue >= 1.0) return "D";
  if (gpaValue >= 0.7) return "D-";
  return "F";
}

export function getGradeLetterFromValue(gradeValue: number): string {
  for (const [letter, value] of Object.entries(gradeValues)) {
    if (value === gradeValue) {
      return letter;
    }
  }
  return "Unknown";
}
