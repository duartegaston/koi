import { AdminPage } from "@/components/admin/admin-page";
import { CategoryCreateForm, CategoryDeleteForm, CategoryEditForm } from "@/components/forms/category-forms";
import { listAdminCategoryRecords } from "@/data-access/admin-category.repository";

export default async function CategoriesPage() {
  const categories = await listAdminCategoryRecords();

  return (
    <AdminPage title="Categorías">
      <CategoryCreateForm key={categories.length} />
      {categories.length === 0 ? null : (
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {categories.map((category) => (
            <li key={category.id} className="grid gap-8 py-8 lg:grid-cols-[1fr_16rem] lg:items-start">
              <CategoryEditForm category={category} />
              <CategoryDeleteForm
                category={category}
                others={categories
                  .filter((item) => item.id !== category.id)
                  .map((item) => ({ id: item.id, name: item.name, isActive: item.isActive }))}
              />
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}
