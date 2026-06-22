import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { BlogPost } from "@/types/blog";

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Card className="group h-full overflow-hidden p-6 hover:-translate-y-1">
      <Badge className="border-slate-200 bg-slate-50 text-slate-600">{post.category}</Badge>
      <div className="mt-5 h-44 rounded-[24px] bg-gradient-brand p-6">
        <div className="flex h-full items-end">
          <p className="max-w-[10rem] font-display text-2xl font-bold text-white">{post.readTime}</p>
        </div>
      </div>
      <p className="mt-5 text-sm text-slate-500">{post.date}</p>
      <h3 className="mt-3 text-2xl font-bold text-slate-950">{post.title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{post.excerpt}</p>
      <Link className="mt-5 inline-flex items-center gap-2 font-semibold text-deep-blue" to={`/blog/${post.slug}`}>
        Read More <ArrowRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}
