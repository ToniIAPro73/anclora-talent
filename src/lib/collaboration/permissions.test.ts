import { describe, expect, test } from 'vitest';
import {
  canPerform,
  parseCollaboratorRole,
  parseInvitableRole,
  type CollaborationAction,
} from './permissions';
import type { CollaboratorRole } from './model';

const ACTIONS: CollaborationAction[] = [
  'manage-collaborators',
  'comment',
  'resolve-comment',
  'propose-suggestion',
  'decide-suggestion',
  'edit-content',
  'edit-design',
];

const EXPECTED: Record<CollaboratorRole, CollaborationAction[]> = {
  author: [...ACTIONS],
  editor: ['comment', 'propose-suggestion'],
  designer: ['comment', 'edit-design'],
};

describe('collaboration permission matrix', () => {
  test.each(Object.entries(EXPECTED) as Array<[CollaboratorRole, CollaborationAction[]]>)(
    'role %s matches its documented permission set',
    (role, allowed) => {
      for (const action of ACTIONS) {
        expect(canPerform(role, action), `${role} × ${action}`).toBe(allowed.includes(action));
      }
    },
  );

  test('the editor never edits content nor decides suggestions directly', () => {
    expect(canPerform('editor', 'edit-content')).toBe(false);
    expect(canPerform('editor', 'decide-suggestion')).toBe(false);
    expect(canPerform('editor', 'edit-design')).toBe(false);
    expect(canPerform('editor', 'manage-collaborators')).toBe(false);
  });

  test('the designer never touches content nor suggestions', () => {
    expect(canPerform('designer', 'edit-content')).toBe(false);
    expect(canPerform('designer', 'propose-suggestion')).toBe(false);
    expect(canPerform('designer', 'decide-suggestion')).toBe(false);
    expect(canPerform('designer', 'resolve-comment')).toBe(false);
  });

  test('role parsers reject untrusted values', () => {
    expect(parseCollaboratorRole('editor')).toBe('editor');
    expect(parseCollaboratorRole('owner')).toBeNull();
    expect(parseCollaboratorRole(undefined)).toBeNull();
    expect(parseInvitableRole('designer')).toBe('designer');
    // The owner role is never assignable through an invitation.
    expect(parseInvitableRole('author')).toBeNull();
    expect(parseInvitableRole('admin')).toBeNull();
  });
});
