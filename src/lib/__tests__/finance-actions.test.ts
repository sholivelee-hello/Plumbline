import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addWishContribution } from '../finance-actions';

// Supabase 클라이언트 모킹 - factory chain
const makeMockClient = (insertResult: { data?: unknown; error?: unknown } = { data: { id: 'tx-1' }, error: null }) => {
  const insertMock = vi.fn().mockResolvedValue(insertResult);
  const fromMock = vi.fn(() => ({
    insert: () => ({
      select: () => ({
        single: insertMock,
      }),
    }),
  }));
  return { fromMock, insertMock, from: fromMock };
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/client';

describe('addWishContribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts expense transaction linked to wishlist', async () => {
    const mock = makeMockClient();
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);

    const result = await addWishContribution({
      wishId: 'wish-1',
      amount: 100000,
      date: '2026-05-10',
      description: '등록금 저축',
    });

    expect(result.ok).toBe(true);
    expect(result.transactionId).toBe('tx-1');
    expect(mock.fromMock).toHaveBeenCalledWith('finance_transactions');
  });

  it('returns error when insert fails', async () => {
    const mock = makeMockClient({ data: null, error: { message: 'insert failed' } });
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);

    const result = await addWishContribution({
      wishId: 'wish-1',
      amount: 100000,
      date: '2026-05-10',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('insert failed');
  });

  it('uses default description when not provided', async () => {
    const mock = makeMockClient();
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);

    await addWishContribution({
      wishId: 'wish-1',
      amount: 50000,
      date: '2026-05-10',
    });

    expect(mock.fromMock).toHaveBeenCalled();
  });
});
