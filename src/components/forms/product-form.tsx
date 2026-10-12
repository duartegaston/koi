"use client";

import { useActionState, useRef, useState } from "react";
import { createProductAction, updateProductAction, type ProductFormState } from "@/actions/admin-products";
import { Button, buttonClass } from "@/components/ui/button";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import { maxImagesPerProduct } from "@/lib/images/detect";
import { safeImageUrl } from "@/lib/safe-url";
import { slugify } from "@/lib/slug";

type CategoryOption = { id: string; name: string };

type ProductImage = { id: string; url: string; alt: string | null };

type ProductDefaults = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: number;
  maxPerOrder: number | null;
  isFeatured: boolean;
  isActive: boolean;
  categoryId: string;
  images: ProductImage[];
};

const initialState: ProductFormState = { status: "idle" };

export function ProductForm({ categories, product }: { categories: CategoryOption[]; product?: ProductDefaults }) {
  const action = product ? updateProductAction : createProductAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}
      {state.status === "error" ? (
        <p role="alert" className="border border-line bg-surface px-4 py-3 text-sm">
          {state.message}
        </p>
      ) : null}
      {state.status === "saved" ? (
        <p role="status" className="border border-line bg-surface px-4 py-3 text-sm">
          Cambios guardados.
        </p>
      ) : null}

      <InputField
        label="Nombre"
        name="name"
        required
        defaultValue={product?.name}
        errors={errors?.name}
        onChange={(event) => {
          if (!slugTouched) setSlug(slugify(event.target.value));
        }}
      />
      <InputField
        label="Slug"
        name="slug"
        required
        value={slug}
        errors={errors?.slug}
        onChange={(event) => {
          setSlugTouched(true);
          setSlug(slugify(event.target.value));
        }}
      />
      <TextareaField label="Descripción" name="description" required defaultValue={product?.description} errors={errors?.description} />
      <div className="grid gap-4 md:grid-cols-2">
        <InputField label="Precio" name="price" inputMode="decimal" required defaultValue={product?.price} errors={errors?.price} />
        <SelectField label="Categoría" name="categoryId" required defaultValue={product?.categoryId} errors={errors?.categoryId}>
          <option value="">Elegí una categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <InputField label="Stock" name="stock" type="number" min={0} required defaultValue={product?.stock ?? 0} errors={errors?.stock} />
        <InputField
          label="Máximo por pedido"
          name="maxPerOrder"
          type="number"
          min={1}
          defaultValue={product?.maxPerOrder ?? ""}
          errors={errors?.maxPerOrder}
        />
      </div>

      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={product?.isActive ?? true} />
          Visible en la tienda
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured ?? false} />
          Destacado
        </label>
      </div>
      <p className="text-sm text-muted">
        Los destacados aparecen en la página principal. Se muestran todos los que marques. Si no hay ninguno, aparecen los primeros 8 del catálogo.
      </p>

      {product && product.images.length > 0 ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Fotos actuales</legend>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {product.images.map((image) => {
              const src = safeImageUrl(image.url);
              return (
                <li key={image.id} className="border border-line bg-surface">
                  {src ? (
                    // Las fotos pueden ser URLs externas o /media. El componente de la tienda recorta a pantalla completa.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={image.alt ?? product.name} className="aspect-[3/4] w-full object-cover" />
                  ) : null}
                  <label className="flex items-center gap-2 px-3 py-2 text-sm">
                    <input type="checkbox" name="removeImage" value={image.id} />
                    Quitar
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}

      <ImagePicker label={product ? "Agregar fotos" : "Fotos"} />

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando" : product ? "Guardar cambios" : "Crear producto"}
      </Button>
    </form>
  );
}

function ImagePicker({ label }: { label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState<string[]>([]);
  const chosen = names.length === 0 ? "Sin archivos seleccionados" : names.length === 1 ? names[0] : `${names.length} archivos`;

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        className={buttonClass.secondary}
        aria-describedby="images-status"
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </button>
      <input
        ref={inputRef}
        id="images"
        name="images"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        tabIndex={-1}
        aria-label={label}
        className="sr-only"
        onChange={(event) => setNames(Array.from(event.target.files ?? []).map((file) => file.name))}
      />
      <p id="images-status" className="text-sm">
        Elegir archivos · {chosen}
      </p>
      <p className="text-sm text-muted">JPEG, PNG o WebP. Hasta {maxImagesPerProduct} fotos, 2 MB cada una.</p>
    </div>
  );
}
