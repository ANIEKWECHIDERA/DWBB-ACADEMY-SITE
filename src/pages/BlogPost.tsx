import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { blogPosts } from "@/data/blog";
import { buildBlogEnquiryUrl } from "@/lib/whatsapp";

export default function BlogPost() {
  const { slug } = useParams();
  const post = blogPosts.find((item) => item.slug === slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <section className="py-16">
      <div className="container-shell">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: post.title }]} />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
          <article>
            <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">{post.category}</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold sm:text-5xl">{post.title}</h1>
            <p className="mt-4 text-sm text-slate-500">
              {post.date} · {post.readTime}
            </p>
            <div className="mt-8 h-72 rounded-[32px] bg-gradient-brand" />
            <div className="prose prose-slate mt-10 max-w-none">
              {post.body.map((paragraph) => (
                <p key={paragraph} className="mb-6 text-base leading-8 text-slate-700">
                  {paragraph}
                </p>
              ))}
            </div>
          </article>
          <aside>
            <Card className="sticky top-28 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">Interested in this topic?</p>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Talk to DWBB Academy about the skills behind this article and which program fits your goals.
              </p>
              <div className="mt-6 space-y-3">
                <Button asChild variant="gold" className="w-full">
                  <a href={buildBlogEnquiryUrl(post.title)} target="_blank" rel="noreferrer">
                    Chat on WhatsApp <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="ghost" className="w-full rounded-full border border-slate-200 bg-white">
                  <Link to="/blog">
                    <ArrowLeft className="h-4 w-4" /> Back to Blog
                  </Link>
                </Button>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </section>
  );
}
