// ============================================================
// metricsSample.js — Prometheus-style range-query (matrix) sample used by the
// discovery Explore dashboard until a live metrics endpoint is wired up.
// Shape: { status, data: { resultType: 'matrix', result: [{ metric, values }] } }
// where each `values` entry is [ unixSeconds, "stringValue" ].
// ============================================================
export const METRICS_SAMPLE = {
  status: 'success',
  data: {
    resultType: 'matrix',
    result: [
      {
        metric: { __name__: 'system.cpu.utilization', 'host.name': 'vm-prod-01', 'resource.id': 'vm-prod-01', 'cloud.provider': 'azure', 'cloud.region': 'eastus', 'resource.group': 'rg-production' },
        values: [[1719648000, '22.34'], [1719648060, '24.87'], [1719648120, '28.11'], [1719648180, '30.42'], [1719648240, '31.73']],
      },
      {
        metric: { __name__: 'system.memory.utilization', 'host.name': 'vm-prod-01', 'resource.id': 'vm-prod-01', 'cloud.provider': 'azure' },
        values: [[1719648000, '61.20'], [1719648060, '62.18'], [1719648120, '63.42'], [1719648180, '64.11'], [1719648240, '65.83']],
      },
      {
        metric: { __name__: 'system.disk.utilization', 'host.name': 'vm-prod-01', device: '/dev/sda1', 'resource.id': 'vm-prod-01' },
        values: [[1719648000, '71.14'], [1719648060, '71.30'], [1719648120, '71.55'], [1719648180, '71.90'], [1719648240, '72.21']],
      },
      {
        metric: { __name__: 'system.network.io', 'host.name': 'vm-prod-01', direction: 'receive', 'resource.id': 'vm-prod-01' },
        values: [[1719648000, '2356712'], [1719648060, '2471820'], [1719648120, '2519022'], [1719648180, '2627711'], [1719648240, '2730011']],
      },
      {
        metric: { __name__: 'system.network.io', 'host.name': 'vm-prod-01', direction: 'transmit', 'resource.id': 'vm-prod-01' },
        values: [[1719648000, '1256712'], [1719648060, '1283211'], [1719648120, '1339001'], [1719648180, '1398233'], [1719648240, '1458121']],
      },
      {
        metric: { __name__: 'db.client.connections.usage', 'db.system': 'mssql', 'db.name': 'customerdb', 'resource.id': 'sql-prod-01', 'cloud.provider': 'azure' },
        values: [[1719648000, '112'], [1719648060, '118'], [1719648120, '125'], [1719648180, '132'], [1719648240, '140']],
      },
      {
        metric: { __name__: 'db.client.operation.duration', 'db.system': 'mssql', 'db.name': 'customerdb', 'resource.id': 'sql-prod-01' },
        values: [[1719648000, '21'], [1719648060, '19'], [1719648120, '25'], [1719648180, '22'], [1719648240, '24']],
      },
      {
        metric: { __name__: 'db.client.errors', 'db.system': 'mssql', 'db.name': 'customerdb', 'resource.id': 'sql-prod-01' },
        values: [[1719648000, '0'], [1719648060, '1'], [1719648120, '0'], [1719648180, '2'], [1719648240, '0']],
      },
      {
        metric: { __name__: 'k8s.node.cpu.utilization', 'k8s.node.name': 'aks-nodepool1-000001', 'cluster.name': 'aks-prod' },
        values: [[1719648000, '63.2'], [1719648060, '64.4'], [1719648120, '65.8'], [1719648180, '66.9'], [1719648240, '67.1']],
      },
      {
        metric: { __name__: 'k8s.pod.cpu.utilization', 'k8s.namespace.name': 'production', 'k8s.pod.name': 'orders-api-6f4bbf' },
        values: [[1719648000, '28.1'], [1719648060, '30.4'], [1719648120, '29.2'], [1719648180, '31.7'], [1719648240, '34.5']],
      },
      {
        metric: { __name__: 'container.cpu.utilization', 'container.name': 'orders-api', 'container.id': 'docker://9ab123' },
        values: [[1719648000, '18.2'], [1719648060, '19.8'], [1719648120, '20.4'], [1719648180, '21.7'], [1719648240, '22.5']],
      },
      {
        metric: { __name__: 'container.memory.utilization', 'container.name': 'orders-api' },
        values: [[1719648000, '55.3'], [1719648060, '56.8'], [1719648120, '57.4'], [1719648180, '58.1'], [1719648240, '59.6']],
      },
      {
        metric: { __name__: 'azure.storage.used_capacity', 'storage.account': 'storageprod01', 'resource.id': 'storageprod01' },
        values: [[1719648000, '84532123136'], [1719648060, '84542123136'], [1719648120, '84553123136'], [1719648180, '84564123136'], [1719648240, '84575123136']],
      },
      {
        metric: { __name__: 'azure.loadbalancer.health_probe_status', 'loadbalancer.name': 'prod-lb' },
        values: [[1719648000, '1'], [1719648060, '1'], [1719648120, '1'], [1719648180, '1'], [1719648240, '1']],
      },
    ],
  },
};
