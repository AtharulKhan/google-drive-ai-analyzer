import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LocalFileInput from './LocalFileInput'; // Adjust path as necessary
import { Button } from '@/components/ui/button'; // Mock or ensure it's available

// Mocking Button component as it's an external dependency from ui/button
vi.mock('@/components/ui/button', () => ({
  Button: React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    ({ children, onClick, variant, ...props }, ref) => (
      <button ref={ref} onClick={onClick} {...props} data-variant={variant}>
        {children}
      </button>
    )
  ),
}));

describe('LocalFileInput', () => {
  it('renders correctly with the "Select Files" button', () => {
    const mockOnFilesSelected = vi.fn();
    render(<LocalFileInput onFilesSelected={mockOnFilesSelected} />);
    
    const buttonElement = screen.getByRole('button', { name: /select files/i });
    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement).toHaveAttribute('data-variant', 'outline');
  });

  it('calls onFilesSelected with a single selected file', () => {
    const mockOnFilesSelected = vi.fn();
    render(<LocalFileInput onFilesSelected={mockOnFilesSelected} />);
    
    const fileInput = screen.getByTestId('local-file-input') as HTMLInputElement; // Assuming you add data-testid
    
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    
    fireEvent.change(fileInput, {
      target: { files: [file] },
    });
    
    expect(mockOnFilesSelected).toHaveBeenCalledTimes(1);
    expect(mockOnFilesSelected).toHaveBeenCalledWith([file]);
  });

  it('calls onFilesSelected with multiple selected files', () => {
    const mockOnFilesSelected = vi.fn();
    render(<LocalFileInput onFilesSelected={mockOnFilesSelected} />);
    
    const fileInput = screen.getByTestId('local-file-input') as HTMLInputElement; // Assuming you add data-testid
    
    const file1 = new File(['file1'], 'file1.txt', { type: 'text/plain' });
    const file2 = new File(['file2'], 'file2.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, {
      target: { files: [file1, file2] },
    });
    
    expect(mockOnFilesSelected).toHaveBeenCalledTimes(1);
    expect(mockOnFilesSelected).toHaveBeenCalledWith([file1, file2]);
  });

  it('opens file dialog when "Select Files" button is clicked', () => {
    const mockOnFilesSelected = vi.fn();
    render(<LocalFileInput onFilesSelected={mockOnFilesSelected} />);
    
    const fileInput = screen.getByTestId('local-file-input') as HTMLInputElement; // Assuming you add data-testid
    const clickSpy = vi.spyOn(fileInput, 'click');
    
    const selectButton = screen.getByRole('button', { name: /select files/i });
    fireEvent.click(selectButton);
    
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });
});

// Helper to add data-testid to the input in the actual component for easier selection
// The LocalFileInput.tsx needs to be modified to include data-testid="local-file-input" on the <input type="file" /> element.
// Example: <input data-testid="local-file-input" type="file" ... />
