// Pure helpers (no server-only import so they are unit-testable and usable in client code).
// Discord permission strings are 64-bit: always BigInt.

const ADMINISTRATOR = BigInt(0x8);
const MANAGE_GUILD = BigInt(0x20);
const MENTION_EVERYONE = BigInt(1) << BigInt(17);
const ZERO = BigInt(0);

function toBig(permissions: string | undefined | null): bigint {
  if (!permissions || !/^\d+$/.test(permissions)) return ZERO;
  return BigInt(permissions);
}

/** Same rule the bot applies: owner, Manage Server or Administrator. */
export function canManageGuild(owner: boolean, permissions: string | undefined | null): boolean {
  if (owner) return true;
  const p = toBig(permissions);
  return (p & MANAGE_GUILD) !== ZERO || (p & ADMINISTRATOR) !== ZERO;
}

/** "Mention @everyone, @here and All Roles" (1 << 17) or Administrator. */
export function canMentionEveryone(owner: boolean, permissions: string | undefined | null): boolean {
  if (owner) return true;
  const p = toBig(permissions);
  return (p & MENTION_EVERYONE) !== ZERO || (p & ADMINISTRATOR) !== ZERO;
}

export function isAdministrator(permissions: string | undefined | null): boolean {
  return (toBig(permissions) & ADMINISTRATOR) !== ZERO;
}

export const SNOWFLAKE_RE = /^\d{15,20}$/;
export const isSnowflake = (v: unknown): v is string => typeof v === "string" && SNOWFLAKE_RE.test(v);

export const HAS_EVERYONE_PING = /@(everyone|here)\b/i;

export interface MentionCheck {
  /** null = nobody, the guild's own id = @everyone, anything else = a role id. */
  roleId: string | null;
  guildId: string;
  roleMentionable?: boolean;
  customMessage?: string | null;
  owner: boolean;
  permissions: string | undefined | null;
}

/** Returns an error message when the person may not set this mention, otherwise null. */
export function mentionViolation(c: MentionCheck): string | null {
  const may = canMentionEveryone(c.owner, c.permissions);
  if (c.roleId === c.guildId && !may) {
    return "You need the “Mention @everyone, @here and All Roles” permission in this server to ping @everyone.";
  }
  if (c.roleId && c.roleId !== c.guildId && c.roleMentionable === false && !may) {
    return "That role can’t be mentioned by members. You need the “Mention @everyone, @here and All Roles” permission to ping it.";
  }
  if (c.customMessage && HAS_EVERYONE_PING.test(c.customMessage) && !may) {
    return "Messages can only contain @everyone or @here if you have the “Mention @everyone, @here and All Roles” permission.";
  }
  return null;
}
