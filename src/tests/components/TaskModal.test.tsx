import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('lucide-react', () => ({
  X: () => <svg data-testid="x-icon" />,
  Calendar: () => <svg data-testid="calendar-icon" />,
  Clock: () => <svg data-testid="clock-icon" />,
  AlertCircle: () => <svg data-testid="alert-icon" />,
}));

import { TaskModal } from '../../../client/src/components/TaskModal';

describe('TaskModal', () => {
  it('submits mission details when the save button is clicked', () => {
    const mockSave = vi.fn();
    const mockClose = vi.fn();

    render(<TaskModal onSave={mockSave} isOpen={true} onClose={mockClose} />);

    fireEvent.change(screen.getByPlaceholderText(/e.g. Architect Core Cache Sync Protocols/i), {
      target: { value: 'Refactor cache protocols' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Lock In Mission/i }));

    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Refactor cache protocols',
      category: 'important-not-urgent',
      time: '09:00',
      recurType: 'none',
    }));
    expect(mockClose).toHaveBeenCalled();
  });
});

