import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCourseSchema, insertSemesterSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for semester operations
  app.get("/api/semesters", async (req, res) => {
    try {
      const semesters = await storage.getSemesters();
      res.json(semesters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch semesters" });
    }
  });

  app.get("/api/semesters/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid semester ID" });
      }
      
      const semester = await storage.getSemesterById(id);
      
      if (!semester) {
        return res.status(404).json({ message: "Semester not found" });
      }
      
      res.json(semester);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch semester" });
    }
  });

  app.post("/api/semesters", async (req, res) => {
    try {
      const result = insertSemesterSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const semester = await storage.createSemester(result.data);
      res.status(201).json(semester);
    } catch (error) {
      res.status(500).json({ message: "Failed to create semester" });
    }
  });

  app.delete("/api/semesters/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid semester ID" });
      }
      
      // Don't allow deleting the default semester (id: 1)
      if (id === 1) {
        return res.status(400).json({ message: "Cannot delete the default semester" });
      }
      
      const success = await storage.deleteSemester(id);
      
      if (!success) {
        return res.status(404).json({ message: "Semester not found" });
      }
      
      res.status(200).json({ message: "Semester deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete semester" });
    }
  });

  // API routes for course operations
  app.get("/api/courses", async (req, res) => {
    try {
      const courses = await storage.getCourses();
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get("/api/semesters/:semesterId/courses", async (req, res) => {
    try {
      const semesterId = parseInt(req.params.semesterId);
      
      if (isNaN(semesterId)) {
        return res.status(400).json({ message: "Invalid semester ID" });
      }
      
      const courses = await storage.getCoursesBySemesterId(semesterId);
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses for semester" });
    }
  });

  app.post("/api/courses", async (req, res) => {
    try {
      const { semesterId, ...courseData } = req.body;
      const result = insertCourseSchema.safeParse(courseData);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const course = await storage.createCourse(result.data, semesterId || 1);
      res.status(201).json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  app.delete("/api/courses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid course ID" });
      }
      
      const success = await storage.deleteCourse(id);
      
      if (!success) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      res.status(200).json({ message: "Course deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  app.delete("/api/courses", async (req, res) => {
    try {
      const success = await storage.deleteAllCourses();
      res.status(200).json({ message: "All courses deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete courses" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
