-- Add position column to todos table
ALTER TABLE public.todos 
ADD COLUMN position DOUBLE PRECISION DEFAULT EXTRACT(EPOCH FROM NOW());

-- Update existing todos to have distinct positions based on created_at
WITH ranked_todos AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM public.todos
)
UPDATE public.todos
SET position = ranked_todos.rn * 1000
FROM ranked_todos
WHERE public.todos.id = ranked_todos.id;

-- Create index on position for faster sorting
CREATE INDEX idx_todos_position ON public.todos(position);
