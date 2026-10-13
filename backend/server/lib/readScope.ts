import { Role } from '@prisma/client';
import { ForbiddenError, OfficeScopeError } from './errors';

export type ReadActor = { id: string; role: Role; officeId: string | null };

// Preserve the existing technical-role read boundary; this is not a six-persona policy.
export function requireReadScope(actor?: ReadActor): string | null {
  if (!actor) throw new ForbiddenError('Authentication required for scoped reads');
  if (actor.role !== Role.ENCODER) return null;
  if (!actor.officeId) throw new OfficeScopeError('Encoder has no assigned office');
  return actor.officeId;
}
