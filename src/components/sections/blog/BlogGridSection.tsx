import { useMemo, useState } from "react";

import { BlogCard } from "@/components/shared/BlogCard";
import { Tabs } from "@/components/ui/tabs";
import { blogPosts } from "@/data/blog";

const filters = ["All", "Data Analytics", "Web Dev", "AI", "Career Tips"] as const;

export function BlogGridSection() {
  const [active, setActive] = useState<(typeof filters)[number]>("All");

  const posts = useMemo(() => {
    if (active === "All") {
      return blogPosts;
    }

    return blogPosts.filter((post) => post.category === active);
  }, [active]);

  return (
    <section className="py-20">
      <div className="container-shell">
        <Tabs className="justify-center" value={active} onChange={(value) => setActive(value as (typeof filters)[number])} items={[...filters]} />
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
