import { Project, PaginatedResult, PaginationParams } from './project.entity';

export interface IProjectRepository {
    /**
     * Register a new project or update existing one
     */
    save(project: Project): Promise<Project>;

    /**
     * Find a project by its name (unique identifier)
     */
    findByName(name: string): Promise<Project | null>;

    /**
     * Find all projects with pagination
     */
    findAll(params: PaginationParams): Promise<PaginatedResult<Project>>;

    /**
     * Delete a project by name
     */
    delete(name: string): Promise<boolean>;

    /**
     * Initialize the repository (create tables, etc.)
     */
    onModuleInit(): Promise<void>;
}
