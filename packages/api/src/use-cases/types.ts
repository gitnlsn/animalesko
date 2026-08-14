/**
 * Every use case is a class with a single `execute` method taking one command
 * object.
 *
 * A single argument, rather than positional parameters, is what lets the actor
 * travel with the request data: `{ actorId, data }` instead of an ambient
 * "current user" the use case could read from somewhere else. A use case can
 * only act on behalf of whoever the caller names explicitly.
 */
export interface UseCase<TCommand, TResult> {
  execute(command: TCommand): Promise<TResult>;
}

/** Commands issued by a signed-in person. */
export interface ActorCommand {
  actorId: string;
}

/** Commands issued on behalf of an organization the caller belongs to. */
export interface OrganizationCommand {
  organizationId: string;
}
