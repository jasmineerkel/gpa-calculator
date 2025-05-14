import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCourseSchema } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GpaResult } from "./gpa-result";
import { CourseList } from "./course-list";
import { CourseData, calculateCumulativeGPA, calculateGradePoints, getGradeLetterFromValue, gradeOptions } from "@/lib/gpa-calculator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Extended schema for frontend validation
const cumulativeGpaFormSchema = insertCourseSchema.extend({
  name: z.string().min(1, "Course name is required"),
  creditHours: z.coerce
    .number()
    .min(0.5, "Credit hours must be at least 0.5")
    .max(10, "Credit hours must be at most 10"),
  gradeValue: z.coerce.number(),
});

type CumulativeGpaFormValues = z.infer<typeof cumulativeGpaFormSchema>;

export function CumulativeGpaCalculator() {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [cumulativeGpa, setCumulativeGpa] = useState(0);
  const [totalCreditHours, setTotalCreditHours] = useState(0);
  const [totalGradePoints, setTotalGradePoints] = useState(0);
  const [isResultVisible, setIsResultVisible] = useState(false);
  
  const { toast } = useToast();

  // Fetch courses from the server
  const { data: fetchedCourses, isLoading } = useQuery({
    queryKey: ["/api/courses"],
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (fetchedCourses) {
      setCourses(fetchedCourses);
    }
  }, [fetchedCourses]);

  // Add course mutation
  const addCourseMutation = useMutation({
    mutationFn: async (courseData: CourseData) => {
      const response = await apiRequest("POST", "/api/courses", courseData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Course added",
        description: "The course has been added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add the course",
        variant: "destructive",
      });
    }
  });

  const form = useForm<CumulativeGpaFormValues>({
    resolver: zodResolver(cumulativeGpaFormSchema),
    defaultValues: {
      name: "",
      creditHours: undefined,
      grade: "",
      gradeValue: undefined,
      gradePoints: undefined
    },
  });

  async function onSubmit(data: CumulativeGpaFormValues) {
    // Parse grade value and calculate grade points
    const gradeValue = parseFloat(data.gradeValue.toString());
    const gradePoints = calculateGradePoints(data.creditHours, gradeValue);
    const gradeLetter = getGradeLetterFromValue(gradeValue);

    // Create course object
    const newCourse: CourseData = {
      name: data.name,
      creditHours: data.creditHours,
      grade: gradeLetter,
      gradeValue: gradeValue,
      gradePoints: gradePoints
    };

    try {
      // Add to server via mutation
      await addCourseMutation.mutateAsync(newCourse);
      
      // Reset form
      form.reset({
        name: "",
        creditHours: undefined,
        grade: "",
        gradeValue: undefined,
        gradePoints: undefined
      });
    } catch (error) {
      console.error("Failed to add course:", error);
    }
  }

  const handleRemoveCourse = (index: number) => {
    const newCourses = [...courses];
    newCourses.splice(index, 1);
    setCourses(newCourses);
    
    // Recalculate GPA if result is visible
    if (isResultVisible) {
      calculateGPA(newCourses);
    }
  };

  const calculateGPA = (coursesToCalculate: CourseData[] = courses) => {
    if (coursesToCalculate.length === 0) {
      toast({
        title: "No courses to calculate",
        description: "Please add at least one course",
        variant: "destructive",
      });
      return;
    }

    const result = calculateCumulativeGPA(coursesToCalculate);
    
    setCumulativeGpa(result.gpa);
    setTotalCreditHours(result.totalCreditHours);
    setTotalGradePoints(result.totalGradePoints);
    setIsResultVisible(true);
  };

  return (
    <div>
      <Card className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Calculate Cumulative GPA</h2>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-sm font-medium text-gray-700">Course Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Mathematics 101" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="creditHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Credit Hours</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0.5} 
                        step={0.5} 
                        placeholder="e.g. 3" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="gradeValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Grade</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseFloat(value))} 
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {gradeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="md:col-span-4 flex justify-end space-x-2">
                <Button 
                  type="submit" 
                  className="bg-accent hover:bg-green-700 text-white"
                  disabled={addCourseMutation.isPending}
                >
                  {addCourseMutation.isPending ? "Adding..." : "Add Course"}
                </Button>
              </div>
            </form>
          </Form>
          
          {isLoading ? (
            <div className="flex justify-center py-4">Loading courses...</div>
          ) : (
            <CourseList 
              courses={courses} 
              onCourseRemove={handleRemoveCourse} 
            />
          )}
          
          <div className="flex justify-end mb-6">
            <Button 
              onClick={() => calculateGPA()} 
              className="bg-primary hover:bg-blue-700 text-white"
              disabled={courses.length === 0}
            >
              Calculate Cumulative GPA
            </Button>
          </div>
          
          {isResultVisible && (
            <GpaResult 
              gpa={cumulativeGpa} 
              totalCreditHours={totalCreditHours} 
              totalGradePoints={totalGradePoints} 
              isCumulative={true} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
