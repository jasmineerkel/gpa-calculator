import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCourseSchema, insertSemesterSchema } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GpaResult } from "./gpa-result";
import { CourseList } from "./course-list";
import { CourseData, calculateCumulativeGPA, calculateGradePoints, getGradeLetterFromValue, gradeOptions } from "@/lib/gpa-calculator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Extended schema for frontend validation
const semesterFormSchema = insertSemesterSchema.extend({
  name: z.string().min(1, "Semester name is required"),
});

const courseFormSchema = insertCourseSchema.extend({
  name: z.string().min(1, "Course name is required"),
  creditHours: z.coerce
    .number()
    .min(0.5, "Credit hours must be at least 0.5")
    .max(10, "Credit hours must be at most 10"),
  gradeValue: z.coerce.number(),
});

type SemesterFormValues = z.infer<typeof semesterFormSchema>;
type CourseFormValues = z.infer<typeof courseFormSchema>;

// Type for semester with calculated GPA data
interface SemesterWithGPA {
  id: number;
  name: string;
  courses: CourseData[];
  gpa: number;
  totalCreditHours: number;
  totalGradePoints: number;
}

export function SemesterGpaCalculator() {
  const [semesters, setSemesters] = useState<SemesterWithGPA[]>([]);
  const [activeSemesterId, setActiveSemesterId] = useState<number | null>(null);
  const [isAddingSemester, setIsAddingSemester] = useState(false);
  const [expandedSemesters, setExpandedSemesters] = useState<number[]>([]);
  
  const { toast } = useToast();

  // Fetch semesters from the server
  const { data: fetchedSemesters, isLoading: isLoadingSemesters } = useQuery({
    queryKey: ["/api/semesters"],
    refetchOnWindowFocus: false,
  });

  // Get courses for all semesters
  const { data: allCourses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ["/api/courses"],
    refetchOnWindowFocus: false,
  });

  // Effect to merge semesters and courses and calculate GPA for each semester
  useEffect(() => {
    if (fetchedSemesters && allCourses) {
      const semestersArray = Array.isArray(fetchedSemesters) ? fetchedSemesters : [fetchedSemesters];
      const coursesArray = Array.isArray(allCourses) ? allCourses : [];
      
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
      
      // Set active semester to first one if we don't have one set
      if (activeSemesterId === null && newSemesters.length > 0) {
        setActiveSemesterId(newSemesters[0].id);
        setExpandedSemesters([newSemesters[0].id]);
      }
    }
  }, [fetchedSemesters, allCourses, activeSemesterId]);

  // Add semester mutation
  const addSemesterMutation = useMutation({
    mutationFn: async (semesterData: any) => {
      const response = await apiRequest("POST", "/api/semesters", semesterData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
      setIsAddingSemester(false);
      setActiveSemesterId(data.id);
      setExpandedSemesters([...expandedSemesters, data.id]);
      toast({
        title: "Semester added",
        description: "The semester has been added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add the semester",
        variant: "destructive",
      });
    }
  });

  // Add course mutation
  const addCourseMutation = useMutation({
    mutationFn: async ({ courseData, semesterId }: { courseData: any, semesterId: number }) => {
      const response = await apiRequest("POST", "/api/courses", {
        ...courseData,
        semesterId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      courseForm.reset({
        name: "",
        creditHours: undefined,
        grade: "",
        gradeValue: undefined,
        gradePoints: undefined
      });
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

  // Delete semester mutation
  const deleteSemesterMutation = useMutation({
    mutationFn: async (semesterId: number) => {
      const response = await apiRequest("DELETE", `/api/semesters/${semesterId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Semester deleted",
        description: "The semester has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete the semester",
        variant: "destructive",
      });
    }
  });

  // Forms
  const semesterForm = useForm<SemesterFormValues>({
    resolver: zodResolver(semesterFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const courseForm = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      name: "",
      creditHours: undefined,
      grade: "",
      gradeValue: undefined,
      gradePoints: undefined
    },
  });

  // Form submit handlers
  async function onSubmitSemester(data: SemesterFormValues) {
    try {
      await addSemesterMutation.mutateAsync(data);
      semesterForm.reset();
    } catch (error) {
      console.error("Failed to add semester:", error);
    }
  }

  async function onSubmitCourse(data: CourseFormValues) {
    if (!activeSemesterId) {
      toast({
        title: "No semester selected",
        description: "Please select or create a semester first",
        variant: "destructive",
      });
      return;
    }
    
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
      gradePoints: gradePoints
    };

    try {
      // Add to server via mutation
      await addCourseMutation.mutateAsync({ 
        courseData: newCourse, 
        semesterId: activeSemesterId 
      });
    } catch (error) {
      console.error("Failed to add course:", error);
    }
  }

  const handleRemoveCourse = (index: number, courseId?: number) => {
    // This is handled in the CourseList component
  };

  const handleDeleteSemester = async (semesterId: number) => {
    if (semesterId === 1) {
      toast({
        title: "Cannot delete default semester",
        description: "The default 'Unsorted' semester cannot be deleted",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await deleteSemesterMutation.mutateAsync(semesterId);
      
      // If active semester was deleted, set first available as active
      if (activeSemesterId === semesterId) {
        setActiveSemesterId(semesters.find(s => s.id !== semesterId)?.id || null);
      }
    } catch (error) {
      console.error("Failed to delete semester:", error);
    }
  };
  
  const toggleSemesterExpansion = (semesterId: number) => {
    // This function now handled by the Accordion component
  };
  
  const allCoursesCount = semesters.reduce((total, semester) => total + semester.courses.length, 0);
  const allCreditHours = semesters.reduce((total, semester) => total + semester.totalCreditHours, 0);
  const allGradePoints = semesters.reduce((total, semester) => total + semester.totalGradePoints, 0);
  const overallGPA = allCreditHours > 0 ? allGradePoints / allCreditHours : 0;

  return (
    <div>
      <Card className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Calculate Semester GPA</h2>
          
          {/* Add Semester Form */}
          {isAddingSemester ? (
            <div className="mb-6 border p-4 rounded-lg bg-gray-50">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Add New Semester</h3>
              <Form {...semesterForm}>
                <form onSubmit={semesterForm.handleSubmit(onSubmitSemester)} className="grid grid-cols-1 gap-4">
                  <FormField
                    control={semesterForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Semester Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. Fall 2025" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setIsAddingSemester(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-accent hover:bg-green-700 text-white"
                      disabled={addSemesterMutation.isPending}
                    >
                      {addSemesterMutation.isPending ? "Adding..." : "Add Semester"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          ) : (
            <div className="mb-6 flex justify-between items-center">
              <div className="flex items-center">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Tip:</span> "Unsorted" is the default semester for courses without a specified semester. You can rename it.
                </p>
              </div>
              <Button 
                onClick={() => setIsAddingSemester(true)} 
                className="bg-primary hover:bg-blue-700 text-white font-medium"
              >
                Add New Semester
              </Button>
            </div>
          )}
          
          {/* Loading State */}
          {(isLoadingSemesters || isLoadingCourses) && (
            <div className="flex justify-center py-8">Loading semesters and courses...</div>
          )}
          
          {/* Semester List */}
          {!isLoadingSemesters && !isLoadingCourses && (
            <>
              {semesters.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  No semesters yet. Add your first semester to get started.
                </div>
              ) : (
                <div className="mb-6">
                  <Accordion 
                type="multiple" 
                value={expandedSemesters.map(String)}
                onValueChange={(values) => setExpandedSemesters(values.map(Number))}
              >
                    {semesters.map((semester) => (
                      <AccordionItem key={semester.id} value={String(semester.id)}>
                        <div className="flex items-center justify-between">
                          <AccordionTrigger 
                            className="text-md font-medium py-4"
                          >
                            {semester.name} 
                            <span className="ml-2 text-sm text-gray-500">
                              ({semester.courses.length} courses) - GPA: {semester.gpa.toFixed(2)}
                            </span>
                          </AccordionTrigger>
                          <div className="flex space-x-2 mr-4">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setActiveSemesterId(semester.id)}
                              className={activeSemesterId === semester.id ? "bg-blue-100" : ""}
                            >
                              {activeSemesterId === semester.id ? "Selected" : "Select"}
                            </Button>
                            {semester.id !== 1 && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteSemester(semester.id)}
                                disabled={deleteSemesterMutation.isPending}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                        <AccordionContent>
                          {/* Semester GPA data */}
                          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">Total Courses: {semester.courses.length}</p>
                                <p className="text-sm text-gray-600">Total Credit Hours: {semester.totalCreditHours}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Total Grade Points: {semester.totalGradePoints.toFixed(1)}</p>
                                <p className="text-sm text-gray-600">Semester GPA: {semester.gpa.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Course list for this semester */}
                          <CourseList 
                            courses={semester.courses} 
                            onCourseRemove={handleRemoveCourse} 
                          />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}
              
              {/* Active Semester Course Form */}
              {activeSemesterId && (
                <div className="mb-6 border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    Add Course to {semesters.find(s => s.id === activeSemesterId)?.name || 'Selected Semester'}
                  </h3>
                  <Form {...courseForm}>
                    <form onSubmit={courseForm.handleSubmit(onSubmitCourse)} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField
                        control={courseForm.control}
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
                        control={courseForm.control}
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
                        control={courseForm.control}
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
                </div>
              )}
              
              {/* Overall Cumulative GPA */}
              {allCoursesCount > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Cumulative GPA (All Semesters)</h3>
                  <GpaResult 
                    gpa={overallGPA} 
                    totalCreditHours={allCreditHours} 
                    totalGradePoints={allGradePoints} 
                    isCumulative={true} 
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}