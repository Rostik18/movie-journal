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

export interface CreateUserRequest {
    login: string;
    displayName?: string | null;
    roles: UserRole[];
    password: string;
}

export interface UpdateUserRequest {
    userId: string;
    login?: string | null;
    displayName?: string | null;
    roles?: UserRole[] | null;
}

export interface ChangePasswordRequest {
    userId: string;
    newPassword: string;
}
