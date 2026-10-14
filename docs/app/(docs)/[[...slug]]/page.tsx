import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import {
  DocsPage,
  DocsBody,
  DocsTitle,
  DocsDescription,
} from 'fumadocs-ui/layouts/docs/page';
import { getMDXComponents } from '@/components/mdx';

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) notFound();

  const Mdx = page.data.body;

  return (
    // No previous/next cards under the page (guides end with their own Next
    // link); the padding keeps the room they took above the site footer.
    <DocsPage toc={page.data.toc} footer={{ enabled: false }} className="pb-24">
      {page.data.headline && (
        // Styled like the breadcrumb other pages show above their title.
        <p className="text-sm font-medium text-fd-primary">{page.data.title}</p>
      )}
      <DocsTitle className="font-medium">{page.data.headline ?? page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <Mdx components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}
