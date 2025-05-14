import { Card, CardContent } from "@/components/ui/card";

interface GpaResultProps {
  gpa: number;
  letterGrade?: string;
  totalCreditHours?: number;
  totalGradePoints?: number;
  isCumulative?: boolean;
}

export function GpaResult({
  gpa,
  letterGrade,
  totalCreditHours,
  totalGradePoints,
  isCumulative = false,
}: GpaResultProps) {
  if (gpa === 0 && !isCumulative) return null;

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-medium text-gray-800 mb-2">
        {isCumulative ? "Cumulative GPA Result" : "Course GPA Result"}
      </h3>
      
      <div className="flex items-center">
        <span className="text-3xl font-mono font-bold text-primary">
          {gpa.toFixed(2)}
        </span>
        <span className="ml-2 text-sm text-gray-500">/ 4.0</span>
      </div>
      
      {letterGrade && !isCumulative && (
        <p className="mt-2 text-sm text-gray-600">Letter Grade: {letterGrade}</p>
      )}
      
      {isCumulative && totalCreditHours !== undefined && totalGradePoints !== undefined && (
        <div className="mt-2">
          <p className="text-sm text-gray-600">Total Credit Hours: {totalCreditHours}</p>
          <p className="text-sm text-gray-600">Total Grade Points: {totalGradePoints.toFixed(1)}</p>
        </div>
      )}
    </div>
  );
}
