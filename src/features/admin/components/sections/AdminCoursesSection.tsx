import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ManagedCourse } from "@/types/admin";
import { formatCurrencyFromNaira } from "@/features/admin/utils";

import { AdminPanel, ConfirmDialog, EmptyState, Field, ToggleField } from "../AdminPrimitives";

function SortableCourseRow({ active, course, onSelect }: { active: boolean; course: ManagedCourse; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: course.slug });

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border px-4 py-4 text-left transition",
        active ? "border-brand-gold bg-brand-gold/10" : "border-slate-200 bg-white hover:border-slate-300",
      )}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <div>
        <p className="font-semibold text-slate-950">{course.title}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{course.slug}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-slate-950">{formatCurrencyFromNaira(course.priceNaira)}</p>
        <p className="mt-1 text-xs text-slate-500">{course.published ? "Published" : "Hidden"}</p>
      </div>
    </button>
  );
}

export function AdminCoursesSection({
  courseDraft,
  courses,
  onChangeDraft,
  onDeleteCourse,
  onDragEnd,
  onSaveCourse,
  pricingPreview,
  selectedCourseSlug,
  selectCourse,
}: {
  courseDraft: ManagedCourse | null;
  courses: ManagedCourse[];
  onChangeDraft: (draft: ManagedCourse) => void;
  onDeleteCourse: () => Promise<void>;
  onDragEnd: (event: DragEndEvent) => Promise<void>;
  onSaveCourse: () => Promise<boolean>;
  pricingPreview: ReturnType<typeof import("@/lib/paystackPricing").getCheckoutPricing> | null;
  selectedCourseSlug: string;
  selectCourse: (slug: string, sourceCourses?: ManagedCourse[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!courseDraft) {
      setMobileEditorOpen(false);
    }
  }, [courseDraft]);

  const isDirty = useMemo(() => {
    if (!courseDraft) {
      return false;
    }

    const sourceCourse = courses.find((course) => course.slug === selectedCourseSlug);
    if (!sourceCourse) {
      return false;
    }

    return JSON.stringify({
      slug: courseDraft.slug,
      title: courseDraft.title,
      shortTitle: courseDraft.shortTitle || "",
      priceNaira: courseDraft.priceNaira,
      summary: courseDraft.summary,
      longDescription: courseDraft.longDescription,
      deliverables: courseDraft.deliverables,
      published: courseDraft.published,
      featured: courseDraft.featured,
    }) !==
      JSON.stringify({
        slug: sourceCourse.slug,
        title: sourceCourse.title,
        shortTitle: sourceCourse.shortTitle || "",
        priceNaira: sourceCourse.priceNaira,
        summary: sourceCourse.summary,
        longDescription: sourceCourse.longDescription,
        deliverables: sourceCourse.deliverables,
        published: sourceCourse.published,
        featured: sourceCourse.featured,
      });
  }, [courseDraft, courses, selectedCourseSlug]);

  async function handleMobileSave() {
    const saved = await onSaveCourse();
    if (saved) {
      setMobileEditorOpen(false);
    }
  }

  const editorContent = courseDraft ? (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Slug">
          <Input className="rounded-lg" value={courseDraft.slug} onChange={(event) => onChangeDraft({ ...courseDraft, slug: event.target.value })} />
        </Field>
        <Field label="Title">
          <Input className="rounded-lg" value={courseDraft.title} onChange={(event) => onChangeDraft({ ...courseDraft, title: event.target.value })} />
        </Field>
      </div>

      <Field label="Short Title">
        <Input className="rounded-lg" value={courseDraft.shortTitle || ""} onChange={(event) => onChangeDraft({ ...courseDraft, shortTitle: event.target.value })} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Net Price You Want To Receive">
          <Input className="rounded-lg" type="number" value={courseDraft.priceNaira} onChange={(event) => onChangeDraft({ ...courseDraft, priceNaira: Number(event.target.value || 0) })} />
        </Field>
        <Field label="Paystack Final Charge Preview">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-950">{formatCurrencyFromNaira(pricingPreview?.totalChargeNaira || 0)}</p>
            <p className="mt-1 text-xs text-slate-500">Includes {formatCurrencyFromNaira(pricingPreview?.processingFeeNaira || 0)} processing fee</p>
          </div>
        </Field>
      </div>

      <Field label="Summary">
        <Textarea className="min-h-28 rounded-lg" value={courseDraft.summary} onChange={(event) => onChangeDraft({ ...courseDraft, summary: event.target.value })} />
      </Field>

      <Field label="Long Description">
        <Textarea className="rounded-lg" value={courseDraft.longDescription} onChange={(event) => onChangeDraft({ ...courseDraft, longDescription: event.target.value })} />
      </Field>

      <Field label="Deliverables">
        <Textarea
          className="min-h-32 rounded-lg"
          value={courseDraft.deliverables.join("\n")}
          onChange={(event) =>
            onChangeDraft({
              ...courseDraft,
              deliverables: event.target.value
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <ToggleField checked={courseDraft.published} label="Published" onChange={(checked) => onChangeDraft({ ...courseDraft, published: checked })} />
        <ToggleField checked={courseDraft.featured} label="Featured listing" onChange={(checked) => onChangeDraft({ ...courseDraft, featured: checked })} />
      </div>
    </div>
  ) : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.2fr]">
      <AdminPanel>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-sm">Catalog Order</p>
            <h3 className="mt-2 text-lg font-bold text-slate-950 sm:text-2xl">Drag to reorder</h3>
          </div>
        </div>
        <div className="mt-6">
          {courses.length === 0 ? (
            <EmptyState title="No courses yet" description="Managed courses will appear here once they exist in Firestore." compact />
          ) : (
            <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd} sensors={sensors}>
              <SortableContext items={courses.map((course) => course.slug)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {courses.map((course) => (
                    <SortableCourseRow
                      key={course.slug}
                      active={selectedCourseSlug === course.slug}
                      course={course}
                      onSelect={() => {
                        selectCourse(course.slug);
                        if (window.matchMedia("(max-width: 1279px)").matches) {
                          setMobileEditorOpen(true);
                        }
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </AdminPanel>

      <AdminPanel className="hidden xl:flex xl:min-h-0 xl:flex-col">
        {courseDraft ? (
          <>
            <ScrollArea className="min-h-0 flex-1 pr-3">
              <div className="space-y-6">
                {editorContent}
              </div>
            </ScrollArea>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button className="w-full rounded-lg shadow-none hover:translate-y-0 sm:w-auto" onClick={onSaveCourse} variant="gold">
                Save Course
              </Button>
              <Button className="w-full rounded-lg border border-rose-200 bg-white text-rose-700 shadow-none hover:bg-rose-50 hover:translate-y-0 sm:w-auto" onClick={() => setDeleteDialogOpen(true)} variant="ghost">
                Hard Delete
              </Button>
            </div>
          </>
        ) : (
          <EmptyState title="Select a course" description="Choose a course from the left to edit details, pricing, and publish state." compact />
        )}
      </AdminPanel>

      <Sheet onOpenChange={setMobileEditorOpen} open={mobileEditorOpen}>
        <SheetContent className="xl:hidden">
          {courseDraft ? (
            <>
              <SheetHeader>
                <SheetTitle>{courseDraft.title}</SheetTitle>
                <SheetDescription>Edit course details, pricing, and listing state.</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto pr-1">{editorContent}</div>
              <SheetFooter>
                <Button className="rounded-lg border border-rose-200 bg-white text-rose-700 shadow-none hover:bg-rose-50 hover:translate-y-0" onClick={() => setDeleteDialogOpen(true)} variant="ghost">
                  Hard Delete
                </Button>
                <Button className="rounded-lg shadow-none hover:translate-y-0" disabled={!isDirty} onClick={handleMobileSave} variant="gold">
                  Save Course
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        confirmLabel="Delete course"
        description={courseDraft ? `${courseDraft.title} will be permanently removed from the managed catalog.` : "This course will be permanently removed from the managed catalog."}
        onConfirm={async () => {
          await onDeleteCourse();
          setDeleteDialogOpen(false);
        }}
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
        title="Delete this course?"
      />
    </div>
  );
}
