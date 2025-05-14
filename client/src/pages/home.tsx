import { useState } from "react";
import { IndividualGpaCalculator } from "@/components/individual-gpa-calculator";
import { CumulativeGpaCalculator } from "@/components/cumulative-gpa-calculator";
import { SemesterGpaCalculator } from "@/components/semester-gpa-calculator";
import { cn } from "@/lib/utils";

type TabType = 'individual' | 'semester' | 'cumulative';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('individual');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">GPA Calculator</h1>
      
      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            className={cn(
              "px-5 py-2.5 text-sm font-medium focus:z-10 focus:ring-2 focus:ring-primary rounded-l-lg",
              activeTab === 'individual' 
                ? "bg-primary text-white" 
                : "bg-gray-200 text-gray-700"
            )}
            onClick={() => setActiveTab('individual')}
          >
            Individual Course GPA
          </button>
          <button
            type="button"
            className={cn(
              "px-5 py-2.5 text-sm font-medium focus:z-10 focus:ring-2 focus:ring-primary",
              activeTab === 'semester' 
                ? "bg-primary text-white" 
                : "bg-gray-200 text-gray-700"
            )}
            onClick={() => setActiveTab('semester')}
          >
            Semester GPA
          </button>
          <button
            type="button"
            className={cn(
              "px-5 py-2.5 text-sm font-medium rounded-r-lg focus:z-10 focus:ring-2 focus:ring-primary",
              activeTab === 'cumulative' 
                ? "bg-primary text-white" 
                : "bg-gray-200 text-gray-700"
            )}
            onClick={() => setActiveTab('cumulative')}
          >
            Cumulative GPA
          </button>
        </div>
      </div>
      
      {/* Calculator Components */}
      <div className={activeTab === 'individual' ? 'block' : 'hidden'}>
        <IndividualGpaCalculator />
      </div>
      <div className={activeTab === 'semester' ? 'block' : 'hidden'}>
        <SemesterGpaCalculator />
      </div>
      <div className={activeTab === 'cumulative' ? 'block' : 'hidden'}>
        <CumulativeGpaCalculator />
      </div>
    </div>
  );
}
