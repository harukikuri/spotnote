import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/layouts/docs/page';
import { getMDXComponents } from '@/components/mdx';
import { Footer } from '@/components/footer';

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) notFound();

  const Mdx = page.data.body;

  return (
    // No previous/next cards under the page (guides end with their own Next
    // link); our footer closes the page instead. Less room above the title than
    // Fumadocs gives (md:pt-8 xl:pt-14).
    <DocsPage toc={page.data.toc} footer={{ enabled: false }} className="md:pt-6 xl:pt-10">
      {page.data.headline && (
        // Styled like the breadcrumb other pages show above their title.
        <p className="text-sm font-medium text-fd-primary">{page.data.title}</p>
      )}
      <DocsTitle className="font-medium">{page.data.headline ?? page.data.title}</DocsTitle>
      <DocsDescription>{emphasize(page.data.description, page.data.strong)}</DocsDescription>
      <DocsBody>
        <Mdx components={getMDXComponents()} />
      </DocsBody>
      <Footer />
    </DocsPage>
  );
}

// The description, with its `strong` words (frontmatter) in bold.
function emphasize(text?: string, strong?: string) {
  const at = strong && text ? text.indexOf(strong) : -1;
  if (!text || !strong || at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <strong className="font-semibold text-fd-foreground">{strong}</strong>
      {text.slice(at + strong.length)}
    </>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}
