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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  semesterId: z.number().optional(),
});

type CumulativeGpaFormValues = z.infer<typeof cumulativeGpaFormSchema>;

// Type for semester with calculated GPA data
interface SemesterWithGPA {
  id: number;
  name: string;
  courses: CourseData[];
  gpa: number;
  totalCreditHours: number;
  totalGradePoints: number;
}

export function CumulativeGpaCalculator() {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [semesters, setSemesters] = useState<SemesterWithGPA[]>([]);
  const [cumulativeGpa, setCumulativeGpa] = useState(0);
  const [totalCreditHours, setTotalCreditHours] = useState(0);
  const [totalGradePoints, setTotalGradePoints] = useState(0);
  const [isResultVisible, setIsResultVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"courses" | "semesters">("courses");
  
  const { toast } = useToast();

  // Fetch courses from the server
  const { data: fetchedCourses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ["/api/courses"],
    refetchOnWindowFocus: false,
  });

  // Fetch semesters from the server
  const { data: fetchedSemesters, isLoading: isLoadingSemesters } = useQuery({
    queryKey: ["/api/semesters"],
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (fetchedCourses) {
      setCourses(fetchedCourses);
    }
  }, [fetchedCourses]);

  // Effect to merge semesters and courses and calculate GPA for each semester
  useEffect(() => {
    if (fetchedSemesters && fetchedCourses) {
      const semestersArray = Array.isArray(fetchedSemesters) ? fetchedSemesters : [fetchedSemesters];
      const coursesArray = Array.isArray(fetchedCourses) ? fetchedCourses : [];
      
      const newSemesters: SemesterWithGPA[] = semestersArray.map((semester: any) => {
        const semesterCourses = coursesArray.filter((course: any) => course.semesterId === semester.id);
        const gpaResults = calculateCumulativeGPA(semesterCourses);
        
        return {
          id: semester.id,
          name: semester.name,
          courses: semesterCourses,
          gpa: gpaResults.gpa,
          totalCreditHours: gpaResults.totalCreditHours,
          totalGradePoints: gpaResults.totalGradePoints,
        };
      });
      
      setSemesters(newSemesters);
    }
  }, [fetchedSemesters, fetchedCourses]);

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
      gradePoints: undefined,
      semesterId: 1 // Default to "Unsorted" semester
    },
  });

  async function onSubmit(data: CumulativeGpaFormValues) {
    // Parse grade value and calculate grade points
    const gradeValue = parseFloat(data.gradeValue.toString());
    const gradePoints = calculateGradePoints(data.creditHours, gradeValue);
    const gradeLetter = getGradeLetterFromValue(gradeValue);

    // Create course object
    const newCourse = {
      name: data.name,
      creditHours: data.creditHours,
      grade: gradeLetter,
      gradeValue: gradeValue,
      gradePoints: gradePoints,
      semesterId: data.semesterId || 1
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
        gradePoints: undefined,
        semesterId: data.semesterId
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

  // Calculate the overall GPA from all semesters
  const calculateOverallGPA = () => {
    if (semesters.length === 0) {
      toast({
        title: "No semesters to calculate",
        description: "Please add courses to at least one semester",
        variant: "destructive",
      });
      return;
    }

    const allCourses = semesters.flatMap(semester => semester.courses);
    
    // If we don't have any courses yet
    if (allCourses.length === 0) {
      toast({
        title: "No courses to calculate",
        description: "Please add at least one course",
        variant: "destructive",
      });
      return;
    }

    const result = calculateCumulativeGPA(allCourses);
    
    setCumulativeGpa(result.gpa);
    setTotalCreditHours(result.totalCreditHours);
    setTotalGradePoints(result.totalGradePoints);
    setIsResultVisible(true);
  };

  const isLoading = isLoadingCourses || isLoadingSemesters;

  return (
    <div>
      <Card className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Calculate Cumulative GPA</h2>
          
          <Tabs defaultValue="courses" onValueChange={(value) => setActiveTab(value as "courses" | "semesters")}>
            <TabsList className="mb-6">
              <TabsTrigger value="courses">Add Individual Courses</TabsTrigger>
              <TabsTrigger value="semesters">View By Semesters</TabsTrigger>
            </TabsList>
            
            <TabsContent value="courses">
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
                  
                  <FormField
                    control={form.control}
                    name="semesterId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-4">
                        <FormLabel className="text-sm font-medium text-gray-700">Semester</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value?.toString() || "1"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Semester" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {semesters.map((semester) => (
                              <SelectItem key={semester.id} value={semester.id.toString()}>
                                {semester.name}
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
            </TabsContent>
            
            <TabsContent value="semesters">
              {isLoading ? (
                <div className="flex justify-center py-4">Loading semesters...</div>
              ) : (
                <>
                  {semesters.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      No semesters yet. Add your first semester in the Semester GPA tab.
                    </div>
                  ) : (
                    <div className="mb-6">
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full border-collapse table-auto">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left text-sm font-semibold text-gray-700 p-3">Semester</th>
                              <th className="text-left text-sm font-semibold text-gray-700 p-3">Courses</th>
                              <th className="text-left text-sm font-semibold text-gray-700 p-3">Credit Hours</th>
                              <th className="text-left text-sm font-semibold text-gray-700 p-3">Grade Points</th>
                              <th className="text-left text-sm font-semibold text-gray-700 p-3">GPA</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {semesters.map((semester) => (
                              <tr key={semester.id} className="hover:bg-gray-50">
                                <td className="p-3 text-sm text-gray-700">{semester.name}</td>
                                <td className="p-3 text-sm text-gray-700">{semester.courses.length}</td>
                                <td className="p-3 text-sm text-gray-700">{semester.totalCreditHours}</td>
                                <td className="p-3 text-sm text-gray-700">{semester.totalGradePoints.toFixed(1)}</td>
                                <td className="p-3 text-sm text-gray-700 font-bold">{semester.gpa.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end mb-6">
            {activeTab === "courses" ? (
              <Button 
                onClick={() => calculateGPA()} 
                className="bg-primary hover:bg-blue-700 text-white"
                disabled={courses.length === 0}
              >
                Calculate GPA from Individual Courses
              </Button>
            ) : (
              <Button 
                onClick={() => calculateOverallGPA()} 
                className="bg-primary hover:bg-blue-700 text-white"
                disabled={semesters.length === 0}
              >
                Calculate Overall GPA from All Semesters
              </Button>
            )}
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
