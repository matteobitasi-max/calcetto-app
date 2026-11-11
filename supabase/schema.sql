-- Archivio di The Cap su Supabase (vedi lib/db/supabase.ts).
-- I documenti sono uguali a quelli di Sanity: una riga per documento, in JSON.

create table if not exists documenti (
  id text primary key,
  tipo text not null,
  doc jsonb not null,
  creato timestamptz not null default now(),
  aggiornato timestamptz not null default now()
);
create index if not exists documenti_tipo on documenti (tipo);

-- Numero di versione dei dati: cresce a ogni scrittura, così il server sa quando rileggere tutto.
create table if not exists versione (
  id int primary key default 1 check (id = 1),
  n bigint not null default 0
);
insert into versione (id, n) values (1, 0) on conflict (id) do nothing;

create or replace function tocca_versione() returns trigger language plpgsql as $$
begin
  update versione set n = n + 1 where id = 1;
  return null;
end $$;

drop trigger if exists documenti_versione on documenti;
create trigger documenti_versione after insert or update or delete or truncate on documenti
  for each statement execute function tocca_versione();

-- Nessun accesso dalle API pubbliche di Supabase: i dati li legge e scrive solo il server dell'app.
alter table documenti enable row level security;
alter table versione enable row level security;
revoke all on documenti, versione from anon, authenticated;
