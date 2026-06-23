// ============================================================
// discoveryDummy.js — canned cloud-discovery response shown after
// "Save & Connect" (and from the connections list "Connect" button)
// until the real discovery API is wired in. Mirrors the agent response
// shape: summary + per-subscription resource breakdown + insights.
// ============================================================

export const DISCOVERY_RESULT = {
  requestId: 'req-E5B776C782F1',
  projectId: 'project-456',
  userId: 'user-123',
  cloudProvider: 'AZURE',
  executionTime: '2026-06-23T08:58:29.699418',
  status: 'COMPLETED',
  summary: {
    totalAgentsRequested: 1,
    totalAgentsExecuted: 1,
    successfulAgents: 1,
    failedAgents: 0,
  },
  results: [
    {
      agentId: 'azure_discovery',
      agentType: 'dynamic',
      version: '1.0.0',
      status: 'SUCCESS',
      data: {
        agent_id: 'azure_discovery',
        agent_type: 'dynamic',
        version: '1.0.0',
        recommendations: {
          discoveryTime: '2026-06-23T08:58:29.697589Z',
          cloudProvider: 'AZURE',
          subscriptions: [
            {
              subscriptionId: '53f91f0e-93ff-4b7a-9c63-ecb3b299a348',
              subscriptionName: 'Subscription-53f91f0e',
              state: 'Enabled',
              summary: {
                totalResources: 55,
                resourceGroups: 12,
                regionsUsed: 6,
                resourceTypes: 19,
              },
              compute: { totalVMs: 3, linuxVMs: 3, windowsVMs: 0 },
              storage: { storageAccounts: 2 },
              databases: { sqlDatabases: 0, mysqlServers: 0, postgresServers: 2 },
              networking: { vnets: 3, publicIps: 4, nsgs: 3, loadBalancers: 0 },
              containers: { aksClusters: 0 },
              health: { healthyResources: 8, unhealthyResources: 1 },
              insights: [
                'The subscription has a relatively low number of compute resources with only 3 VMs; consider evaluating workload requirements to determine if additional VMs are needed or if existing resources can be optimized further.',
                'With 2 storage accounts and 3 virtual networks across 6 regions, there may be opportunities to consolidate resources to reduce costs and simplify management; review usage patterns for potential underutilized resources.',
                "The presence of 1 unhealthy resource indicates a potential risk; it's advisable to investigate and remediate this resource to ensure compliance and maintain overall system health.",
                'The diversity of resource types (19) across 12 resource groups suggests complexity in management; consider implementing standardized naming conventions and tagging to enhance resource organization and governance.',
                'Since there are no SQL databases or AKS clusters, assess if these services might be beneficial for future scalability needs; embracing managed services can improve performance and reduce maintenance overhead.',
              ],
            },
          ],
        },
        validation: true,
      },
      error: null,
    },
  ],
};
