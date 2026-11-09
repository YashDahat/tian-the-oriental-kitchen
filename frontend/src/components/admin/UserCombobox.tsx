import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/userService';

/**
 * User picker used by the foundation loyalty Codes page (it imports this module, which was missing from the
 * foundation checkout — see the build summary). A plain, searchable-by-typing native select over all users;
 * "Public offer" = null.
 */
export function UserCombobox({ id, value, onChange }: {
  id?: string; value: number | null; onChange: (userId: number | null) => void;
}) {
  const { data: users, isLoading } = useQuery({ queryKey: ['admin', 'users', 'combobox'], queryFn: userService.list });
  return (
    <select
      id={id}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      value={value == null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      disabled={isLoading}
    >
      <option value="">Public offer (no user)</option>
      {(users ?? []).map((u) => (
        <option key={u.id} value={u.id}>{`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email} · {u.email}</option>
      ))}
    </select>
  );
}

export default UserCombobox;
