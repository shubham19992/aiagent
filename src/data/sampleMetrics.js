// ============================================================
// sampleMetrics.js — the /metrics exposition dump used as demo
// data for the dashboard. In production, replace this with a
// fetch() to your exporter (or a backend JSON endpoint).
// ============================================================

export const SAMPLE_METRICS_TEXT = `
azurerm_api_request_sum{apiEndpoint="login.microsoftonline.com",method="get",resourceProvider="",statusCode="200",subscriptionID="",tenantID=""} 0.730787948
azurerm_api_request_count{apiEndpoint="login.microsoftonline.com",method="get",resourceProvider="",statusCode="200",subscriptionID="",tenantID=""} 4
azurerm_api_request_sum{apiEndpoint="login.microsoftonline.com",method="post",resourceProvider="",statusCode="200",subscriptionID="",tenantID=""} 0.871896287
azurerm_api_request_count{apiEndpoint="login.microsoftonline.com",method="post",resourceProvider="",statusCode="200",subscriptionID="",tenantID=""} 2
azurerm_api_request_sum{apiEndpoint="management.azure.com",method="get",resourceProvider="",statusCode="200",subscriptionID="",tenantID="adb53b4f-b05f-4dcb-a2e1-9111380568c3"} 0.199672487
azurerm_api_request_count{apiEndpoint="management.azure.com",method="get",resourceProvider="",statusCode="200",subscriptionID="",tenantID="adb53b4f-b05f-4dcb-a2e1-9111380568c3"} 1
go_gc_duration_seconds{quantile="0"} 4.239e-05
go_gc_duration_seconds{quantile="0.25"} 5.4295e-05
go_gc_duration_seconds{quantile="0.5"} 7.6727e-05
go_gc_duration_seconds{quantile="0.75"} 0.000106523
go_gc_duration_seconds{quantile="1"} 0.000777123
go_gc_duration_seconds_sum 0.00713525
go_gc_duration_seconds_count 80
go_gc_gogc_percent 100
go_gc_gomemlimit_bytes 7.444297728e+09
go_goroutines 12
go_info{version="go1.25.5"} 1
go_memstats_alloc_bytes 2.534488e+06
go_memstats_alloc_bytes_total 4.4424496e+07
go_memstats_buck_hash_sys_bytes 1.444794e+06
go_memstats_frees_total 77919
go_memstats_gc_sys_bytes 3.152144e+06
go_memstats_heap_alloc_bytes 2.534488e+06
go_memstats_heap_idle_bytes 3.923968e+06
go_memstats_heap_inuse_bytes 4.038656e+06
go_memstats_heap_objects 18572
go_memstats_heap_released_bytes 3.76832e+06
go_memstats_heap_sys_bytes 7.962624e+06
go_memstats_last_gc_time_seconds 1.7818542908890257e+09
go_memstats_mallocs_total 96491
go_memstats_next_gc_bytes 5.330634e+06
go_memstats_stack_inuse_bytes 425984
go_memstats_stack_sys_bytes 425984
go_memstats_sys_bytes 1.3719816e+07
go_sched_gomaxprocs_threads 2
go_threads 5
process_cpu_seconds_total 0.43
process_max_fds 524287
process_network_receive_bytes_total 65227
process_network_transmit_bytes_total 124995
process_open_fds 9
process_resident_memory_bytes 2.4276992e+07
process_start_time_seconds 1.78184292897e+09
process_virtual_memory_bytes 1.27182848e+09
process_virtual_memory_max_bytes 1.8446744073709552e+19
promhttp_metric_handler_requests_in_flight 1
promhttp_metric_handler_requests_total{code="200"} 39
promhttp_metric_handler_requests_total{code="500"} 0
promhttp_metric_handler_requests_total{code="503"} 0
`;
