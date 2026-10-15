import { UserRole } from "./enums";

export interface UserResponse {
    id: string;
    login: string;
    displayName: string | null;
    roles: UserRole[];
    createdAtUtc: string;
}

export interface LoginResult {
    accessToken: string;
    expiresAtUtc: string;
    user: UserResponse;
}