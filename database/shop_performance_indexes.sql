-- Performance optimization queries for Vendure database
-- Run these to add indexes that will speed up product searches

-- Index for product search performance
CREATE INDEX IF NOT EXISTS idx_search_result_product_name ON search_result(product_name);
CREATE INDEX IF NOT EXISTS idx_search_result_slug ON search_result(slug);
CREATE INDEX IF NOT EXISTS idx_search_result_price ON search_result(price_with_tax);

-- Index for stock status filtering (important for in-stock toggle)
CREATE INDEX IF NOT EXISTS idx_search_result_in_stock ON search_result(in_stock);

-- Index for facet filtering performance  
CREATE INDEX IF NOT EXISTS idx_product_facet_values ON product_facet_values(product_id, facet_value_id);
CREATE INDEX IF NOT EXISTS idx_facet_value_facet ON facet_value(facet_id, code);

-- Index for collection filtering
CREATE INDEX IF NOT EXISTS idx_product_collections ON product_collections(product_id, collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_slug ON collection(slug);

-- Composite indexes for common search patterns
CREATE INDEX IF NOT EXISTS idx_search_composite ON search_result(product_name, slug, price_with_tax);
CREATE INDEX IF NOT EXISTS idx_product_variant_composite ON product_variant(product_id, enabled, deleted_at);

-- Composite index for stock-based sorting and filtering
CREATE INDEX IF NOT EXISTS idx_search_stock_name ON search_result(in_stock DESC, product_name ASC);
