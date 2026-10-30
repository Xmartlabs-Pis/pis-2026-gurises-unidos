import { revalidatePath } from 'next/cache';

export function revalidateProject() {
  revalidatePath('/dashboard/projects', 'layout');
}
