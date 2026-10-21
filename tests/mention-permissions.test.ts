import { describe, expect, it } from 'vitest';
import { PermissionFlagsBits as P } from 'discord.js';
import { canPost } from '../apps/bot/src/notifications';
import { ids } from './notification-fixtures';
const send = P.ViewChannel | P.SendMessages;
const mention = P.MentionEveryone;
type Overwrite = Parameters<typeof canPost>[4]['permission_overwrites'][number];
const overwrite = (id: string, type: number, allow = 0n, deny = 0n): Overwrite => ({
  id,
  type,
  allow: String(allow),
  deny: String(deny),
});
const cases: {
  name: string;
  base?: bigint;
  role?: bigint;
  overwrites?: Overwrite[];
  expected: boolean;
}[] = [
  { name: 'missing guild grant', expected: false },
  { name: 'everyone guild role grant', base: send | mention, expected: true },
  { name: 'assigned bot role grant', role: mention, expected: true },
  {
    name: 'channel everyone deny',
    role: mention,
    overwrites: [overwrite(ids.guild, 0, 0n, mention)],
    expected: false,
  },
  {
    name: 'assigned role allow overrides everyone deny',
    overwrites: [overwrite(ids.guild, 0, 0n, mention), overwrite(ids.role, 0, mention)],
    expected: true,
  },
  {
    name: 'combined role allow wins over role deny',
    overwrites: [overwrite(ids.role, 0, 0n, mention), overwrite(ids.botRole, 0, mention)],
    expected: true,
  },
  {
    name: 'member deny overrides role allow',
    role: mention,
    overwrites: [overwrite(ids.bot, 1, 0n, mention)],
    expected: false,
  },
  {
    name: 'member allow overrides role deny',
    overwrites: [overwrite(ids.role, 0, 0n, mention), overwrite(ids.bot, 1, mention)],
    expected: true,
  },
  {
    name: 'administrator bypasses channel denies',
    role: P.Administrator,
    overwrites: [overwrite(ids.bot, 1, 0n, send | mention)],
    expected: true,
  },
  {
    name: 'view denied implicitly prevents mentioning',
    role: mention,
    overwrites: [overwrite(ids.bot, 1, 0n, P.ViewChannel)],
    expected: false,
  },
  {
    name: 'send denied implicitly prevents mentioning',
    role: mention,
    overwrites: [overwrite(ids.bot, 1, 0n, P.SendMessages)],
    expected: false,
  },
  {
    name: 'unassigned role allow does not grant access',
    overwrites: [overwrite('999999999999999999', 0, mention)],
    expected: false,
  },
];
describe('effective Mention Everyone permission', () => {
  it.each(cases)('$name', ({ base = send, role = 0n, overwrites = [], expected }) => {
    const roles = [
      {
        id: ids.guild,
        name: 'everyone',
        permissions: String(base),
        mentionable: false,
        managed: false,
      },
      {
        id: ids.role,
        name: 'bot role',
        permissions: String(role),
        mentionable: false,
        managed: true,
      },
      {
        id: ids.botRole,
        name: 'other assigned role',
        permissions: '0',
        mentionable: false,
        managed: false,
      },
    ];
    expect(
      canPost(
        ids.guild,
        ids.bot,
        [ids.role, ids.botRole],
        roles,
        { id: ids.channel, name: 'live', type: 0, permission_overwrites: overwrites },
        false,
        mention,
      ),
    ).toBe(expected);
  });
});
