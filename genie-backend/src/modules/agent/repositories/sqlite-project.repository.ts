import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { IProjectRepository } from './project.repository.interface';
import { Project, PaginatedResult, PaginationParams } from './project.entity';
import { DatabasePoolService } from '../../shared/database-pool.service';
import { ProjectType } from '../../../shared/project.interface';

@Injectable()
export class SqliteProjectRepository implements IProjectRepository, OnModuleInit {
    private readonly logger = new Logger(SqliteProjectRepository.name);
    private readonly POOL_NAME = 'projects';

    constructor(private readonly dbPool: DatabasePoolService) { }

    async onModuleInit() {
        await this.dbPool.createPool({
            name: this.POOL_NAME,
            path: './data/projects.sqlite',
            poolSize: 5,
            pragmas: { journal_mode: 'WAL' }
        });
        this.createSchema();
    }

    private createSchema() {
        const db = this.dbPool.getConnection(this.POOL_NAME);
        try {
            db.exec(`
        CREATE TABLE IF NOT EXISTS registered_projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          path TEXT NOT NULL,
          type TEXT,
          main_language TEXT,
          framework TEXT,
          file_count INTEGER,
          has_tests BOOLEAN,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_scanned DATETIME
        );
      `);
        } finally {
            this.dbPool.releaseConnection(this.POOL_NAME, db);
        }
    }

    async save(project: Project): Promise<Project> {
        const db = this.dbPool.getConnection(this.POOL_NAME);
        try {
            const stmt = db.prepare(`
        INSERT INTO registered_projects (
          name, path, type, main_language, framework, file_count, has_tests, last_scanned
        ) VALUES (
          @name, @path, @type, @mainLanguage, @framework, @fileCount, @hasTests, @lastScanned
        )
        ON CONFLICT(name) DO UPDATE SET
          path = excluded.path,
          type = excluded.type,
          main_language = excluded.main_language,
          framework = excluded.framework,
          file_count = excluded.file_count,
          has_tests = excluded.has_tests,
          last_scanned = excluded.last_scanned
        RETURNING *
      `);

            const row = stmt.get({
                name: project.name,
                path: project.path,
                type: project.type,
                mainLanguage: project.mainLanguage,
                framework: project.framework || null,
                fileCount: project.fileCount,
                hasTests: project.hasTests ? 1 : 0,
                lastScanned: project.lastScanned.toISOString()
            });

            return this.mapToEntity(row);
        } finally {
            this.dbPool.releaseConnection(this.POOL_NAME, db);
        }
    }

    async findByName(name: string): Promise<Project | null> {
        const db = this.dbPool.getConnection(this.POOL_NAME, true);
        try {
            const stmt = db.prepare('SELECT * FROM registered_projects WHERE name = ?');
            const row = stmt.get(name);
            return row ? this.mapToEntity(row) : null;
        } finally {
            this.dbPool.releaseConnection(this.POOL_NAME, db);
        }
    }

    async findAll(params: PaginationParams): Promise<PaginatedResult<Project>> {
        const db = this.dbPool.getConnection(this.POOL_NAME, true);
        try {
            const offset = (params.page - 1) * params.pageSize;
            const sortBy = params.sortBy || 'created_at';
            const sortOrder = params.sortOrder || 'desc';

            // Validate sort column to prevent SQL injection
            const allowedSorts = ['name', 'created_at', 'last_scanned', 'file_count'];
            const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'created_at';

            const countStmt = db.prepare('SELECT COUNT(*) as total FROM registered_projects');
            const result = countStmt.get() as { total: number };
            const total = result.total;

            const stmt = db.prepare(`
        SELECT * FROM registered_projects 
        ORDER BY ${safeSortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `);

            const rows = stmt.all(params.pageSize, offset);

            return {
                data: rows.map(row => this.mapToEntity(row)),
                total,
                page: params.page,
                pageSize: params.pageSize,
                totalPages: Math.ceil(total / params.pageSize)
            };
        } finally {
            this.dbPool.releaseConnection(this.POOL_NAME, db);
        }
    }

    async delete(name: string): Promise<boolean> {
        const db = this.dbPool.getConnection(this.POOL_NAME);
        try {
            const stmt = db.prepare('DELETE FROM registered_projects WHERE name = ?');
            const result = stmt.run(name);
            return result.changes > 0;
        } finally {
            this.dbPool.releaseConnection(this.POOL_NAME, db);
        }
    }

    private mapToEntity(row: any): Project {
        return {
            id: row.id,
            name: row.name,
            path: row.path,
            type: row.type as ProjectType,
            fileCount: row.file_count,
            mainLanguage: row.main_language,
            hasTests: Boolean(row.has_tests),
            framework: row.framework,
            lastScanned: new Date(row.last_scanned),
            createdAt: new Date(row.created_at)
        };
    }
}
