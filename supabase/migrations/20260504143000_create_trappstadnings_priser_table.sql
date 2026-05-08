create table if not exists public."trappstädnings_priser" (
  price_id bigint generated always as identity primary key,
  sqm_from integer not null check (sqm_from > 0),
  sqm_to integer not null check (sqm_to >= sqm_from),
  antal_trapphus_from integer not null check (antal_trapphus_from > 0),
  antal_trapphus_to integer not null check (antal_trapphus_to >= antal_trapphus_from),
  "antal_våningar_from" integer not null check ("antal_våningar_from" > 0),
  "antal_våningar_to" integer not null check ("antal_våningar_to" >= "antal_våningar_from"),
  "antal_hissar_from" integer not null check ("antal_hissar_from" >= 0),
  "antal_hissar_to" integer not null check ("antal_hissar_to" >= "antal_hissar_from"),
  "städfrekvens" text not null
);

alter table public."trappstädnings_priser" enable row level security;
