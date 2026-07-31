'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/ui/page-header';
import { useState } from 'react';
import { Plus, ExternalLink } from 'lucide-react';
import { CMS_PAGE_TYPES, type CmsBannerDto, type CmsMenuDto, type CmsPageDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import {
  useCmsPages, useCreateCmsPage, useCmsBanners, useCreateCmsBanner, useCmsMenus, useCreateCmsMenu,
} from '@/lib/hooks/use-admin';
import { useAbility } from '@/lib/auth-store';

type Tab = 'pages' | 'banners' | 'menus';

export default function FrontCmsPage() {
  const ability = useAbility();
  const canAdd = ability.can('front_cms', 'add');
  const [tab, setTab] = useState<Tab>('pages');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);

  const pages = useCmsPages({ page, size: 25 });
  const banners = useCmsBanners();
  const menus = useCmsMenus();
  const cPage = useCreateCmsPage();
  const cBanner = useCreateCmsBanner();
  const cMenu = useCreateCmsMenu();

  const [f, setF] = useState<Record<string, string>>({ pageType: 'standard', published: 'true' });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const pageCols: Column<CmsPageDto>[] = [
    { key: 'title', header: 'Title', className: 'font-medium' },
    { key: 'slug', header: 'Slug', render: (p) => <code className="text-xs">/{p.slug}</code> },
    { key: 'pageType', header: 'Type' },
    { key: 'published', header: 'Status', render: (p) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.published ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{p.published ? 'Published' : 'Draft'}</span> },
  ];
  const bannerCols: Column<CmsBannerDto>[] = [
    { key: 'title', header: 'Title', className: 'font-medium' },
    { key: 'imageUrl', header: 'Image', render: (b) => b.imageUrl ? <a href={b.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary"><ExternalLink className="h-3.5 w-3.5" /> View</a> : '—' },
    { key: 'sortOrder', header: 'Order', className: 'tabular' },
    { key: 'active', header: 'Active', render: (b) => (b.active ? 'Yes' : 'No') },
  ];
  const menuCols: Column<CmsMenuDto>[] = [
    { key: 'label', header: 'Label', className: 'font-medium' },
    { key: 'url', header: 'URL' },
    { key: 'sortOrder', header: 'Order', className: 'tabular' },
  ];

  async function save() {
    if (tab === 'pages') await cPage.mutateAsync({ title: f.title, slug: f.slug, pageType: (f.pageType || 'standard') as never, body: f.body, published: f.published === 'true' });
    else if (tab === 'banners') await cBanner.mutateAsync({ title: f.title, imageUrl: f.imageUrl, link: f.link, sortOrder: Number(f.sortOrder) || 0, active: true });
    else await cMenu.mutateAsync({ label: f.label, url: f.url, sortOrder: Number(f.sortOrder) || 0 });
    setOpen(false); setF({ pageType: 'standard', published: 'true' });
  }

  const label = tab === 'pages' ? 'Page' : tab === 'banners' ? 'Banner' : 'Menu';

  return (
    <div className="space-y-4">
      <PageHeader
        title="Front CMS"
        description="Manage the public website — pages, banners and menus"
        actions={canAdd && <Button onClick={() => { setF({ pageType: 'standard', published: 'true' }); setOpen(true); }}><Plus className="h-4 w-4" /> Add {label}</Button>}
      />

      <Tabs tabs={[{ value: 'pages', label: 'Pages' }, { value: 'banners', label: 'Banners' }, { value: 'menus', label: 'Menus' }]} value={tab} onChange={(t) => { setTab(t as Tab); setPage(1); }} />

      {tab === 'pages' && <DataTable columns={pageCols} rows={pages.data?.data ?? []} meta={pages.data?.meta} loading={pages.isLoading} search="" onSearch={() => {}} onPage={setPage} onSize={() => {}} />}
      {tab === 'banners' && <DataTable columns={bannerCols} rows={banners.data ?? []} loading={banners.isLoading} search="" onSearch={() => {}} onPage={() => {}} onSize={() => {}} />}
      {tab === 'menus' && <DataTable columns={menuCols} rows={menus.data ?? []} loading={menus.isLoading} search="" onSearch={() => {}} onPage={() => {}} onSize={() => {}} />}

      <FormDrawer open={open} title={`Add ${label}`} onClose={() => setOpen(false)} onSubmit={save} submitting={cPage.isPending || cBanner.isPending || cMenu.isPending}>
        <div className="space-y-4">
          {tab === 'pages' && (
            <>
              <Field label="Title" required><TextInput value={f.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
              <Field label="Slug" required><TextInput value={f.slug ?? ''} onChange={(e) => set('slug', e.target.value)} placeholder="about-us" /></Field>
              <Field label="Page Type"><Select value={f.pageType ?? 'standard'} onChange={(e) => set('pageType', e.target.value)} options={CMS_PAGE_TYPES.map((t) => ({ value: t, label: t }))} /></Field>
              <Field label="Body"><TextArea rows={5} value={f.body ?? ''} onChange={(e) => set('body', e.target.value)} /></Field>
              <Checkbox label="Published" checked={f.published === 'true'} onChange={(e) => set('published', e.target.checked ? 'true' : 'false')} />
            </>
          )}
          {tab === 'banners' && (
            <>
              <Field label="Title" required><TextInput value={f.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
              <Field label="Image URL"><TextInput value={f.imageUrl ?? ''} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…" /></Field>
              <Field label="Link"><TextInput value={f.link ?? ''} onChange={(e) => set('link', e.target.value)} /></Field>
              <Field label="Sort Order"><TextInput type="number" value={f.sortOrder ?? '0'} onChange={(e) => set('sortOrder', e.target.value)} /></Field>
            </>
          )}
          {tab === 'menus' && (
            <>
              <Field label="Label" required><TextInput value={f.label ?? ''} onChange={(e) => set('label', e.target.value)} /></Field>
              <Field label="URL" required><TextInput value={f.url ?? ''} onChange={(e) => set('url', e.target.value)} placeholder="/about-us" /></Field>
              <Field label="Sort Order"><TextInput type="number" value={f.sortOrder ?? '0'} onChange={(e) => set('sortOrder', e.target.value)} /></Field>
            </>
          )}
        </div>
      </FormDrawer>
    </div>
  );
}
