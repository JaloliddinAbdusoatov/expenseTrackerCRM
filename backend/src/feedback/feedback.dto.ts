import { UserFeedback } from './user-feedback.entity';

export function toFeedbackItem(r: UserFeedback) {
  return {
    id: r.id,
    message: r.message,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    userId: r.user.id,
    username: r.user.username,
    email: r.user.email,
  };
}
