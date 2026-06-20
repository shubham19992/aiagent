// ============================================================
// observabilityDummy.js — fallback data used when the live
// observability API (http://127.0.0.1:8005) is unreachable.
// Mirrors the real /api/v3/observability/* response shapes.
// ============================================================

export const DUMMY_OPS = [
  { code: 'aiops', name: 'AIOps', description: 'AI for IT operations - anomaly detection, event correlation, and automated remediation.', is_active: true, sort_order: 0 },
  { code: 'mlops', name: 'MLOps', description: 'Machine learning operations - model training, deployment, and monitoring lifecycle.', is_active: true, sort_order: 1 },
  { code: 'llmops', name: 'LLMOps', description: 'Large language model operations - prompt, evaluation, and serving lifecycle.', is_active: true, sort_order: 2 },
  { code: 'modelops', name: 'ModelOps', description: 'Operationalization and governance of AI/ML and decision models.', is_active: true, sort_order: 3 },
  { code: 'dataops', name: 'DataOps', description: 'Data pipeline operations - ingestion, quality, and delivery automation.', is_active: true, sort_order: 4 },
  { code: 'devops', name: 'DevOps', description: 'Development and operations - CI/CD, release, and collaboration practices.', is_active: true, sort_order: 5 },
  { code: 'devsecops', name: 'DevSecOps', description: 'Security-integrated DevOps - shift-left security across the delivery pipeline.', is_active: true, sort_order: 6 },
  { code: 'secops', name: 'SecOps', description: 'Security operations - threat detection, response, and SOC workflows.', is_active: true, sort_order: 7 },
  { code: 'infraops', name: 'InfraOps', description: 'Infrastructure operations - provisioning, scaling, and lifecycle of infrastructure.', is_active: true, sort_order: 8 },
  { code: 'cloudops', name: 'CloudOps', description: 'Cloud operations - multi-cloud provisioning, governance, and optimization.', is_active: true, sort_order: 9 },
  { code: 'netops', name: 'NetOps', description: 'Network operations - monitoring, configuration, and automation of networks.', is_active: true, sort_order: 10 },
  { code: 'itops', name: 'ITOps', description: 'IT operations - day-to-day management of IT services and infrastructure.', is_active: true, sort_order: 11 },
  { code: 'sysops', name: 'SysOps', description: 'Systems operations - administration and reliability of systems.', is_active: true, sort_order: 12 },
  { code: 'platformops', name: 'PlatformOps', description: 'Platform engineering operations - internal developer platforms and golden paths.', is_active: true, sort_order: 13 },
  { code: 'finops', name: 'FinOps', description: 'Cloud financial operations - cost visibility, allocation, and optimization.', is_active: true, sort_order: 14 },
  { code: 'gitops', name: 'GitOps', description: 'Git-driven operations - declarative infra/app delivery with Git as source of truth.', is_active: true, sort_order: 15 },
  { code: 'chatops', name: 'ChatOps', description: 'Chat-driven operations - running ops workflows from collaboration tools.', is_active: true, sort_order: 16 },
  { code: 'bizops', name: 'BizOps', description: 'Business operations - aligning business strategy with operational execution.', is_active: true, sort_order: 17 },
];

// Generic env set used as a fallback for any op.
export const dummyEnvs = (opCode) => [
  { id: 1, op_code: opCode, code: 'aws', name: 'AWS', description: 'Amazon Web Services.', is_active: true, sort_order: 0 },
  { id: 2, op_code: opCode, code: 'azure', name: 'Azure', description: 'Microsoft Azure.', is_active: true, sort_order: 1 },
  { id: 3, op_code: opCode, code: 'gcp', name: 'GCP', description: 'Google Cloud Platform.', is_active: true, sort_order: 2 },
];

export const dummyMeasures = (opCode) => [
  { id: 1, op_code: opCode, code: 'cost', name: 'Cost', description: 'Spend and billing metrics.', is_active: true, sort_order: 0 },
  { id: 2, op_code: opCode, code: 'network', name: 'Network', description: 'Network traffic, throughput, and latency.', is_active: true, sort_order: 1 },
  { id: 3, op_code: opCode, code: 'compute', name: 'Compute', description: 'Compute utilization (CPU, memory).', is_active: true, sort_order: 2 },
  { id: 4, op_code: opCode, code: 'storage', name: 'Storage', description: 'Storage capacity and usage.', is_active: true, sort_order: 3 },
  { id: 5, op_code: opCode, code: 'security', name: 'Security', description: 'Security posture and findings.', is_active: true, sort_order: 4 },
];

const AWS_PARAMS = [
  { id: 1, env_id: 1, param_key: 'access_key_id', label: 'Access Key ID', data_type: 'string', is_mandatory: true, is_secret: false, validation_regex: '^AKIA[0-9A-Z]{16}$', default_value: null, help_text: 'AWS IAM access key id.', is_active: true, sort_order: 0 },
  { id: 2, env_id: 1, param_key: 'secret_access_key', label: 'Secret Access Key', data_type: 'secret', is_mandatory: true, is_secret: true, validation_regex: null, default_value: null, help_text: 'AWS IAM secret access key.', is_active: true, sort_order: 1 },
  { id: 3, env_id: 1, param_key: 'region', label: 'Default Region', data_type: 'string', is_mandatory: true, is_secret: false, validation_regex: '^[a-z]{2}-[a-z]+-\\d$', default_value: null, help_text: 'e.g. us-east-1.', is_active: true, sort_order: 2 },
];

const AZURE_PARAMS = [
  { id: 4, env_id: 2, param_key: 'tenant_id', label: 'Tenant ID', data_type: 'string', is_mandatory: true, is_secret: false, validation_regex: '^[0-9a-fA-F-]{36}$', default_value: null, help_text: 'Azure AD tenant (directory) id.', is_active: true, sort_order: 0 },
  { id: 5, env_id: 2, param_key: 'client_id', label: 'Client ID', data_type: 'string', is_mandatory: true, is_secret: false, validation_regex: '^[0-9a-fA-F-]{36}$', default_value: null, help_text: 'App registration (client) id.', is_active: true, sort_order: 1 },
  { id: 6, env_id: 2, param_key: 'client_secret', label: 'Client Secret', data_type: 'secret', is_mandatory: true, is_secret: true, validation_regex: null, default_value: null, help_text: 'App registration client secret.', is_active: true, sort_order: 2 },
  { id: 7, env_id: 2, param_key: 'subscription_id', label: 'Subscription ID', data_type: 'string', is_mandatory: true, is_secret: false, validation_regex: '^[0-9a-fA-F-]{36}$', default_value: null, help_text: 'Azure subscription id.', is_active: true, sort_order: 3 },
];

const GCP_PARAMS = [
  { id: 8, env_id: 3, param_key: 'project_id', label: 'Project ID', data_type: 'string', is_mandatory: true, is_secret: false, validation_regex: null, default_value: null, help_text: 'GCP project id.', is_active: true, sort_order: 0 },
  { id: 9, env_id: 3, param_key: 'service_account_json', label: 'Service Account JSON', data_type: 'secret', is_mandatory: true, is_secret: true, validation_regex: null, default_value: null, help_text: 'Service account key JSON.', is_active: true, sort_order: 1 },
];

export const dummyParams = (opCode, env) => {
  if (env === 'aws') return AWS_PARAMS;
  if (env === 'azure') return AZURE_PARAMS;
  if (env === 'gcp') return GCP_PARAMS;
  return AWS_PARAMS;
};
