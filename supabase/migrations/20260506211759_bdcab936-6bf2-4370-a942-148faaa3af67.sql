ALTER TABLE kardex_headers DISABLE TRIGGER USER;
ALTER TABLE kardex_entries DISABLE TRIGGER USER;
UPDATE kardex_headers h SET worker_id = p.id FROM profiles p WHERE p.user_id = h.worker_id AND NOT EXISTS (SELECT 1 FROM profiles p2 WHERE p2.id = h.worker_id);
UPDATE kardex_entries e SET worker_id = p.id FROM profiles p WHERE p.user_id = e.worker_id AND NOT EXISTS (SELECT 1 FROM profiles p2 WHERE p2.id = e.worker_id);
ALTER TABLE kardex_headers ENABLE TRIGGER USER;
ALTER TABLE kardex_entries ENABLE TRIGGER USER;