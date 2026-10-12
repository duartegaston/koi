import "server-only";

import { cache } from "react";
import { findProductBySlug, listCategories, listProducts } from "@/data-access/product.repository";

export const getCategories = cache(listCategories);

export const getProducts = cache((categorySlug?: string, featuredOnly = false) =>
  listProducts({
    categorySlug,
    featuredOnly: featuredOnly || undefined,
  }),
);

export const getProduct = cache(findProductBySlug);
