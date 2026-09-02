import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            employeeCode: string;
            name: string;
            role: import("@prisma/client").$Enums.UserRole;
        };
    }>;
}
