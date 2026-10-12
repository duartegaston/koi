"use client";

import { useActionState } from "react";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
  type CategoryFormState,
} from "@/actions/admin-categories";
import { Button } from "@/components/ui/button";
import { InputField, TextareaField } from "@/components/ui/field";

const initialState: CategoryFormState = { status: "idle" };

type CategoryOption = { id: string; name: string; isActive: boolean };

export type EditableCategory = CategoryOption & {
  slug: string;
  description: string | null;
  sortOrder: number;
  productCount: number;
};

export function CategoryCreateForm() {
  const [state, action, pending] = useActionState(createCategoryAction, initialState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4 border border-line bg-surface px-5 py-6" noValidate>
      <h2 className="font-display text-2xl">Nueva categoría</h2>
      {state.status === "error" ? (
        <p role="alert" className="text-sm">
          {state.message}
        </p>
      ) : null}
      <InputField id="new-category-name" label="Nombre" name="name" required errors={errors?.name} />
      <TextareaField id="new-category-description" label="Descripción" name="description" errors={errors?.description} />
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando" : "Agregar"}
      </Button>
    </form>
  );
}

export function CategoryEditForm({ category }: { category: EditableCategory }) {
  const [state, action, pending] = useActionState(updateCategoryAction, initialState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="categoryId" value={category.id} />
      <p className="text-sm text-muted">
        {productCountLabel(category.productCount)}
        {category.isActive ? " · Visible" : " · Oculta"}
      </p>
      {state.status === "error" ? (
        <p role="alert" className="text-sm">
          {state.message}
        </p>
      ) : null}
      {state.status === "saved" ? (
        <p role="status" className="text-sm">
          Cambios guardados.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <InputField id={`${category.id}-name`} label="Nombre" name="name" required defaultValue={category.name} errors={errors?.name} />
        <InputField id={`${category.id}-slug`} label="Slug" name="slug" required defaultValue={category.slug} errors={errors?.slug} />
        <InputField
          id={`${category.id}-sort`}
          label="Orden"
          name="sortOrder"
          type="number"
          min={0}
          required
          defaultValue={category.sortOrder}
          errors={errors?.sortOrder}
        />
      </div>
      <TextareaField
        id={`${category.id}-description`}
        label="Descripción"
        name="description"
        defaultValue={category.description ?? ""}
        errors={errors?.description}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={category.isActive} />
        Visible en la tienda
      </label>
      <p className="text-sm text-muted">Si la ocultás, sus productos dejan de aparecer en el catálogo.</p>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando" : "Guardar"}
      </Button>
    </form>
  );
}

export function CategoryDeleteForm({
  category,
  others,
}: {
  category: EditableCategory;
  others: CategoryOption[];
}) {
  const [state, action, pending] = useActionState(deleteCategoryAction, initialState);
  const blocked = category.productCount > 0 && others.length === 0;

  if (blocked) {
    return (
      <p className="text-sm text-muted">Creá otra categoría para mover estos productos antes de eliminarla.</p>
    );
  }

  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(event) => {
        const form = event.currentTarget;
        const select = form.elements.namedItem("reassignTo");
        const target = select instanceof HTMLSelectElement ? select.selectedOptions[0]?.text : "";
        const message =
          category.productCount > 0
            ? `Los productos pasan a ${target} y se elimina la categoría.`
            : "Se elimina la categoría.";
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <input type="hidden" name="categoryId" value={category.id} />
      {category.productCount > 0 ? (
        <label className="block space-y-1.5 text-sm">
          <span className="block font-medium">Mover productos a</span>
          <select name="reassignTo" required defaultValue="" className="h-11 w-full border border-line bg-background px-3">
            <option value="" disabled>
              Elegí una categoría
            </option>
            {others.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
                {option.isActive ? "" : " (oculta)"}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="reassignTo" value="" />
      )}
      {state.status === "error" ? (
        <p role="alert" className="text-sm">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Eliminando" : "Eliminar"}
      </Button>
    </form>
  );
}

function productCountLabel(count: number): string {
  if (count === 0) return "Sin productos";
  if (count === 1) return "1 producto";
  return `${count} productos`;
}
