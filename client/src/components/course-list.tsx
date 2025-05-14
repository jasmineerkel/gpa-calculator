import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CourseData } from "@/lib/gpa-calculator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface CourseListProps {
  courses: CourseData[];
  onCourseRemove: (index: number) => void;
}

export function CourseList({ courses, onCourseRemove }: CourseListProps) {
  const { toast } = useToast();

  const handleRemoveCourse = async (index: number, courseId?: number) => {
    try {
      if (courseId) {
        // If we have a course ID, delete from the server
        await apiRequest("DELETE", `/api/courses/${courseId}`);
        queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      }
      
      // Remove from local state
      onCourseRemove(index);
      
      toast({
        title: "Course removed",
        description: "The course has been removed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove the course",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-800 mb-2">Courses</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead className="text-left text-sm font-semibold text-gray-700">Course Name</TableHead>
              <TableHead className="text-left text-sm font-semibold text-gray-700">Credit Hours</TableHead>
              <TableHead className="text-left text-sm font-semibold text-gray-700">Grade</TableHead>
              <TableHead className="text-left text-sm font-semibold text-gray-700">Grade Points</TableHead>
              <TableHead className="text-left text-sm font-semibold text-gray-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-200">
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="px-4 py-3 text-center text-gray-500">
                  No courses added yet
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course, index) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  <TableCell className="py-2 text-sm text-gray-700">{course.name}</TableCell>
                  <TableCell className="py-2 text-sm text-gray-700">{course.creditHours}</TableCell>
                  <TableCell className="py-2 text-sm text-gray-700">{course.grade}</TableCell>
                  <TableCell className="py-2 text-sm text-gray-700">{course.gradePoints.toFixed(1)}</TableCell>
                  <TableCell className="py-2 text-sm">
                    <Button 
                      variant="ghost" 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                      onClick={() => handleRemoveCourse(index, course.id)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
