import * as React from 'react';
import {
  Alert,
  Form,
  Stack,
  StackItem,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { createPipelinesCR, deleteSecret } from '~/api';
import { EMPTY_AWS_PIPELINE_DATA } from '~/pages/projects/dataConnections/const';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { fireFormTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '~/concepts/analyticsTracking/trackingProperties';
import SamplePipelineSettingsSection from '~/concepts/pipelines/content/configurePipelinesServer/SamplePipelineSettingsSection';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import usePipelinesConnections from '~/pages/projects/screens/detail/connections/usePipelinesConnections';
import { PipelinesDatabaseSection } from './PipelinesDatabaseSection';
import { ObjectStorageSection } from './ObjectStorageSection';
import {
  DATABASE_CONNECTION_FIELDS,
  EMPTY_DATABASE_CONNECTION,
  ExternalDatabaseSecret,
} from './const';
import { configureDSPipelineResourceSpec, objectStorageIsValid } from './utils';
import { PipelineServerConfigType } from './types';

type ConfigurePipelinesServerModalProps = {
  onClose: () => void;
};

const FORM_DEFAULTS: PipelineServerConfigType = {
  database: { useDefault: true, value: EMPTY_DATABASE_CONNECTION },
  objectStorage: { newValue: EMPTY_AWS_PIPELINE_DATA },
  enableInstructLab: false,
};

const serverConfiguredEvent = 'Pipeline Server Configured';
export const ConfigurePipelinesServerModal: React.FC<ConfigurePipelinesServerModalProps> = ({
  onClose,
}) => {
  const { project, namespace } = usePipelinesAPI();
  const [connections, loaded] = usePipelinesConnections(namespace);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [config, setConfig] = React.useState<PipelineServerConfigType>(FORM_DEFAULTS);
  const isFineTuningAvailable = useIsAreaAvailable(SupportedArea.FINE_TUNING).status;

  const databaseIsValid = config.database.useDefault
    ? true
    : config.database.value.every(({ key, value }) =>
        DATABASE_CONNECTION_FIELDS.filter((field) => field.isRequired)
          .map((field) => field.key)
          .includes(key)
          ? !!value
          : true,
      );

  const objectIsValid = objectStorageIsValid(config.objectStorage.newValue);
  const canSubmit = databaseIsValid && objectIsValid;

  const onBeforeClose = () => {
    onClose();
    setFetching(false);
    setError(undefined);
    setConfig(FORM_DEFAULTS);
  };

  const onCancel = () => {
    onBeforeClose();
    fireFormTrackingEvent(serverConfiguredEvent, { outcome: TrackingOutcome.cancel });
  };

  const submit = () => {
    const objectStorage: PipelineServerConfigType['objectStorage'] = {
      newValue: config.objectStorage.newValue.map((entry) => ({
        ...entry,
        value: entry.value.trim(),
      })),
    };
    setFetching(true);
    setError(undefined);

    const configureConfig: PipelineServerConfigType = {
      ...config,
      objectStorage,
    };

    configureDSPipelineResourceSpec(configureConfig, project.metadata.name)
      .then((spec) => {
        createPipelinesCR(namespace, spec)
          .then(() => {
            onBeforeClose();
            fireFormTrackingEvent(serverConfiguredEvent, {
              outcome: TrackingOutcome.submit,
              success: true,
              isILabEnabled: config.enableInstructLab,
            });
          })
          .catch((e) => {
            setFetching(false);
            setError(e);
            fireFormTrackingEvent(serverConfiguredEvent, {
              outcome: TrackingOutcome.submit,
              success: false,
              error: e,
            });
            // Cleanup created password secret
            deleteSecret(project.metadata.name, ExternalDatabaseSecret.NAME);
          });
      })
      .catch((e) => {
        setFetching(false);
        setError(e);
        fireFormTrackingEvent(serverConfiguredEvent, {
          outcome: TrackingOutcome.submit,
          success: false,
          error: e,
        });
      });
  };

  return (
    <Modal variant="medium" isOpen onClose={onCancel}>
      <ModalHeader
        title="Configure pipeline server"
        description="Configuring a pipeline server enables you to create and manage pipelines."
      />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Alert
              variant="info"
              isInline
              title="Pipeline server configuration cannot be edited after creation. To use a different configuration after creation, delete the pipeline server and create a new one."
            />
          </StackItem>
          <StackItem>
            <Form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <ObjectStorageSection
                setConfig={setConfig}
                config={config}
                loaded={loaded}
                connections={connections}
              />
              <PipelinesDatabaseSection setConfig={setConfig} config={config} />
              {isFineTuningAvailable && (
                <SamplePipelineSettingsSection setConfig={setConfig} config={config} />
              )}
            </Form>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Configure pipeline server"
          onSubmit={submit}
          isSubmitLoading={fetching}
          isSubmitDisabled={!canSubmit || fetching}
          onCancel={onCancel}
          alertTitle="Error configuring pipeline server"
          error={error}
        />
      </ModalFooter>
    </Modal>
  );
};
