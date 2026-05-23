-- Insert missing EPPs (historic import)
INSERT INTO epps (id, nombre, area, vida_util_dias, requiere_firma, estado) VALUES
('eccd1d30-f259-4698-9899-710eabb5f429', 'CAPOTIN PARA LLUVIA', 'General', 90, false, 'active'),
('dc8aeba5-db14-4b29-b5f7-efc429ace7d9', 'CARETA DE ESMERILAR', 'General', 90, false, 'active'),
('905d00ed-c867-4cdb-99b3-bc7afa6498d5', 'CARETA DE SOLDAR', 'General', 90, false, 'active'),
('cabbb637-f826-4edd-a5a5-0451d447f2cc', 'CARTUCHO 60923 3M', 'General', 90, false, 'active'),
('5db1216e-9b10-4474-ad62-559fa402b37d', 'CASACA DE CUERO', 'General', 90, false, 'active'),
('5fda5f1b-d73d-4157-98bb-30c20281b9e7', 'CHOMPA', 'General', 90, false, 'active'),
('d90c02b4-d5d1-4134-b5c1-6c5b83dd46cf', 'FILTRO 2097 3M', 'General', 90, false, 'active'),
('53a1160f-4f98-437d-be46-e67acd594d36', 'GUANTES ANTICORTE TEJIDO EN GALGA 7 REMALLE EN EL BORDE 10.5"', 'General', 90, false, 'active'),
('825eb30f-7076-424b-97ac-ad1338e5ff23', 'GUANTES DE NITRILO SHOWA ATLAS 772', 'General', 90, false, 'active'),
('30aae429-d957-47c0-9913-819435e3ae5d', 'GUANTES HYCRON', 'General', 90, false, 'active'),
('ccc0a268-cc20-4256-8c5f-4321dd311e5d', 'LENTES ANTIPARRA 650AF', 'General', 90, false, 'active'),
('d81e1140-579c-4e75-8e86-58248f5106af', 'MANDIL DE CUERO PARA SOLDAR', 'General', 90, false, 'active'),
('dc3ec3fb-3f7a-4223-a5b4-fb20ba3930f7', 'OVEROL DE CUERO', 'General', 90, false, 'active'),
('351026ff-095d-4371-a98c-10b52eca2c97', 'RODILLERA PARA SOLDAR', 'General', 90, false, 'active'),
('2dd27069-fb0f-49d6-908d-d1e1361264bb', 'TOCA DESCARTABLE', 'General', 90, false, 'active')
ON CONFLICT DO NOTHING;