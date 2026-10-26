var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, UnauthorizedException, } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service.js';
let JwtAuthGuard = class JwtAuthGuard {
    jwtService;
    prisma;
    constructor(jwtService, prisma) {
        this.jwtService = jwtService;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];
        let token;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.slice('Bearer '.length);
        }
        else if (request.query && typeof request.query.token === 'string' && request.query.token.length > 0) {
            token = request.query.token;
        }
        else if (request.cookies && typeof request.cookies.gl_token === 'string' && request.cookies.gl_token.length > 0) {
            token = request.cookies.gl_token;
        }
        if (!token) {
            throw new UnauthorizedException('Authentication required: Missing session token in header, query param, or cookie');
        }
        try {
            const payload = await this.jwtService.verifyAsync(token);
            let userId = payload.sub;
            let userRole = payload.role;
            if (payload.employeeCode) {
                try {
                    const userInActiveBook = await this.prisma.user.findUnique({
                        where: { employeeCode: payload.employeeCode },
                        select: { id: true, role: true, active: true },
                    });
                    if (userInActiveBook && userInActiveBook.active) {
                        userId = userInActiveBook.id;
                        userRole = userInActiveBook.role;
                    }
                }
                catch { }
            }
            request.user = {
                id: userId,
                employeeCode: payload.employeeCode,
                role: userRole,
            };
            return true;
        }
        catch {
            throw new UnauthorizedException('Invalid or expired session');
        }
    }
};
JwtAuthGuard = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [JwtService,
        PrismaService])
], JwtAuthGuard);
export { JwtAuthGuard };
//# sourceMappingURL=jwt-auth.guard.js.map