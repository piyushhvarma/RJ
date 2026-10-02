import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice('Bearer '.length);
    } else if (request.query && typeof request.query.token === 'string' && request.query.token.length > 0) {
      token = request.query.token;
    } else if (request.cookies && typeof request.cookies.gl_token === 'string' && request.cookies.gl_token.length > 0) {
      token = request.cookies.gl_token;
    }

    if (!token) {
      throw new UnauthorizedException('Authentication required: Missing session token in header, query param, or cookie');
    }

    try {
      // Every privileged mutation in this app writes an AuditLog row keyed
      // to request.user.id, so a forged/expired token must never reach a
      // handler (§85 — authorization is enforced server-side, not by the UI).
      const payload = await this.jwtService.verifyAsync(token);
      request.user = {
        id: payload.sub,
        employeeCode: payload.employeeCode,
        role: payload.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
