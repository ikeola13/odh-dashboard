import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Form,
  FormGroup,
  FormSection,
  Icon,
  MenuToggle,
  PageSection,
  Popover,
  // eslint-disable-next-line no-restricted-imports
  Select,
  SelectList,
  SelectOption,
  TextInput,
  Truncate,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { LmEvalFormData, LmModelArgument } from '#~/pages/lmEval/types';
import { InferenceServiceKind } from '#~/k8sTypes';
import LMEvalApplicationPage from '#~/pages/lmEval/components/LMEvalApplicationPage';
import useLMGenericObjectState from '#~/pages/lmEval/utilities/useLMGenericObjectState';
import useInferenceServices from '#~/pages/modelServing/useInferenceServices';
import LmEvaluationFormFooter from './LMEvalFormFooter';
import LmEvaluationTaskSection from './LMEvalTaskSection';
import LmEvaluationSecuritySection from './LMEvalSecuritySection';
import LmModelArgumentSection from './LMEvalModelArgumentSection';
import { modelTypeOptions } from './const';

interface LMEvalFormProps {
  namespace?: string;
}

type ModelOption = {
  label: string;
  value: string;
  namespace: string;
  displayName: string;
  service: InferenceServiceKind;
};

const LMEvalForm: React.FC<LMEvalFormProps> = ({ namespace: propNamespace }) => {
  const namespace = propNamespace || 'default';

  const [data, setData] = useLMGenericObjectState<LmEvalFormData>({
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
  });
  const [open, setOpen] = React.useState(false);
  const [openModelName, setOpenModelName] = React.useState(false);
  const inferenceServices = useInferenceServices();

  const modelOptions = React.useMemo(() => {
    if (!inferenceServices.loaded || inferenceServices.error || !namespace) {
      return [];
    }

    return inferenceServices.data.items
      .filter((service: InferenceServiceKind) => service.metadata.namespace === namespace)
      .filter(
        (service: InferenceServiceKind) =>
          service.spec.predictor.model?.modelFormat?.name === 'vLLM',
      )
      .map((service: InferenceServiceKind) => {
        const {
          metadata: { annotations, name, namespace: serviceNamespace },
        } = service;
        const displayName = annotations?.['openshift.io/display-name'] || name;

        return {
          label: displayName,
          value: name,
          namespace: serviceNamespace,
          displayName,
          service,
        };
      });
  }, [inferenceServices.loaded, inferenceServices.error, inferenceServices.data.items, namespace]);

  React.useEffect(() => {
    if (namespace && data.deployedModelName) {
      const isModelInNamespace = modelOptions.some(
        (model: ModelOption) => model.value === data.deployedModelName,
      );
      if (!isModelInNamespace) {
        setData('deployedModelName', '');
      }
    }
  }, [namespace, modelOptions, data.deployedModelName, setData]);

  const findOptionForKey = (key: string) => modelTypeOptions.find((option) => option.key === key);
  const selectedOption = data.modelType ? findOptionForKey(data.modelType) : undefined;
  const selectedLabel = selectedOption?.label ?? 'Select type a model';
  const selectedModel = modelOptions.find(
    (model: ModelOption) => model.value === data.deployedModelName,
  );
  const selectedModelLabel = selectedModel?.label || 'Select a model';

  return (
    <LMEvalApplicationPage
      loaded
      title="Evaluate model"
      description={
        <>
          Test your model against a large number of different evaluation tasks to understand your
          model&apos;s performance, as well as its strengths and weaknesses.
        </>
      }
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem>Evaluate</BreadcrumbItem>
        </Breadcrumb>
      }
      empty={false}
    >
      <PageSection hasBodyWrapper={false} isFilled>
        <Form data-testid="lmEvaluationForm" maxWidth="800px">
          <FormGroup label="Model Name" isRequired>
            <Select
              isOpen={openModelName}
              selected={data.deployedModelName}
              onSelect={(e, selectValue) => {
                setData('deployedModelName', String(selectValue));
                setOpenModelName(false);
              }}
              onOpenChange={setOpenModelName}
              toggle={(toggleRef) => (
                <MenuToggle
                  isFullWidth
                  ref={toggleRef}
                  aria-label="Model options menu"
                  onClick={() => setOpenModelName(!openModelName)}
                  isExpanded={openModelName}
                >
                  <Truncate content={selectedModelLabel} className="truncate-no-min-width" />
                </MenuToggle>
              )}
              shouldFocusToggleOnSelect
            >
              <SelectList>
                {modelOptions.map((option: ModelOption) => (
                  <SelectOption
                    value={option.value}
                    key={option.value}
                    description={`${option.displayName} in ${option.namespace}`}
                  >
                    {option.label}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>
          {/* TODO: add popover content */}
          <FormGroup
            label="Evaluation name"
            isRequired
            labelHelp={
              <Popover bodyContent={<></>}>
                <Button
                  icon={
                    <Icon isInline>
                      <OutlinedQuestionCircleIcon />
                    </Icon>
                  }
                  variant="plain"
                  isInline
                />
              </Popover>
            }
          >
            <TextInput
              autoFocus
              aria-label="Evaluation name"
              value={data.evaluationName}
              onChange={(_event, v) => setData('evaluationName', v)}
            />
          </FormGroup>
          <LmEvaluationTaskSection
            tasks={data.tasks}
            setTasks={(selectedTasks: string[]) => setData('tasks', selectedTasks)}
          />
          <FormGroup label="Model type" isRequired>
            <Select
              isOpen={open}
              selected={data.modelType}
              onSelect={(e, selectValue) => {
                const modelType = String(selectValue);
                setData('modelType', modelType);

                // Remove any existing endpoint and add the new one
                const baseUrl = data.model.url.replace(/\/v1\/(chat\/)?completions/, '');
                const modelOption = findOptionForKey(modelType);
                const endpoint = modelOption?.endpoint ?? '';
                setData('model', {
                  ...data.model,
                  url: `${baseUrl}${endpoint}`,
                });
                setOpen(false);
              }}
              onOpenChange={setOpen}
              toggle={(toggleRef) => (
                <MenuToggle
                  isFullWidth
                  ref={toggleRef}
                  aria-label="Options menu"
                  onClick={() => setOpen(!open)}
                  isExpanded={open}
                >
                  <Truncate content={selectedLabel} className="truncate-no-min-width" />
                </MenuToggle>
              )}
              shouldFocusToggleOnSelect
            >
              <SelectList>
                {modelTypeOptions.map((option) => (
                  <SelectOption
                    value={option.key}
                    key={option.key}
                    description={option.description}
                  >
                    {option.label}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>
          <LmEvaluationSecuritySection
            allowOnline={data.allowOnline}
            allowRemoteCode={data.allowRemoteCode}
            setAllowRemoteCode={(allowRemoteCode: boolean) =>
              setData('allowRemoteCode', allowRemoteCode)
            }
            setAllowOnline={(allowOnline: boolean) => setData('allowOnline', allowOnline)}
          />
          <LmModelArgumentSection
            modelArgument={data.model}
            setModelArgument={(modelArgument: LmModelArgument) => setData('model', modelArgument)}
          />
          <FormSection>
            <LmEvaluationFormFooter data={data} />
          </FormSection>
        </Form>
      </PageSection>
    </LMEvalApplicationPage>
  );
};

export type { LMEvalFormProps };
export default LMEvalForm;
