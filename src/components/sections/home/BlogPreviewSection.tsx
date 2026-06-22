import { Link } from "react-router-dom";

import { BlogCard } from "@/components/shared/BlogCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { blogPosts } from "@/data/blog";

export function BlogPreviewSection() {
  return (
    <section className="bg-white py-20">
      <div className="container-shell">
        <SectionHeader
          eyebrow="Resources"
          heading="Insights & Resources"
          subtext="Stay ahead with articles, guides, and career tips from our expert instructors."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {blogPosts.slice(0, 3).map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button asChild variant="ghost" className="rounded-full border border-slate-200 bg-white">
            <Link to="/blog">Read All Articles</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
