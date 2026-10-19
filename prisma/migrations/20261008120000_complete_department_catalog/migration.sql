INSERT INTO "Department" ("name")
VALUES
  ('Artigas'),
  ('Canelones'),
  ('Cerro Largo'),
  ('Colonia'),
  ('Durazno'),
  ('Flores'),
  ('Florida'),
  ('Lavalleja'),
  ('Maldonado'),
  ('Montevideo'),
  ('Paysandú'),
  ('Río Negro'),
  ('Rivera'),
  ('Rocha'),
  ('Salto'),
  ('San José'),
  ('Soriano'),
  ('Tacuarembó'),
  ('Treinta y Tres')
ON CONFLICT ("name") DO NOTHING;
