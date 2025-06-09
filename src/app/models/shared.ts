// RESPONSIBILITY: Generic shared models and utilities used across multiple domains
// DOES NOT: Handle period logic (see period-assignments.ts) or user data (see user.ts)
// CALLED BY: Multiple services and components for common utilities

// Archive filter enumeration (matches backend ArchiveFilter)
export enum ArchiveFilter {
    Active = 0,
    Archived = 1,
    All = 2
}

// Tree node types for navigation
export type NodeType = 'Course' | 'Topic' | 'SubTopic' | 'Lesson';

// Selection source tracking
export type SelectionSource = 'tree' | 'calendar' | 'api' | 'initial';

// Visibility levels for content
export enum VisibilityLevel {
    Private = 'Private',
    Public = 'Public',
    Shared = 'Shared'
}

// Generic ID conversion utilities
export interface IdConvertible {
    id: string | number;
}

// Generic type utilities
export type OptionalId<T extends { id: any }> = Omit<T, 'id'> & { id?: T['id'] };

// Common validation patterns
export function isValidId(id: any): boolean {
    return id !== null && id !== undefined && (typeof id === 'number' ? id > 0 : id.length > 0);
}

// Common array utilities
export function isNonEmptyArray<T>(arr: T[] | null | undefined): arr is T[] {
    return Array.isArray(arr) && arr.length > 0;
}