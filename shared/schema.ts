import { pgTable, text, serial, numeric, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (keeping from original)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Semester schema for GPA calculation
export const semesters = pgTable("semesters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: serial("user_id").references(() => users.id),
});

export const insertSemesterSchema = createInsertSchema(semesters).omit({
  id: true,
  userId: true,
});

export type InsertSemester = z.infer<typeof insertSemesterSchema>;
export type Semester = typeof semesters.$inferSelect;

// Course schema for GPA calculation
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  creditHours: real("credit_hours").notNull(),
  grade: text("grade").notNull(),
  gradeValue: real("grade_value").notNull(),
  gradePoints: real("grade_points").notNull(),
  semesterId: serial("semester_id").references(() => semesters.id),
  userId: serial("user_id").references(() => users.id),
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  userId: true,
  semesterId: true,
});

export const gradeValues = {
  "A/A+": 4.0,
  "A-": 3.7,
  "B+": 3.3,
  "B": 3.0,
  "B-": 2.7,
  "C+": 2.3,
  "C": 2.0,
  "C-": 1.7,
  "D+": 1.3,
  "D": 1.0,
  "D-": 0.7,
  "F": 0.0,
};

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;
