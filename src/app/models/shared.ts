// **COMPLETE FILE** - models/shared.model.ts
// RESPONSIBILITY: Types and constants used across multiple domains only
// DOES NOT: Handle domain-specific models or utilities
// CALLED BY: Multiple services and components for common types

// Archive filter enumeration (matches backend ArchiveFilter)
export enum ArchiveFilter {
    Active = 0,
    Archived = 1,
    All = 2
}

// Tree node types for navigation (used in multiple domains)
export type NodeType = 'Course' | 'Topic' | 'SubTopic' | 'Lesson';

// Selection source tracking (used across calendar and tree)
export type SelectionSource = 'tree' | 'calendar' | 'api' | 'initial';

// Visibility levels for content (used across multiple entities)
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