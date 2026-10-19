import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComponentCard } from './ComponentCard';

vi.mock('./LivePreview', () => ({ LivePreview: () => <div data-testid="preview" /> }));

const component = { id: '1', prompt: 'p', code: 'const A = 1;', createdAt: new Date() };
const props = { component, onRemove: vi.fn(), onRegenerate: vi.fn(), isLoading: false };

describe('ComponentCard', () => {
  it('스트리밍 중에는 코드 탭이 선택되고 미리보기 탭이 비활성이다', () => {
    render(<ComponentCard {...props} isStreaming />);
    expect(screen.getByRole('tab', { name: '코드' }).getAttribute('aria-selected')).toBe('true');
    expect((screen.getByRole('tab', { name: '미리보기' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('스트리밍이 끝나면 미리보기 탭으로 전환된다', () => {
    const { rerender } = render(<ComponentCard {...props} isStreaming />);
    rerender(<ComponentCard {...props} isStreaming={false} />);
    expect(screen.getByRole('tab', { name: '미리보기' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('preview')).toBeTruthy();
  });

  it('스트리밍 중에는 삭제 버튼이 비활성이다', () => {
    render(<ComponentCard {...props} isStreaming />);
    expect((screen.getByRole('button', { name: '삭제' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
