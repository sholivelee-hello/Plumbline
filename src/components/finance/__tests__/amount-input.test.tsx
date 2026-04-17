// src/components/finance/__tests__/amount-input.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AmountInput } from '../amount-input';

describe('AmountInput', () => {
  it('renders with placeholder', () => {
    render(<AmountInput value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('금액')).toBeInTheDocument();
  });

  it('shows quick unit buttons', () => {
    render(<AmountInput value="" onChange={vi.fn()} />);
    expect(screen.getByText('+1만')).toBeInTheDocument();
    expect(screen.getByText('+5만')).toBeInTheDocument();
    expect(screen.getByText('+10만')).toBeInTheDocument();
    expect(screen.getByText('+50만')).toBeInTheDocument();
  });

  it('calls onChange with formatted value on quick button click', () => {
    const onChange = vi.fn();
    render(<AmountInput value="50,000" onChange={onChange} />);
    fireEvent.click(screen.getByText('+1만'));
    expect(onChange).toHaveBeenCalledWith('60,000');
  });

  it('formats input with commas', () => {
    const onChange = vi.fn();
    render(<AmountInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('금액'), { target: { value: '150000' } });
    expect(onChange).toHaveBeenCalledWith('150,000');
  });
});
