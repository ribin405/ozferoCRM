import { requireAdmin } from "@/lib/auth";
import { loadFormOptions } from "@/lib/queries";
import { addCategory, addSubcategory, move, rename, setActive } from "./actions";

type Item = { id: string; name: string; is_active: boolean };

function ItemRow({ table, item, indent }: { table: "categories" | "subcategories"; item: Item; indent?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 py-1.5 ${indent ? "pl-6" : ""}`}>
      <form action={rename.bind(null, table, item.id)} className="flex flex-1 items-center gap-2">
        <input
          name="name"
          defaultValue={item.name}
          aria-label="Name"
          className={`input max-w-xs ${item.is_active ? "" : "text-slate-400 line-through"}`}
        />
        <button className="btn-secondary px-2 py-1 text-xs">Rename</button>
      </form>
      <form action={move.bind(null, table, item.id, -1)}>
        <button className="btn-secondary px-2 py-1 text-xs" aria-label="Move up">↑</button>
      </form>
      <form action={move.bind(null, table, item.id, 1)}>
        <button className="btn-secondary px-2 py-1 text-xs" aria-label="Move down">↓</button>
      </form>
      <form action={setActive.bind(null, table, item.id, !item.is_active)}>
        <button className="btn-secondary px-2 py-1 text-xs">{item.is_active ? "Deactivate" : "Reactivate"}</button>
      </form>
    </div>
  );
}

export default async function Categories() {
  const { supabase } = await requireAdmin();
  const { categories } = await loadFormOptions(supabase);
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Categories</h1>
      <p className="text-sm text-slate-500">
        Categories in use are deactivated rather than deleted, so historical enquiries stay valid.
      </p>
      <form action={addCategory} className="card flex gap-2">
        <input name="name" placeholder="New category name" className="input" required />
        <button className="btn">Add category</button>
      </form>
      {categories.map((c) => (
        <section key={c.id} className="card">
          <ItemRow table="categories" item={c} />
          <div className="mt-1 border-t pt-2">
            {c.subcategories.map((s) => (
              <ItemRow key={s.id} table="subcategories" item={s} indent />
            ))}
            <form action={addSubcategory.bind(null, c.id)} className="mt-2 flex gap-2 pl-6">
              <input name="name" placeholder="New subcategory" className="input max-w-xs" required aria-label="New subcategory" />
              <button className="btn-secondary">Add</button>
            </form>
          </div>
        </section>
      ))}
    </div>
  );
}
