# Custom Fields Implementation Guide

This document outlines the steps taken to implement custom fields for product variants in the Vendure storefront.

## Date

**Date:** 2024-07-29

## Summary

The goal was to add `preOrderPrice`, `salePrice`, and `shipDate` as custom fields to the `ProductVariant` type and display them in the storefront. This involved modifying the backend schema, regenerating frontend types, and updating the product detail page to display the new fields as badges.

## Implementation Steps

### 1. Backend Schema Modification

- **File:** `backend/src/plugins/custom-fields.ts`
- **Action:** Added `preOrderPrice`, `salePrice`, and `shipDate` to the `ProductVariantCustomFields` definition.

### 2. Frontend Schema Update

- **File:** `frontend/src/generated/schema-shop.graphql`
- **Action:** Manually updated the schema to reflect the backend changes, adding the new custom fields to `ProductVariantCustomFields` and updating `ProductVariant` to use this type.

### 3. GraphQL Code Generation

- **Command:** `pnpm run generate-shop`
- **Action:** Regenerated the frontend GraphQL types. This initially failed due to missing subfield selections for `customFields` in `frontend/src/providers/shop/orders/order.ts`.

### 4. Fixing Subfield Selections

- **File:** `frontend/src/providers/shop/orders/order.ts`
- **Action:** Updated the `CustomOrderDetailFragment` to include `preOrderPrice`, `salePrice`, and `shipDate` in the `customFields` selection.

### 5. Successful GraphQL Code Generation

- **Command:** `pnpm run generate-shop`
- **Action:** Ran the code generation again, which completed successfully after fixing the subfield selections.

### 6. UI Implementation

- **File:** `frontend/src/routes/products/[...slug]/index.tsx`
- **Action:**
    - Implemented logic to display "SALE" and "PRE-ORDER" badges based on the values of the new custom fields.
    - Added CSS styles for the new badges.
    - Repositioned the price to the right of the variant title.
    - Removed the "In Stock" text.

### 7. Verification

- **Action:**
    - Verified the generated types in `frontend/src/generated/graphql-shop.ts` to ensure they were correct.
    - Started the development server with `pnpm run dev` to test the changes.
    - Opened a preview to visually confirm the UI changes.