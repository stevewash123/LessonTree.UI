export interface User {
    username: string;
    fullName: string; // Added to match the first interface
    district: number | null;
    roles: string[];
    claims?: { [key: string]: string | string[] }; // Claims as a key-value pair, where values can be strings or arrays of strings
}