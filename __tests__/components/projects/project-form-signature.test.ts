import { describe, expect, it } from 'vitest';
import { getProjectDetailsSignature } from '@/components/projects/form/project-form-signature';
import type { ProjectFormValues } from '@/components/projects/form/project-form-values';

function signature(values: Partial<ProjectFormValues>) {
  return getProjectDetailsSignature(values as ProjectFormValues, []);
}

describe('getProjectDetailsSignature', () => {
  it('ignores the order of multi-select values', () => {
    expect(signature({ topicIds: ['10', '9', '2'] })).toBe(
      signature({ topicIds: ['2', '9', '10'] })
    );
  });

  it('keeps the order of locations', () => {
    const first = { departmentId: '1', city: 'A', neighborhood: '' };
    const second = { departmentId: '2', city: 'B', neighborhood: '' };
    expect(signature({ locations: [first, second] })).not.toBe(
      signature({ locations: [second, first] })
    );
  });

  it('detects a changed multi-select value', () => {
    expect(signature({ topicIds: ['1', '2'] })).not.toBe(signature({ topicIds: ['1', '3'] }));
  });
});
