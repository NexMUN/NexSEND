'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe2, KeyRound, LogOut, ShieldCheck, Building2, RefreshCw, Send, Activity, LayoutDashboard, PanelLeftClose, PanelLeft, Plus, Server, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import type { Domain, DomainDnsResponse, DomainVerificationStatus, Organization, ServiceKey, ServiceKeyWithApiKey } from '@/lib/types';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, 
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, 
  SidebarSeparator, useSidebar 
} from '@/components/ui/sidebar';
import { EmailLogsView } from './email-logs-view';

type DashboardState = {
  organizations: Organization[];
  serviceKeys: ServiceKey[];
  domains: Domain[];
};

const emptyState: DashboardState = {
  organizations: [],
  serviceKeys: [],
  domains: [],
};

type View = 'overview' | 'organizations' | 'service-keys' | 'domains' | 'logs';

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<DashboardState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<View>('overview');
  
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [dnsPreview, setDnsPreview] = useState<DomainDnsResponse | null>(null);
  const [dnsVerificationStatus, setDnsVerificationStatus] = useState<DomainVerificationStatus | null>(null);
  const [newOrg, setNewOrg] = useState({ name: '', organizationId: '', email: '' });
  const [newKeyName, setNewKeyName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [lastGeneratedKey, setLastGeneratedKey] = useState<ServiceKeyWithApiKey | null>(null);

  const selectedOrgObject = useMemo(
    () => state.organizations.find((org) => org.organizationId === selectedOrg),
    [state.organizations, selectedOrg],
  );

  const runAction = async (task: () => Promise<void>) => {
    setSubmitting(true);
    setError(null);
    try {
      await task();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed';
      if (message.toLowerCase().includes('session') || message.toLowerCase().includes('unauthorized')) {
        router.replace('/login');
        return;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    setLastGeneratedKey(null);
    try {
      const session = await api.session();
      if (!session.authenticated) {
        router.replace('/login');
        return;
      }

      const [orgs, keys] = await Promise.all([api.organizations.list(), api.serviceKeys.list()]);
      const organizationItems = orgs.data;
      const serviceKeyItems = keys.data;

      const activeOrg = selectedOrg || (organizationItems.length > 0 ? organizationItems[0].organizationId : '');
      const domains = activeOrg ? await api.domains.list(activeOrg) : [];

      setSelectedOrg(activeOrg);
      setState({
        organizations: organizationItems,
        serviceKeys: serviceKeyItems,
        domains,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      if (message.toLowerCase().includes('session') || message.toLowerCase().includes('unauthorized')) {
        router.replace('/login');
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Allow local logout navigation even when backend is temporarily unreachable.
    }
    router.replace('/login');
  };

  // Organizations
  const onCreateOrg = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(async () => {
      await api.organizations.create(newOrg);
      setNewOrg({ name: '', organizationId: '', email: '' });
      await loadDashboard();
    });
  };

  const onDeleteOrg = async (id: string) => {
    await runAction(async () => {
      await api.organizations.remove(id);
      await loadDashboard();
    });
  };

  // Service Keys
  const onCreateKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(async () => {
      const created = await api.serviceKeys.create({
        name: newKeyName,
        permissions: { organizations: ['*'], domains: ['*'], emails: ['*'], 'service-keys': ['manage'] },
      });
      setLastGeneratedKey(created);
      setNewKeyName('');
      setActiveView('overview'); // Switch to overview to clearly see the key
      await loadDashboard();
    });
  };

  const onDeactivateKey = async (serviceId: string, isActive: boolean) => {
    await runAction(async () => {
      await api.serviceKeys.update(serviceId, { isActive: !isActive });
      await loadDashboard();
    });
  };

  const onDeleteKey = async (serviceId: string) => {
    await runAction(async () => {
      await api.serviceKeys.remove(serviceId, true);
      await loadDashboard();
    });
  };

  // Domains
  const onSelectOrg = async (organizationId: string) => {
    await runAction(async () => {
      setSelectedOrg(organizationId);
      const domains = organizationId ? await api.domains.list(organizationId) : [];
      setState((prev) => ({ ...prev, domains }));
      setDnsPreview(null);
      setDnsVerificationStatus(null);
    });
  };

  const onCreateDomain = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrg) return;
    await runAction(async () => {
      await api.domains.create(selectedOrg, { domain: newDomain, isPrimary: state.domains.length === 0 });
      setNewDomain('');
      const domains = await api.domains.list(selectedOrg);
      setState((prev) => ({ ...prev, domains }));
    });
  };

  const onVerifyDomain = async (domainId: string) => {
    if (!selectedOrg) return;
    await runAction(async () => {
      await api.domains.verify(selectedOrg, domainId);
      const domains = await api.domains.list(selectedOrg);
      setState((prev) => ({ ...prev, domains }));
    });
  };

  const onLoadDns = async (domainId: string) => {
    if (!selectedOrg) return;
    await runAction(async () => {
      const [dns, verificationStatus] = await Promise.all([
        api.domains.dnsRecords(selectedOrg, domainId),
        api.domains.verificationStatus(selectedOrg, domainId),
      ]);
      setDnsPreview(dns);
      setDnsVerificationStatus(verificationStatus);
    });
  };

  if (loading) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <Send className="h-10 w-10 animate-bounce text-[var(--primary)]" />
          <p className="text-sm font-medium tracking-wide text-[var(--muted)]">LOADING NEXSEND...</p>
        </div>
      </main>
    );
  }

  return (
    <SidebarProvider defaultCollapsed={false}>
      <div className="app-root w-full">
        <AppSidebar
          activeView={activeView}
          setActiveView={setActiveView}
          stats={state}
          onLogout={onLogout}
        />
        
        <div className="app-main">
          {/* Topbar */}
          <header className="topbar justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="h-5 w-px bg-[var(--border)]" />
              <p className="font-semibold text-sm">
                {activeView === 'overview' && 'Overview'}
                {activeView === 'organizations' && 'Organizations'}
                {activeView === 'service-keys' && 'Service Keys'}
                {activeView === 'domains' && 'Domains'}
                {activeView === 'logs' && 'Email Logs'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button size="sm" variant="outline" onClick={() => void loadDashboard()} disabled={submitting} className="h-8 shadow-sm">
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="page-scroll p-6 lg:p-10 page-animate">
            <div className="mx-auto max-w-6xl space-y-8">
              
              {/* Header Titles */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="label-tag">
                    <Activity className="h-3.5 w-3.5" />
                    Admin Console
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl">NexSend</h1>
                <p className="max-w-2xl text-base text-[var(--muted)]">
                  The elegant control plane for all your automated communications.
                </p>
              </div>

              {error && (
                <div className="whitespace-pre-line rounded-xl border border-[color:var(--danger)]/50 bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-5 py-4 text-sm font-medium text-[var(--danger)] shadow-sm">
                  {error}
                </div>
              )}

              {/* OVERVIEW TAB */}
              {activeView === 'overview' && (
                <div className="space-y-6 page-animate">
                  {lastGeneratedKey && (
                    <div className="key-banner page-animate">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md">
                          <KeyRound className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold">New Service Key Generated</h2>
                          <p className="text-sm text-[var(--muted)]">Copy it now. It will not be shown again.</p>
                        </div>
                      </div>
                      <div className="space-y-3 pl-13">
                        <p className="text-sm"><span className="font-semibold">Service ID:</span> <span className="font-mono">{lastGeneratedKey.serviceId}</span></p>
                        <p className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 font-mono text-[0.85rem] break-all shadow-inner">
                          {lastGeneratedKey.apiKey}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="stat-card">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white shadow-md">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <p className="caption font-medium uppercase tracking-wider text-[var(--muted)]">Total Orgs</p>
                      <p className="mt-1 text-3xl font-bold tracking-tight">{state.organizations.length}</p>
                    </div>
                    <div className="stat-card">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white shadow-md">
                        <KeyRound className="h-5 w-5" />
                      </div>
                      <p className="caption font-medium uppercase tracking-wider text-[var(--muted)]">Active Keys</p>
                      <p className="mt-1 text-3xl font-bold tracking-tight">{state.serviceKeys.filter(k => k.isActive).length}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{state.serviceKeys.length} total generated</p>
                    </div>
                    <div className="stat-card">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white shadow-md">
                        <Globe2 className="h-5 w-5" />
                      </div>
                      <p className="caption font-medium uppercase tracking-wider text-[var(--muted)]">Verified Domains</p>
                      <p className="mt-1 text-3xl font-bold tracking-tight">{state.domains.filter(d => d.isVerified).length}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{state.domains.length} in currently selected org</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ORGANIZATIONS TAB */}
              {activeView === 'organizations' && (
                <div className="space-y-6 page-animate">
                  <div className="glass-card rounded-[var(--radius)] p-1 overflow-hidden">
                    <div className="bg-[var(--card)] p-6 sm:p-8 rounded-[calc(var(--radius)-1px)]">
                      <div className="mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                          <Plus className="h-5 w-5 text-[var(--primary)]" />
                          Create Organization
                        </h2>
                        <p className="caption mt-1">Add a tenant and assign a unique organization identifier.</p>
                      </div>
                      
                      <form className="grid gap-4 md:grid-cols-3 items-end" onSubmit={onCreateOrg}>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Name</Label>
                          <Input className="h-11 bg-[var(--background-elevated)]" value={newOrg.name} onChange={(e) => setNewOrg((p) => ({ ...p, name: e.target.value }))} required placeholder="Acme Corp" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Org ID</Label>
                          <Input className="h-11 bg-[var(--background-elevated)]" value={newOrg.organizationId} onChange={(e) => setNewOrg((p) => ({ ...p, organizationId: e.target.value }))} required placeholder="acme" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Contact Email</Label>
                          <Input className="h-11 bg-[var(--background-elevated)]" type="email" value={newOrg.email} onChange={(e) => setNewOrg((p) => ({ ...p, email: e.target.value }))} required placeholder="hello@acme.com" />
                        </div>
                        <Button type="submit" className="md:col-span-3 h-11" disabled={submitting}>
                          Provision Organization
                        </Button>
                      </form>
                    </div>
                  </div>

                  <div className="surface rounded-[var(--radius)] overflow-hidden">
                    <div className="border-b border-[var(--border)] px-6 py-4 bg-[var(--card)]">
                      <h3 className="font-semibold">Provisioned Organizations</h3>
                    </div>
                    <div className="p-0 bg-[var(--card)]">
                      {state.organizations.length === 0 ? (
                        <p className="caption p-6 text-center">No organizations yet. Create your first one above.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6">Name</TableHead>
                                <TableHead>Identifier</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right pr-6">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {state.organizations.map((org) => (
                                <TableRow key={org.id} className="group">
                                  <TableCell className="pl-6 font-medium">{org.name}</TableCell>
                                  <TableCell className="font-mono text-xs text-[var(--muted)]">{org.organizationId}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={org.status === 'ACTIVE' ? 'border-[var(--success)] text-[var(--success)] bg-[var(--success)]/10' : 'border-[var(--warning)] text-[var(--warning)] bg-[var(--warning)]/10'}>
                                      {org.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right pr-6">
                                    <Button variant="destructive" size="sm" onClick={() => void onDeleteOrg(org.id)} disabled={submitting} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      Delete
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SERVICE KEYS TAB */}
              {activeView === 'service-keys' && (
                <div className="space-y-6 page-animate">
                  <div className="glass-card rounded-[var(--radius)] p-1 overflow-hidden">
                    <div className="bg-[var(--card)] p-6 sm:p-8 rounded-[calc(var(--radius)-1px)]">
                      <div className="mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                          <Plus className="h-5 w-5 text-[var(--primary)]" />
                          Generate Service Key
                        </h2>
                        <p className="caption mt-1">Issue API keys used by trusted services to trigger NexSend dispatch.</p>
                      </div>
                      
                      <form className="flex flex-col gap-4 sm:flex-row items-end" onSubmit={onCreateKey}>
                        <div className="space-y-2 flex-1">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Key Name</Label>
                          <Input className="h-11 bg-[var(--background-elevated)] max-w-md" placeholder="e.g. Production Backend Service" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} required />
                        </div>
                        <Button type="submit" disabled={submitting} className="h-11 px-8">
                          Generate Key
                        </Button>
                      </form>
                    </div>
                  </div>

                  <div className="surface rounded-[var(--radius)] overflow-hidden">
                    <div className="border-b border-[var(--border)] px-6 py-4 bg-[var(--card)]">
                      <h3 className="font-semibold">Active Service Keys</h3>
                    </div>
                    <div className="p-0 bg-[var(--card)]">
                      {state.serviceKeys.length === 0 ? (
                        <p className="caption p-6 text-center">No service keys generated yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6">Name</TableHead>
                                <TableHead>Service ID</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right pr-6">Management</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {state.serviceKeys.map((key) => (
                                <TableRow key={key.id}>
                                  <TableCell className="pl-6 font-medium">{key.name}</TableCell>
                                  <TableCell className="font-mono text-xs">{key.serviceId}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={key.isActive ? 'border-[var(--success)] text-[var(--success)] bg-[var(--success)]/10' : 'border-[var(--danger)] text-[var(--danger)] bg-[var(--danger)]/10'}>
                                      {key.isActive ? 'ACTIVE' : 'INACTIVE'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap justify-end gap-2 pr-6">
                                      <Button size="sm" variant="outline" className="h-8" onClick={() => void onDeactivateKey(key.serviceId, key.isActive)} disabled={submitting}>
                                        {key.isActive ? 'Revoke' : 'Restore'}
                                      </Button>
                                      <Button size="sm" variant="destructive" className="h-8" onClick={() => void onDeleteKey(key.serviceId)} disabled={submitting}>
                                        Delete
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* DOMAINS TAB */}
              {activeView === 'domains' && (
                <div className="space-y-6 page-animate">
                  <div className="glass-card rounded-[var(--radius)] p-1 overflow-hidden">
                    <div className="bg-[var(--card)] p-6 sm:p-8 rounded-[calc(var(--radius)-1px)]">
                      <div className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                          <h2 className="text-xl font-bold flex items-center gap-2">
                            <Server className="h-5 w-5 text-[var(--primary)]" />
                            Domain Registration
                          </h2>
                          <p className="caption mt-1">Configure verified sending domains for your organizations.</p>
                        </div>
                        
                        <div className="w-full sm:w-64">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2 block text-right">Target Organization</Label>
                          <select
                            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)] text-[var(--foreground)]"
                            value={selectedOrg}
                            onChange={(event) => void onSelectOrg(event.target.value)}
                          >
                            <option value="">Select organization...</option>
                            {state.organizations.map((org) => (
                              <option key={org.id} value={org.organizationId}>
                                {org.name} ({org.organizationId})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {selectedOrg && (
                        <>
                          <div className="my-6 h-px w-full bg-[var(--border)]" />
                          <form className="flex flex-col gap-4 sm:flex-row items-end" onSubmit={onCreateDomain}>
                            <div className="space-y-2 flex-1">
                              <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Domain Name</Label>
                              <Input className="h-11 bg-[var(--background-elevated)] max-w-md" placeholder="notify.acmecorp.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} required />
                            </div>
                            <Button type="submit" disabled={!selectedOrg || submitting} className="h-11 px-8">
                              Add Domain
                            </Button>
                          </form>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedOrg && (
                    <div className="surface rounded-[var(--radius)] overflow-hidden">
                      <div className="border-b border-[var(--border)] px-6 py-4 bg-[var(--card)] flex flex-wrap gap-4 items-center justify-between">
                        <h3 className="font-semibold">Domains for <span className="text-[var(--primary)]">{selectedOrgObject?.name || selectedOrg}</span></h3>
                      </div>
                      <div className="p-0 bg-[var(--card)]">
                        {state.domains.length === 0 ? (
                          <p className="caption p-6 text-center">No domains mapped. Add a sending domain above.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="pl-6">Domain</TableHead>
                                  <TableHead>Verification Status</TableHead>
                                  <TableHead className="text-right pr-6">Configuration</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {state.domains.map((domain) => (
                                  <TableRow key={domain.id}>
                                    <TableCell className="pl-6 font-medium">{domain.domain}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={domain.isVerified ? 'border-[var(--success)] text-[var(--success)] bg-[var(--success)]/10' : 'border-[var(--warning)] text-[var(--warning)] bg-[var(--warning)]/10'}>
                                        {domain.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-wrap justify-end gap-2 pr-6">
                                        <Button size="sm" variant="outline" className="h-8" onClick={() => void onLoadDns(domain.id)} disabled={submitting}>
                                          View DNS
                                        </Button>
                                        <Button size="sm" className="h-8" onClick={() => void onVerifyDomain(domain.id)} disabled={submitting || domain.isVerified}>
                                          Verify Now
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {dnsPreview && (
                    <div className="surface rounded-[var(--radius)] overflow-hidden page-animate border-[var(--primary)]/30 border-2">
                      <div className="border-b border-[var(--border)] px-6 py-4 bg-[var(--card)]">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Server className="h-4 w-4 text-[var(--primary)]" />
                          Required DNS Records for {dnsPreview.domain}
                        </h3>
                        <p className="text-sm text-[var(--muted)] mt-1">Add these to your domain registrar directly.</p>
                        {dnsVerificationStatus && (
                          <p className="text-xs text-[var(--muted)] mt-2">
                            Overall verification status: <span className="font-semibold">{dnsVerificationStatus.overallStatus}</span>
                          </p>
                        )}
                      </div>
                      <div className="p-6 bg-[color-mix(in_srgb,var(--card)_80%,transparent)] space-y-4">
                        {dnsPreview.requiredRecords.map((record) => (
                          <div key={`${record.checkType || 'required'}-${record.resolvedRecord.name}`} className="rounded-xl border border-[var(--border)] bg-[var(--background-elevated)] p-4 shadow-sm">
                            <div className="flex gap-4 items-center mb-2">
                              <Badge className="bg-[var(--primary)] text-[var(--primary-foreground)] rounded-md px-2">{record.resolvedRecord.type}</Badge>
                              <code className="text-sm font-bold text-[var(--foreground)]">{record.resolvedRecord.name}</code>
                              {record.checkType && (() => {
                                const check = dnsVerificationStatus?.checks.find((item) => item.type === record.checkType);
                                if (!check) return null;
                                const passed = check.status === 'PASSED';
                                return (
                                  <Badge
                                    variant="outline"
                                    className={passed
                                      ? 'border-[var(--success)] text-[var(--success)] bg-[var(--success)]/10'
                                      : 'border-[var(--danger)] text-[var(--danger)] bg-[var(--danger)]/10'}
                                  >
                                    {passed ? 'VERIFIED' : 'NOT VERIFIED'}
                                  </Badge>
                                );
                              })()}
                            </div>
                            <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 overflow-x-auto">
                              <code className="text-[0.8rem] text-[var(--muted)] break-all">{record.resolvedRecord.value}</code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* LOGS TAB */}
              {activeView === 'logs' && (
                <EmailLogsView organizations={state.organizations} activeOrgId={selectedOrg} />
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function SidebarTrigger() {
  const { collapsed, setCollapsed } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-[var(--muted)] hover:text-[var(--foreground)]"
      onClick={() => setCollapsed(!collapsed)}
    >
      {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
    </Button>
  );
}

function AppSidebar({ 
  activeView, 
  setActiveView, 
  stats,
  onLogout
}: { 
  activeView: View; 
  setActiveView: (v: View) => void;
  stats: DashboardState;
  onLogout: () => void;
}) {
  const { collapsed } = useSidebar();
  
  return (
    <Sidebar>
      <SidebarHeader className="h-16 justify-center">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white shadow-sm ring-1 ring-[var(--primary)]/20">
            <Send className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-[var(--sidebar-fg)] mix-blend-plus-lighter">
              NexSend
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="mt-4">
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={activeView === 'overview'} 
                icon={<LayoutDashboard className="h-4 w-4" />} 
                label="Overview" 
                onClick={() => setActiveView('overview')}
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={activeView === 'organizations'} 
                icon={<Building2 className="h-4 w-4" />} 
                label="Organizations" 
                badge={stats.organizations.length}
                onClick={() => setActiveView('organizations')}
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={activeView === 'service-keys'} 
                icon={<KeyRound className="h-4 w-4" />} 
                label="Service Keys" 
                badge={stats.serviceKeys.filter(k => k.isActive).length}
                onClick={() => setActiveView('service-keys')}
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={activeView === 'domains'} 
                icon={<Globe2 className="h-4 w-4" />} 
                label="Domains" 
                badge={stats.domains.filter(d => d.isVerified).length}
                onClick={() => setActiveView('domains')}
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={activeView === 'logs'} 
                icon={<Mail className="h-4 w-4" />} 
                label="Logs" 
                onClick={() => setActiveView('logs')}
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {!collapsed ? (
          <div className="flex w-full items-center justify-between">
            <p className="text-[0.7rem] font-medium text-[var(--muted)]">© NexMUN</p>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)] hover:text-white" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)] hover:text-white" onClick={onLogout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
