import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema } from './auth.schema';
import { sendSuccess } from '../../shared/response';

const COOKIE_NAME = 'refreshToken';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export class AuthController {
  private setRefreshCookie(res: Response, token: string) {
    const isSecure = process.env.REFRESH_COOKIE_SECURE === 'true';
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
    });
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await authService.register(validated);
      this.setRefreshCookie(res, result.refreshToken);
      return sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 201);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await authService.login(validated);
      this.setRefreshCookie(res, result.refreshToken);
      return sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 200);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.[COOKIE_NAME] || req.body?.refreshToken;
      const result = await authService.refresh(token);
      this.setRefreshCookie(res, result.refreshToken);
      return sendSuccess(res, { accessToken: result.accessToken }, 200);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.[COOKIE_NAME] || req.body?.refreshToken;
      await authService.logout(token);
      res.clearCookie(COOKIE_NAME);
      return sendSuccess(res, { message: 'Đăng xuất thành công' }, 200);
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.getMe(req.user!.id);
      return sendSuccess(res, user, 200);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateProfileSchema.parse(req.body);
      const user = await authService.updateProfile(req.user!.id, validated);
      return sendSuccess(res, user, 200);
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = changePasswordSchema.parse(req.body);
      await authService.changePassword(req.user!.id, validated);
      res.clearCookie(COOKIE_NAME);
      return sendSuccess(res, { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại' }, 200);
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
export default authController;
