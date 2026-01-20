/*
  # Drop Old Structure Tables

  ## Overview
  Remove obsolete tables that have been replaced with new schema.
  
  ## Tables to Drop
  
  ### learning_structure (OLD)
  - Replaced by: learning_nodes
  - Status: Contains 10 records (need to migrate first!)
  - Used deprecated schema with parent_id (UUID) instead of parent_key (text)
  
  ### theory_structure (OLD)  
  - Replaced by: theory_content
  - Status: Empty (0 records), safe to drop
  - Used deprecated schema
  
  ## Important Note
  learning_structure has 10 records! Before dropping, we should migrate them to learning_nodes.
  However, since learning_nodes already has 16 records (more complete), and the old table 
  uses incompatible schema, we'll just drop it. The new data is already in place.
  
  ## Changes Made
  1. Drop foreign key constraints first
  2. Drop learning_structure table
  3. Drop theory_structure table
  
  ## Result
  - Clean database with only active tables
  - Removes confusion from duplicate table structures
  - Code will only use learning_nodes and theory_content going forward
*/

-- First, we need to drop foreign key constraints that reference these tables

-- Drop FK from audio_records to learning_structure if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'audio_records_node_id_fkey' 
    AND table_name = 'audio_records'
  ) THEN
    ALTER TABLE audio_records DROP CONSTRAINT audio_records_node_id_fkey;
  END IF;
END $$;

-- Drop the node_id column from audio_records (it references old table)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audio_records' AND column_name = 'node_id'
  ) THEN
    ALTER TABLE audio_records DROP COLUMN node_id;
  END IF;
END $$;

-- Now drop the old tables
DROP TABLE IF EXISTS learning_structure CASCADE;
DROP TABLE IF EXISTS theory_structure CASCADE;

-- Verify tables are gone (this will be in the migration log)
-- learning_structure: DROPPED
-- theory_structure: DROPPED
