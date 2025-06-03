import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LMEvalForm from '#~/pages/lmEval/lmEvalForm/LMEvalForm';
import useInferenceServices from '#~/pages/modelServing/useInferenceServices';
import { standardUseFetchStateObject } from '#~/__tests__/unit/testUtils/hooks';
import { mockInferenceServices, nonVllmService } from './__mocks__/mockInferenceServicesData';

// Mock the dependencies
jest.mock('#~/pages/modelServing/useInferenceServices', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/pages/lmEval/utilities/useLMGenericObjectState', () => ({
  __esModule: true,
  default: jest.fn(() => [
    {
      deployedModelName: '',
      evaluationName: '',
      tasks: [],
      modelType: '',
      allowRemoteCode: false,
      allowOnline: false,
      model: {
        name: '',
        url: '',
        tokenizedRequest: false,
        tokenizer: '',
      },
    },
    jest.fn(),
  ]),
}));

// Mock other components to focus on the dropdown functionality
jest.mock('#~/pages/lmEval/components/LMEvalApplicationPage', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="lm-eval-app-page">{children}</div>
  ),
}));

jest.mock('#~/pages/lmEval/lmEvalForm/LMEvalFormFooter', () => ({
  __esModule: true,
  default: () => <div data-testid="lm-eval-form-footer">Footer</div>,
}));

jest.mock('#~/pages/lmEval/lmEvalForm/LMEvalTaskSection', () => ({
  __esModule: true,
  default: () => <div data-testid="lm-eval-task-section">Task Section</div>,
}));

jest.mock('#~/pages/lmEval/lmEvalForm/LMEvalSecuritySection', () => ({
  __esModule: true,
  default: () => <div data-testid="lm-eval-security-section">Security Section</div>,
}));

jest.mock('#~/pages/lmEval/lmEvalForm/LMEvalModelArgumentSection', () => ({
  __esModule: true,
  default: () => <div data-testid="lm-eval-model-argument-section">Model Argument Section</div>,
}));

const mockUseInferenceServices = jest.mocked(useInferenceServices);

