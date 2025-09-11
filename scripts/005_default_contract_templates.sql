-- Insert default contract templates for the farming platform

INSERT INTO contract_templates (name, description, template_fields, created_at, updated_at) VALUES 
(
  'Basic Crop Purchase Agreement',
  'Standard contract for purchasing crops with delivery terms',
  '{
    "crop_type": {
      "type": "select",
      "label": "Crop Type",
      "required": true,
      "options": ["Rice", "Wheat", "Corn", "Soybeans", "Cotton", "Tomatoes", "Potatoes", "Onions"]
    },
    "quantity": {
      "type": "number",
      "label": "Quantity (kg)",
      "required": true,
      "min": 1
    },
    "price_per_kg": {
      "type": "number",
      "label": "Price per KG ($)",
      "required": true,
      "min": 0.01
    },
    "quality_grade": {
      "type": "select",
      "label": "Quality Grade",
      "required": true,
      "options": ["Premium", "Grade A", "Grade B", "Standard"]
    },
    "delivery_date": {
      "type": "date",
      "label": "Delivery Date",
      "required": true
    },
    "delivery_location": {
      "type": "text",
      "label": "Delivery Location",
      "required": true
    },
    "payment_terms": {
      "type": "select",
      "label": "Payment Terms",
      "required": true,
      "options": ["Payment on Delivery", "30 Days Net", "15 Days Net", "Advance Payment"]
    },
    "special_requirements": {
      "type": "textarea",
      "label": "Special Requirements",
      "required": false
    }
  }'::jsonb,
  NOW(),
  NOW()
),
(
  'Seasonal Supply Contract',
  'Long-term contract for seasonal crop supply with multiple deliveries',
  '{
    "crop_type": {
      "type": "select",
      "label": "Crop Type",
      "required": true,
      "options": ["Rice", "Wheat", "Corn", "Soybeans", "Cotton", "Vegetables", "Fruits"]
    },
    "total_quantity": {
      "type": "number",
      "label": "Total Quantity (kg)",
      "required": true,
      "min": 100
    },
    "price_per_kg": {
      "type": "number",
      "label": "Price per KG ($)",
      "required": true,
      "min": 0.01
    },
    "contract_duration": {
      "type": "select",
      "label": "Contract Duration",
      "required": true,
      "options": ["3 Months", "6 Months", "1 Year", "2 Years"]
    },
    "delivery_schedule": {
      "type": "select",
      "label": "Delivery Schedule",
      "required": true,
      "options": ["Weekly", "Bi-weekly", "Monthly", "Seasonal"]
    },
    "quality_standards": {
      "type": "textarea",
      "label": "Quality Standards",
      "required": true
    },
    "price_adjustment": {
      "type": "select",
      "label": "Price Adjustment Clause",
      "required": true,
      "options": ["Fixed Price", "Market Rate Adjustment", "Quarterly Review", "Annual Review"]
    },
    "minimum_order": {
      "type": "number",
      "label": "Minimum Order per Delivery (kg)",
      "required": true,
      "min": 10
    }
  }'::jsonb,
  NOW(),
  NOW()
),
(
  'Organic Produce Contract',
  'Specialized contract for organic certified produce with premium pricing',
  '{
    "crop_type": {
      "type": "select",
      "label": "Organic Crop Type",
      "required": true,
      "options": ["Organic Rice", "Organic Wheat", "Organic Vegetables", "Organic Fruits", "Organic Herbs"]
    },
    "quantity": {
      "type": "number",
      "label": "Quantity (kg)",
      "required": true,
      "min": 1
    },
    "organic_certification": {
      "type": "text",
      "label": "Organic Certification Number",
      "required": true
    },
    "premium_price": {
      "type": "number",
      "label": "Premium Price per KG ($)",
      "required": true,
      "min": 0.01
    },
    "harvest_date": {
      "type": "date",
      "label": "Expected Harvest Date",
      "required": true
    },
    "delivery_date": {
      "type": "date",
      "label": "Delivery Date",
      "required": true
    },
    "packaging_requirements": {
      "type": "select",
      "label": "Packaging Requirements",
      "required": true,
      "options": ["Biodegradable Bags", "Organic Cotton Bags", "Recyclable Containers", "Bulk Delivery"]
    },
    "storage_conditions": {
      "type": "textarea",
      "label": "Storage & Handling Requirements",
      "required": true
    },
    "traceability_requirements": {
      "type": "textarea",
      "label": "Traceability Documentation",
      "required": true
    }
  }'::jsonb,
  NOW(),
  NOW()
);
