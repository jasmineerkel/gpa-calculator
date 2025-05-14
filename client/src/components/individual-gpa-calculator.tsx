import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GpaResult } from "./gpa-result";
import { getLetterGrade, gradeOptions } from "@/lib/gpa-calculator";

const individualGpaFormSchema = z.object({
  courseName: z.string().min(1, "Course name is required"),
  creditHours: z.coerce
    .number()
    .min(0.5, "Credit hours must be at least 0.5")
    .max(10, "Credit hours must be at most 10"),
  gradeValue: z.coerce.number().min(0, "Grade is required"),
});

type IndividualGpaFormValues = z.infer<typeof individualGpaFormSchema>;

export function IndividualGpaCalculator() {
  const [gpaResult, setGpaResult] = useState(0);
  const [letterGrade, setLetterGrade] = useState("");
  const [isResultVisible, setIsResultVisible] = useState(false);

  const form = useForm<IndividualGpaFormValues>({
    resolver: zodResolver(individualGpaFormSchema),
    defaultValues: {
      courseName: "",
      creditHours: undefined,
      gradeValue: undefined,
    },
  });

  function onSubmit(data: IndividualGpaFormValues) {
    // Make sure we have a valid number
    let gradeValue = data.gradeValue;
    if (isNaN(gradeValue)) {
      gradeValue = 0;
    }
    
    setGpaResult(gradeValue);
    setLetterGrade(getLetterGrade(gradeValue));
    setIsResultVisible(true);
  }

  return (
    <div>
      <Card className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Calculate Individual Course GPA</h2>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="courseName"
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
              
              <div className="md:col-span-4 flex justify-end">
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-blue-700 text-white"
                >
                  Calculate GPA
                </Button>
              </div>
            </form>
          </Form>
          
          {isResultVisible && (
            <GpaResult 
              gpa={gpaResult} 
              letterGrade={letterGrade} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
