import { courses, type Course, type InsertCourse, users, type User, type InsertUser } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Course methods
  getCourses(): Promise<Course[]>;
  getCourseById(id: number): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  deleteCourse(id: number): Promise<boolean>;
  deleteAllCourses(): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private courseData: Map<number, Course>;
  userCurrentId: number;
  courseCurrentId: number;

  constructor() {
    this.users = new Map();
    this.courseData = new Map();
    this.userCurrentId = 1;
    this.courseCurrentId = 1;
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

  async getCourses(): Promise<Course[]> {
    return Array.from(this.courseData.values());
  }

  async getCourseById(id: number): Promise<Course | undefined> {
    return this.courseData.get(id);
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const id = this.courseCurrentId++;
    const course: Course = { 
      ...insertCourse, 
      id, 
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
