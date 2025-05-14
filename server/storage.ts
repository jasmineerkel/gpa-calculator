import { 
  courses, type Course, type InsertCourse, 
  users, type User, type InsertUser,
  semesters, type Semester, type InsertSemester 
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Semester methods
  getSemesters(): Promise<Semester[]>;
  getSemesterById(id: number): Promise<Semester | undefined>;
  createSemester(semester: InsertSemester): Promise<Semester>;
  updateSemesterName(id: number, name: string): Promise<Semester | undefined>;
  deleteSemester(id: number): Promise<boolean>;
  
  // Course methods
  getCourses(): Promise<Course[]>;
  getCoursesBySemesterId(semesterId: number): Promise<Course[]>;
  getCourseById(id: number): Promise<Course | undefined>;
  createCourse(course: InsertCourse, semesterId?: number): Promise<Course>;
  deleteCourse(id: number): Promise<boolean>;
  deleteAllCourses(): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private semesterData: Map<number, Semester>;
  private courseData: Map<number, Course>;
  userCurrentId: number;
  semesterCurrentId: number;
  courseCurrentId: number;

  constructor() {
    this.users = new Map();
    this.semesterData = new Map();
    this.courseData = new Map();
    this.userCurrentId = 1;
    this.semesterCurrentId = 1;
    this.courseCurrentId = 1;
    
    // Create a default semester for unsorted courses
    this.createSemester({ name: "Unsorted" });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Semester methods
  async getSemesters(): Promise<Semester[]> {
    return Array.from(this.semesterData.values());
  }

  async getSemesterById(id: number): Promise<Semester | undefined> {
    return this.semesterData.get(id);
  }

  async createSemester(insertSemester: InsertSemester): Promise<Semester> {
    const id = this.semesterCurrentId++;
    const semester: Semester = {
      ...insertSemester,
      id,
      userId: 1  // Default userId since we're not implementing auth
    };
    
    this.semesterData.set(id, semester);
    return semester;
  }

  async updateSemesterName(id: number, name: string): Promise<Semester | undefined> {
    const semester = this.semesterData.get(id);
    
    if (!semester) {
      return undefined;
    }
    
    const updatedSemester: Semester = {
      ...semester,
      name
    };
    
    this.semesterData.set(id, updatedSemester);
    return updatedSemester;
  }

  async deleteSemester(id: number): Promise<boolean> {
    // First check if there are courses in this semester
    const semesterCourses = await this.getCoursesBySemesterId(id);
    
    // If there are courses, move them to the default semester (id: 1)
    for (const course of semesterCourses) {
      const updatedCourse: Course = {
        ...course,
        semesterId: 1  // Move to default semester
      };
      this.courseData.set(course.id, updatedCourse);
    }
    
    return this.semesterData.delete(id);
  }

  // Course methods
  async getCourses(): Promise<Course[]> {
    return Array.from(this.courseData.values());
  }
  
  async getCoursesBySemesterId(semesterId: number): Promise<Course[]> {
    return Array.from(this.courseData.values()).filter(
      (course) => course.semesterId === semesterId
    );
  }

  async getCourseById(id: number): Promise<Course | undefined> {
    return this.courseData.get(id);
  }

  async createCourse(insertCourse: InsertCourse, semesterId: number = 1): Promise<Course> {
    const id = this.courseCurrentId++;
    const course: Course = { 
      ...insertCourse, 
      id, 
      semesterId,
      userId: 1  // Default userId since we're not implementing auth
    };
    
    this.courseData.set(id, course);
    return course;
  }

  async deleteCourse(id: number): Promise<boolean> {
    return this.courseData.delete(id);
  }

  async deleteAllCourses(): Promise<boolean> {
    this.courseData.clear();
    return true;
  }
}

export const storage = new MemStorage();
