-- Drop if exists
DROP MATERIALIZED VIEW IF EXISTS property_details_mv CASCADE;

-- Create the view
CREATE MATERIALIZED VIEW property_details_mv AS
SELECT 
    p.*, 
    COALESCE(a.views_count, 0) AS views_count, 
    COALESCE(a.phone_clicks, 0) AS phone_clicks, 
    COALESCE(a.whatsapp_clicks, 0) AS whatsapp_clicks,
    COALESCE(a.sale_contracts_count, 0) AS sale_contracts_count,
    COALESCE(a.rent_contracts_count, 0) AS rent_contracts_count
FROM properties p
LEFT JOIN analytics a ON a.property_id = p.id;

-- Create unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX property_details_mv_id_idx ON property_details_mv(id);

-- Optional: Indices for faster lookup
CREATE INDEX property_details_mv_code_idx ON property_details_mv(code);
CREATE INDEX property_details_mv_status_idx ON property_details_mv(status);
CREATE INDEX property_details_mv_created_at_idx ON property_details_mv(created_at DESC);

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_property_details_mv()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW property_details_mv;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on properties and analytics tables
DROP TRIGGER IF EXISTS refresh_property_details_mv_properties_tg ON properties;
CREATE TRIGGER refresh_property_details_mv_properties_tg
AFTER INSERT OR UPDATE OR DELETE ON properties
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_property_details_mv();

DROP TRIGGER IF EXISTS refresh_property_details_mv_analytics_tg ON analytics;
CREATE TRIGGER refresh_property_details_mv_analytics_tg
AFTER INSERT OR UPDATE OR DELETE ON analytics
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_property_details_mv();
