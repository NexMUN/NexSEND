import { useState, useEffect } from 'react';
import { RefreshCw, Search, Mail, Filter, ChevronDown, ChevronRight, Activity, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { Organization, EmailJob } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function EmailLogsView({ organizations, activeOrgId }: { organizations: Organization[], activeOrgId: string }) {
  const [logs, setLogs] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filterOrg, setFilterOrg] = useState(activeOrgId || 'all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, hasNext: false, hasPrevious: false });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.emailLogs.list({
        page,
        limit: 20,
        organizationId: filterOrg,
        status: filterStatus
      });
      setLogs(res.data || []);
      setPagination({
        totalPages: res.totalPages,
        hasNext: res.hasNext,
        hasPrevious: res.hasPrevious,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch email logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterOrg, filterStatus]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'SENT': return 'border-[var(--success)] text-[var(--success)] bg-[var(--success)]/10';
      case 'FAILED': 
      case 'BOUNCED':
      case 'COMPLAINED': return 'border-[var(--danger)] text-[var(--danger)] bg-[var(--danger)]/10';
      case 'PROCESSING': return 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10';
      case 'QUEUED': return 'border-[var(--warning)] text-[var(--warning)] bg-[var(--warning)]/10';
      default: return 'border-[var(--muted)] text-[var(--muted)] bg-[var(--muted)]/10';
    }
  };

  const formatEmails = (emails: unknown) => {
    if (Array.isArray(emails)) return emails.join(', ');
    if (typeof emails === 'string') return emails;
    return JSON.stringify(emails);
  };

  return (
    <div className="space-y-6 page-animate">
      <div className="glass-card rounded-[var(--radius)] p-1 overflow-hidden">
        <div className="bg-[var(--card)] p-6 sm:p-8 rounded-[calc(var(--radius)-1px)]">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Mail className="h-5 w-5 text-[var(--primary)]" />
                Email Delivery Logs
              </h2>
              <p className="caption mt-1">Trace every email sent through the system.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={() => fetchLogs()} disabled={loading} className="h-9">
                <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Logs
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-full sm:w-64 space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Organization</Label>
              <select
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)] text-[var(--foreground)]"
                value={filterOrg}
                onChange={(e) => { setFilterOrg(e.target.value); setPage(1); }}
              >
                <option value="all">All Organizations</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.organizationId}>
                    {org.name} ({org.organizationId})
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-48 space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Status</Label>
              <select
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)] text-[var(--foreground)]"
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              >
                <option value="all">All Statuses</option>
                <option value="QUEUED">Queued</option>
                <option value="PROCESSING">Processing</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
                <option value="BOUNCED">Bounced</option>
                <option value="COMPLAINED">Complained</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[color:var(--danger)]/50 bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-5 py-4 text-sm font-medium text-[var(--danger)] shadow-sm">
          {error}
        </div>
      )}

      <div className="surface rounded-[var(--radius)] overflow-hidden">
        <div className="border-b border-[var(--border)] px-6 py-4 bg-[var(--card)] flex justify-between items-center">
          <h3 className="font-semibold">Transaction History</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={!pagination.hasPrevious} onClick={() => setPage(p => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
        
        <div className="p-0 bg-[var(--card)]">
          {logs.length === 0 && !loading ? (
            <div className="p-10 text-center flex flex-col items-center">
              <Search className="h-10 w-10 text-[var(--muted)] mb-3 opacity-50" />
              <p className="caption">No email jobs found matching the current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6 w-10"></TableHead>
                    <TableHead>System ID</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <React.Fragment key={log.id}>
                      <TableRow className="group cursor-pointer hover:bg-[var(--background-elevated)]" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                        <TableCell className="pl-6">
                          {expandedId === log.id ? <ChevronDown className="h-4 w-4 text-[var(--muted)]" /> : <ChevronRight className="h-4 w-4 text-[var(--muted)]" />}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-[var(--primary)]">{log.id.slice(0,8)}...{log.id.slice(-4)}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate" title={formatEmails(log.toEmails)}>
                          {formatEmails(log.toEmails)}
                        </TableCell>
                        <TableCell className="text-sm text-[var(--muted)]">{log.organization?.name || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(log.status)}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-[var(--muted)]">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Details Row */}
                      {expandedId === log.id && (
                        <TableRow className="bg-[var(--background)]/50 hover:bg-[var(--background)]/50">
                          <TableCell colSpan={6} className="p-0 border-b-0">
                            <div className="px-10 py-6 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">Job Details</h4>
                                  <div className="space-y-2 text-sm">
                                    <p><span className="font-medium text-[var(--muted)]">ID:</span> <span className="font-mono">{log.id}</span></p>
                                    <p><span className="font-medium text-[var(--muted)]">From:</span> {log.fromEmail}</p>
                                    <p><span className="font-medium text-[var(--muted)]">To:</span> {formatEmails(log.toEmails)}</p>
                                    <p><span className="font-medium text-[var(--muted)]">Service Key:</span> {log.serviceKey?.name || 'Unknown'}</p>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">Delivery Status</h4>
                                  <div className="space-y-2 text-sm">
                                    <p><span className="font-medium text-[var(--muted)]">Attempts:</span> {log.attempts} / {log.maxAttempts}</p>
                                    {log.sentAt && <p><span className="font-medium text-[var(--muted)]">Sent At:</span> {new Date(log.sentAt).toLocaleString()}</p>}
                                    {log.failureReason && (
                                      <div className="mt-2 text-red-500 bg-red-50 dark:bg-red-950/30 p-2 rounded border border-red-200 dark:border-red-900 text-xs font-mono break-words">
                                        {log.failureReason}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">Event Timeline</h4>
                                {(!log.events || log.events.length === 0) ? (
                                  <p className="text-sm text-[var(--muted)]">No timeline events recorded yet.</p>
                                ) : (
                                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[var(--border)] before:to-transparent">
                                    {log.events.map((event, i) => (
                                      <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-[var(--primary)] text-slate-100 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ml-2.5 md:ml-0 z-10">
                                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2rem)] p-3 rounded shadow-sm bg-[var(--background-elevated)] border border-[var(--border)]">
                                          <div className="flex items-center justify-between mb-1">
                                            <div className="font-bold text-[var(--foreground)] text-sm">{event.eventType}</div>
                                            <div className="text-[10px] text-[var(--muted)]">{new Date(event.timestamp).toLocaleString()}</div>
                                          </div>
                                          {event.details && Object.keys(event.details).length > 0 && (
                                            <pre className="mt-2 text-[10px] p-2 bg-[var(--background)] rounded border border-[var(--border)] overflow-x-auto text-[var(--muted)]">
                                              {JSON.stringify(event.details, null, 2)}
                                            </pre>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
