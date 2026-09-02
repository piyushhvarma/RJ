import { UserRole } from '@prisma/client';
export interface AuthenticatedUser {
    id: string;
    employeeCode: string;
    role: UserRole;
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
