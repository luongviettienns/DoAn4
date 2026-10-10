import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  googleLoginSchema,
  completeGoogleRegistrationSchema,
} from './auth.schema';
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
      path: '/api/v1/auth',
      maxAge: COOKIE_MAX_AGE,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/api/v1/auth' });
    res.clearCookie(COOKIE_NAME, { path: '/' });
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
      this.clearRefreshCookie(res);
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
      this.clearRefreshCookie(res);
      return sendSuccess(res, { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại' }, 200);
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(email);
      return sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = resetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(validated);
      this.clearRefreshCookie(res);
      return sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = verifyEmailSchema.parse(req.body);
      const result = await authService.verifyEmail(token);
      return sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  resendVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const result = await authService.resendVerification(email);
      return sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  googleLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = googleLoginSchema.parse(req.body);
      const result = await authService.googleLogin(validated);
      if (!result.requirePhone && result.refreshToken) {
        this.setRefreshCookie(res, result.refreshToken);
        return sendSuccess(res, { requirePhone: false, user: result.user, accessToken: result.accessToken }, 200);
      }
      return sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  completeGoogleRegistration = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = completeGoogleRegistrationSchema.parse(req.body);
      const result = await authService.completeGoogleRegistration(validated);
      this.setRefreshCookie(res, result.refreshToken);
      return sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 201);
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
export default authController;
