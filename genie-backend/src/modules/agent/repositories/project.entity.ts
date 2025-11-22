import { ProjectType } from '../../../shared/project.interface';

export class Project {
    id?: number;
    name: string;
    path: string;
    type: ProjectType;
    fileCount: number;
    mainLanguage: string;
    hasTests: boolean;
    framework?: string;
    lastScanned: Date;
    createdAt?: Date;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface PaginationParams {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