describe('LMEvalForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use default namespace when no namespace prop provided', () => {
    mockUseInferenceServices.mockReturnValue(
      standardUseFetchStateObject({
        data: { items: mockInferenceServices, hasNonDashboardItems: false },
        loaded: true,
      }),
    );

    render(<LMEvalForm />);

    // Should show model dropdown
    expect(screen.getByText('Model Name')).toBeInTheDocument();
    expect(screen.getByText('Select a model')).toBeInTheDocument();
  });

  it('should render the form with model dropdown when namespace is provided', () => {
    mockUseInferenceServices.mockReturnValue(
      standardUseFetchStateObject({
        data: { items: mockInferenceServices, hasNonDashboardItems: false },
        loaded: true,
      }),
    );

    render(<LMEvalForm namespace="default" />);

    // Should not show namespace dropdown
    expect(screen.queryByText('Namespace')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Namespace options menu')).not.toBeInTheDocument();

    // Should show model dropdown
    expect(screen.getByText('Model Name')).toBeInTheDocument();
    expect(screen.getByText('Select a model')).toBeInTheDocument();
  });

  it('should show models from the provided namespace', async () => {
    mockUseInferenceServices.mockReturnValue(
      standardUseFetchStateObject({
        data: { items: mockInferenceServices, hasNonDashboardItems: false },
        loaded: true,
      }),
    );

    render(<LMEvalForm namespace="default" />);

    // Open model dropdown
    const modelDropdown = screen.getByLabelText('Model options menu');
    fireEvent.click(modelDropdown);

    // Should show models from 'default' namespace
    await waitFor(() => {
      expect(screen.getByText('Model One')).toBeInTheDocument();
      expect(screen.getByText('Model Two')).toBeInTheDocument();
    });
  });

  it('should handle loading state', () => {
    mockUseInferenceServices.mockReturnValue(
      standardUseFetchStateObject({
        data: { items: [], hasNonDashboardItems: false },
        loaded: false,
      }),
    );

    render(<LMEvalForm namespace="default" />);

    // Model dropdown should be present but empty when loading
    const modelDropdown = screen.getByLabelText('Model options menu');
    fireEvent.click(modelDropdown);

    // Should not show any model options
    expect(screen.queryByText('Model One')).not.toBeInTheDocument();
  });

  it('should handle error state', () => {
    mockUseInferenceServices.mockReturnValue(
      standardUseFetchStateObject({
        data: { items: [], hasNonDashboardItems: false },
        loaded: false,
        error: new Error('Failed to fetch inference services'),
      }),
    );

    render(<LMEvalForm namespace="default" />);

    // Model dropdown should be present but empty when there's an error
    const modelDropdown = screen.getByLabelText('Model options menu');
    fireEvent.click(modelDropdown);

    // Should not show any model options
    expect(screen.queryByText('Model One')).not.toBeInTheDocument();
  });

  it('should render all form sections', () => {
    mockUseInferenceServices.mockReturnValue(
      standardUseFetchStateObject({
        data: { items: mockInferenceServices, hasNonDashboardItems: false },
        loaded: true,
      }),
    );

    render(<LMEvalForm namespace="default" />);

    expect(screen.getByTestId('lm-eval-task-section')).toBeInTheDocument();
    expect(screen.getByTestId('lm-eval-security-section')).toBeInTheDocument();
    expect(screen.getByTestId('lm-eval-model-argument-section')).toBeInTheDocument();
    expect(screen.getByTestId('lm-eval-form-footer')).toBeInTheDocument();
  });

  it('should handle empty inference services list', () => {
    mockUseInferenceServices.mockReturnValue(
      standardUseFetchStateObject({
        data: { items: [], hasNonDashboardItems: false },
        loaded: true,
      }),
    );

    render(<LMEvalForm namespace="default" />);

    // Open model dropdown
    const modelDropdown = screen.getByLabelText('Model options menu');
    fireEvent.click(modelDropdown);

    // Should not show any options
    expect(screen.queryByText('Model One')).not.toBeInTheDocument();
  });

  it('should only show vLLM models in the dropdown', async () => {
    // Include both vLLM and non-vLLM services
    const mixedServices = [...mockInferenceServices, nonVllmService];

    mockUseInferenceServices.mockReturnValue(
      standardUseFetchStateObject({
        data: { items: mixedServices, hasNonDashboardItems: false },
        loaded: true,
      }),
    );

    render(<LMEvalForm namespace="default" />);

    // Open model dropdown
    const modelDropdown = screen.getByLabelText('Model options menu');
    fireEvent.click(modelDropdown);

    // Should show only vLLM models (Model One and Model Two)
    await waitFor(() => {
      expect(screen.getByText('Model One')).toBeInTheDocument();
      expect(screen.getByText('Model Two')).toBeInTheDocument();
      // Should NOT show the non-vLLM model
      expect(screen.queryByText('Non-LLM Model')).not.toBeInTheDocument();
    });
  });

  it('should filter models by the provided namespace', async () => {
    mockUseInferenceServices.mockReturnValue(
      standardUseFetchStateObject({
        data: { items: mockInferenceServices, hasNonDashboardItems: false },
        loaded: true,
      }),
    );

    // Render with 'production' namespace
    render(<LMEvalForm namespace="production" />);

    // Open model dropdown
    const modelDropdown = screen.getByLabelText('Model options menu');
    fireEvent.click(modelDropdown);

    // Should show only models from 'production' namespace
    await waitFor(() => {
      expect(screen.getByText('Model Three')).toBeInTheDocument();
      // Should NOT show models from other namespaces
      expect(screen.queryByText('Model One')).not.toBeInTheDocument();
      expect(screen.queryByText('Model Two')).not.toBeInTheDocument();
    });
  });
});
