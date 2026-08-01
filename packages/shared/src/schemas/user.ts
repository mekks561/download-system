import { z } from 'zod';
import { UserRole } from '../enums';

export const UserSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string(),
  role: UserRole.default('user'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const UserCreateSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type UserCreate = z.infer<typeof UserCreateSchema>;

export const UserResponseSchema = UserSchema.omit({ password: true });
export type UserResponse = z.infer<typeof UserResponseSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type Login = z.infer<typeof LoginSchema>;
