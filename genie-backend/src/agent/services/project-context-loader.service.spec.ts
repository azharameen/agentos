import { Test, TestingModule } from "@nestjs/testing";
import { ProjectContextLoaderService } from "./project-context-loader.service";
import {
  ProjectType,
  ProjectRegistration,
} from "../../shared/project.interface";

// Mock the fs/promises module properly
jest.mock("fs/promises", () => ({
  promises: {
    stat: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
  },
  stat: jest.fn(),
  readdir: jest.fn(),
  readFile: jest.fn(),
}));

describe("ProjectContextLoaderService", () => {
  let service: ProjectContextLoaderService;
  let fs: any;

  beforeEach(async () => {
    // Get the mocked fs module
    fs = require("fs/promises");

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectContextLoaderService],
    }).compile();

    service = module.get<ProjectContextLoaderService>(
      ProjectContextLoaderService,
    );

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("loadProjectContext", () => {
    it("should successfully load project context for a NestJS project", async () => {
      const registration: ProjectRegistration = {
        name: "test-backend",
        path: "d:\\test\\path",
        registeredAt: new Date(),
      };

      // Mock fs operations
      fs.stat.mockResolvedValue({
        isDirectory: () => true,
        mtime: new Date(),
        size: 1024,
      });

      fs.readdir.mockResolvedValue([
        { name: "package.json", isFile: () => true, isDirectory: () => false },
        { name: "src", isFile: () => false, isDirectory: () => true },
      ]);

      fs.readFile.mockImplementation((filePath: string) => {
        if (filePath.includes("package.json")) {
          return Promise.resolve(
            JSON.stringify({
              name: "test-backend",
              version: "1.0.0",
              dependencies: {
                "@nestjs/core": "^10.0.0",
              },
            }),
          );
        }
        return Promise.reject(new Error("File not found"));
      });

      const context = await service.loadProjectContext(registration);

      expect(context).toBeDefined();
      expect(context.registration.name).toBe("test-backend");
      expect(context.registration.type).toBe(ProjectType.NESTJS_BACKEND);
      expect(context.packageJson).toBeDefined();
      expect(context.packageJson?.name).toBe("test-backend");
    });

    it("should throw error for invalid path", async () => {
      const registration: ProjectRegistration = {
        name: "invalid-project",
        path: "/invalid/path",
        registeredAt: new Date(),
      };

      (fs.stat as jest.Mock).mockRejectedValue(new Error("Path not found"));

      await expect(service.loadProjectContext(registration)).rejects.toThrow();
    });

    it("should cache project context", async () => {
      const registration: ProjectRegistration = {
        name: "test-project",
        path: "/test/path",
        registeredAt: new Date(),
      };

      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => true,
      });

      (fs.readdir as jest.Mock).mockResolvedValue([]);

      await service.loadProjectContext(registration);

      const cached = service.getCachedContext("test-project");
      expect(cached).toBeDefined();
      expect(cached?.registration.name).toBe("test-project");
    });

    it("should invalidate cache", async () => {
      const registration: ProjectRegistration = {
        name: "test-project",
        path: "/test/path",
        registeredAt: new Date(),
      };

      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => true,
      });

      (fs.readdir as jest.Mock).mockResolvedValue([]);

      await service.loadProjectContext(registration);
      service.invalidateCache("test-project");

      const cached = service.getCachedContext("test-project");
      expect(cached).toBeUndefined();
    });
  });

  describe("detectProjectType", () => {
    it("should detect Next.js projects", async () => {
      const registration: ProjectRegistration = {
        name: "test-frontend",
        path: "/test/path",
        registeredAt: new Date(),
      };

      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => true,
      });

      (fs.readdir as jest.Mock).mockResolvedValue([
        { name: "package.json", isFile: () => true, isDirectory: () => false },
      ]);

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({
          name: "test-frontend",
          dependencies: {
            next: "^14.0.0",
            react: "^18.0.0",
          },
        }),
      );

      const context = await service.loadProjectContext(registration);

      expect(context.registration.type).toBe(ProjectType.NEXTJS_FRONTEND);
    });
  });
});
