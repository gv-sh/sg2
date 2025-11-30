import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Content from './Content';

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: { data: [], pagination: { total: 0, totalPages: 0 } } })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} }))
}));

// Mock config
jest.mock('../config', () => ({
  API_URL: 'http://localhost:3000'
}));

const MockedContent = () => (
  <BrowserRouter>
    <Content />
  </BrowserRouter>
);

describe('Content Component', () => {
  test('renders content page title', async () => {
    render(<MockedContent />);
    await waitFor(() => {
      expect(screen.getByText('Generated Content')).toBeInTheDocument();
    });
  });

  test('renders search input', async () => {
    render(<MockedContent />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search content...')).toBeInTheDocument();
    });
  });

  test('renders filter selects', async () => {
    render(<MockedContent />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('All Content')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Years')).toBeInTheDocument();
    });
  });
});