import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const sql = neon(databaseUrl);

await sql`
  INSERT INTO service_categories (id, name, description, display_order, active)
  VALUES
    ('cabelos-cortes', 'Cabelos & cortes', 'Cortes e finalizações pensados para a sua rotina.', 1, true),
    ('coloracao-mechas', 'Coloração & mechas', 'Cor, dimensão e luminosidade com técnica.', 2, true),
    ('tratamentos', 'Tratamentos', 'Protocolos de cuidado para devolver força e brilho.', 3, true),
    ('producoes', 'Produções', 'Penteados para eventos e momentos especiais.', 4, true),
    ('primeira-conversa', 'Primeira conversa', 'Avaliação antes de definir o melhor cuidado.', 5, true)
  ON CONFLICT (id) DO NOTHING
`;

await sql`
  INSERT INTO services (id, category_id, name, description, duration_minutes, price_type, price_cents, active)
  VALUES
    ('corte-finalizacao', 'cabelos-cortes', 'Corte + finalização', 'Um corte pensado para o seu rosto e para a sua rotina.', 90, 'fixed', 15000, true),
    ('morena-iluminada', 'coloracao-mechas', 'Morena iluminada', 'Dimensão, brilho e uma cor que parece sua.', 180, 'starting_at', 42000, true),
    ('hidratacao-profunda', 'tratamentos', 'Hidratação profunda', 'Cuidado intenso para devolver maciez e luminosidade.', 90, 'fixed', 16000, true),
    ('penteado-social', 'producoes', 'Penteado social', 'Uma finalização especial para celebrar o seu momento.', 120, 'starting_at', 18000, true),
    ('avaliacao', 'primeira-conversa', 'Avaliação personalizada', 'Vamos entender seu cabelo e indicar o melhor cuidado.', 30, 'consultation', NULL, true)
  ON CONFLICT (id) DO NOTHING
`;

await sql`
  INSERT INTO professionals (id, name, title, active, display_order)
  VALUES ('jaqueline-justino', 'Jaqueline Justino', 'Fundadora & hairstylist', true, 1)
  ON CONFLICT (id) DO NOTHING
`;

await sql`
  INSERT INTO business_hours (id, professional_id, weekday, start_time, end_time, break_start, break_end, active)
  VALUES
    ('jaqueline-hours-1', 'jaqueline-justino', 1, '09:00', '19:00', '12:00', '13:00', true),
    ('jaqueline-hours-2', 'jaqueline-justino', 2, '09:00', '19:00', '12:00', '13:00', true),
    ('jaqueline-hours-3', 'jaqueline-justino', 3, '09:00', '19:00', '12:00', '13:00', true),
    ('jaqueline-hours-4', 'jaqueline-justino', 4, '09:00', '19:00', '12:00', '13:00', true),
    ('jaqueline-hours-5', 'jaqueline-justino', 5, '09:00', '19:00', '12:00', '13:00', true),
    ('jaqueline-hours-6', 'jaqueline-justino', 6, '09:00', '19:00', '12:00', '13:00', true)
  ON CONFLICT (professional_id, weekday) DO NOTHING
`;

await sql`
  INSERT INTO professional_services (id, professional_id, service_id)
  SELECT 'jaqueline-service-' || id, 'jaqueline-justino', id FROM services WHERE active = true
  ON CONFLICT (professional_id, service_id) DO NOTHING
`;

console.log("Neon seed applied: services and the default Jaqueline schedule.");
